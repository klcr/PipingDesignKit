/**
 * 系統圧損計算 — マルチセグメント直列接続
 *
 * 複数の SegmentInput を直列に接続し、
 * 系統全体の合計圧損・揚程を算出する。
 *
 * 前提: 直列接続では流量は全セグメント共通（質量保存）
 * 温度変化なし（断熱系）→ 流体物性は全セグメント共通
 */

import { SystemInput, SystemResult, SegmentResult, Reference, CalcWarning } from '../types';
import { calcSegmentPressureDrop } from './pressureDrop';
import { Darby3KData, EntranceExitData } from '../fittings/fittingLoss';
import { pressureToHead } from '../pipe/straightPipeLoss';

/**
 * 系統全体の圧損を計算する
 *
 * @param input - 系統入力（セグメント配列）
 * @param darby3kData - Darby 3-K 継手データ
 * @param entranceExitData - 入口/出口K値データ
 * @returns SystemResult
 */
export function calcSystemPressureDrop(
  input: SystemInput,
  darby3kData: Darby3KData,
  entranceExitData: EntranceExitData
): SystemResult {
  const { segments } = input;

  if (segments.length === 0) {
    return {
      segmentResults: [],
      dp_friction_total: 0,
      dp_fittings_total: 0,
      dp_elevation_total: 0,
      dp_total: 0,
      head_friction_total_m: 0,
      head_fittings_total_m: 0,
      head_elevation_total_m: 0,
      head_total_m: 0,
      references: [],
      warnings: [],
    };
  }

  // セグメント間の流体密度一致チェック（直列接続の前提条件）
  const baseDensity = segments[0].fluid.density;
  const DENSITY_TOLERANCE = 0.01; // 1%
  for (let i = 1; i < segments.length; i++) {
    const diff = Math.abs(segments[i].fluid.density - baseDensity) / baseDensity;
    if (diff > DENSITY_TOLERANCE) {
      throw new Error(
        `Segment ${i} fluid density (${segments[i].fluid.density} kg/m³) differs from ` +
        `segment 0 (${baseDensity} kg/m³) by ${(diff * 100).toFixed(1)}%. ` +
        `Series connection assumes uniform fluid properties.`
      );
    }
  }

  // 各セグメントを個別に計算
  const segmentResults: SegmentResult[] = segments.map(seg =>
    calcSegmentPressureDrop(seg, darby3kData, entranceExitData)
  );

  // 圧力損失の集計（直列: 単純加算）
  const dp_friction_total = segmentResults.reduce((sum, r) => sum + r.dp_friction, 0);
  const dp_fittings_total = segmentResults.reduce((sum, r) => sum + r.dp_fittings, 0);
  const dp_elevation_total = segmentResults.reduce((sum, r) => sum + r.dp_elevation, 0);
  const dp_total = dp_friction_total + dp_fittings_total + dp_elevation_total;

  // 水頭損失の集計
  const head_friction_total_m = segmentResults.reduce((sum, r) => sum + r.head_friction_m, 0);
  const head_fittings_total_m = segmentResults.reduce((sum, r) => sum + r.head_fittings_m, 0);
  const head_elevation_total_m = segmentResults.reduce((sum, r) => sum + r.head_elevation_m, 0);
  // 全体の水頭は合計圧損から変換（浮動小数点の整合性のため）
  const density = segments[0].fluid.density;
  const head_total_m = pressureToHead(dp_total, density);

  // 出典の集約（重複排除）
  const allRefs = segmentResults.flatMap(r => r.references);
  const seen = new Set<string>();
  const references: Reference[] = [];
  for (const ref of allRefs) {
    const key = `${ref.source}|${ref.page ?? ''}|${ref.equation ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push(ref);
    }
  }

  // 警告の集約（全セグメントの警告をフラット化、重複排除）
  const warningKeys = new Set<string>();
  const warnings: CalcWarning[] = [];
  for (const sr of segmentResults) {
    for (const w of sr.warnings) {
      const key = w.messageKey;
      if (!warningKeys.has(key)) {
        warningKeys.add(key);
        warnings.push(w);
      }
    }
  }

  return {
    segmentResults,
    dp_friction_total,
    dp_fittings_total,
    dp_elevation_total,
    dp_total,
    head_friction_total_m,
    head_fittings_total_m,
    head_elevation_total_m,
    head_total_m,
    references,
    warnings,
  };
}
