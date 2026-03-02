/**
 * 計算結果に対するエッジケース警告の生成
 *
 * 計算パイプラインの出力値から、適用限界・注意すべき条件を検出して
 * 構造化された警告を返す純粋関数。
 *
 * 警告は計算を中断せず、ユーザーへの注意喚起のみを目的とする。
 */

import type { CalcWarning, FlowRegime, FittingResult } from '../types';

export interface WarningCheckParams {
  readonly reynolds: number;
  readonly flowRegime: FlowRegime;
  readonly velocity_m_s: number;
  readonly roughness_mm: number;
  readonly id_mm: number;
  readonly fittingDetails: readonly FittingResult[];
  readonly elevation_m: number;
  readonly frictionFactor: number;
  readonly length_m: number;
}

/**
 * セグメント計算結果に対して該当する警告を生成する
 */
export function generateSegmentWarnings(params: WarningCheckParams): CalcWarning[] {
  const warnings: CalcWarning[] = [];

  // 1. 極低Re（計算精度が著しく低下）
  if (params.reynolds > 0 && params.reynolds < 100) {
    warnings.push({
      severity: 'caution',
      category: 'friction',
      messageKey: 'warn.very_low_reynolds',
      messageParams: { re: Math.round(params.reynolds) },
    });
  }

  // 2. 遷移域（Re 2100–4000）
  if (params.flowRegime === 'transitional') {
    warnings.push({
      severity: 'warning',
      category: 'friction',
      messageKey: 'warn.transitional_flow',
      messageParams: { re: Math.round(params.reynolds) },
    });
  }

  // 3. 高流速（エロージョン・騒音リスク）
  if (params.velocity_m_s > 3) {
    warnings.push({
      severity: 'warning',
      category: 'velocity',
      messageKey: 'warn.high_velocity',
      messageParams: { v: round(params.velocity_m_s, 2) },
    });
  }

  // 4. 低流速（沈降・スケール付着リスク）
  if (params.velocity_m_s > 0 && params.velocity_m_s < 0.5) {
    warnings.push({
      severity: 'info',
      category: 'velocity',
      messageKey: 'warn.low_velocity',
      messageParams: { v: round(params.velocity_m_s, 3) },
    });
  }

  // 5. 相対粗度が大きい（小口径管での粗度影響）
  const relativeRoughness = params.roughness_mm / params.id_mm;
  if (relativeRoughness > 0.001) {
    warnings.push({
      severity: 'info',
      category: 'friction',
      messageKey: 'warn.high_relative_roughness',
      messageParams: {
        eps_d: round(relativeRoughness, 5),
        roughness: params.roughness_mm,
        id: round(params.id_mm, 1),
      },
    });
  }

  // 6. Darby 3-K法の適用口径範囲外（0.5"–24"）
  const id_inch = params.id_mm / 25.4;
  const has3kFittings = params.fittingDetails.some(f => f.method === '3k');
  if (has3kFittings && (id_inch < 0.5 || id_inch > 24)) {
    warnings.push({
      severity: 'warning',
      category: 'fittings',
      messageKey: 'warn.3k_diameter_range',
      messageParams: { d_inch: round(id_inch, 2) },
    });
  }

  // 7. 継手損失が直管損失を上回る（継手支配の系統）
  if (params.length_m > 0 && params.fittingDetails.length > 0) {
    const sumK = params.fittingDetails.reduce((s, f) => s + f.k_value * f.quantity, 0);
    const fLD = params.frictionFactor * (params.length_m / (params.id_mm / 1000));
    if (sumK > fLD && fLD > 0) {
      warnings.push({
        severity: 'info',
        category: 'fittings',
        messageKey: 'warn.fittings_dominant',
        messageParams: {
          sum_k: round(sumK, 1),
          f_ld: round(fLD, 1),
        },
      });
    }
  }

  // 8. 高揚程（中間高所でのフラッシングリスク）
  if (Math.abs(params.elevation_m) > 30) {
    warnings.push({
      severity: 'info',
      category: 'elevation',
      messageKey: 'warn.large_elevation',
      messageParams: { dz: round(params.elevation_m, 1) },
    });
  }

  return warnings;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
