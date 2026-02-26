/**
 * ポンプ推奨特性算出 — 比速度・ポンプタイプ分類・BEP範囲・推定動力
 *
 * 外部ライブラリ依存なし（domain/ レイヤールール遵守）
 */

import { GRAVITY, Reference } from '../types';

// ── ポンプタイプ ──

export type PumpType = 'radial' | 'francis' | 'mixed_flow' | 'axial';

// ── 分類データ型（JSONからロード） ──

export interface PumpTypeClassification {
  readonly type: PumpType;
  readonly ns_min: number;
  readonly ns_max: number;
  readonly typicalEfficiency_pct: { readonly min: number; readonly max: number };
  readonly description: string;
  readonly description_ja: string;
}

// ── 比速度 ──

export interface SpecificSpeedResult {
  readonly ns: number;
  readonly pumpType: PumpType;
  readonly typicalEfficiency_pct: { readonly min: number; readonly max: number };
  readonly reference: Reference;
}

// ── BEP推奨 ──

export interface BEPRecommendation {
  readonly bepFlowRange: { readonly min_m3h: number; readonly max_m3h: number };
  readonly operatingRange: { readonly min_m3h: number; readonly max_m3h: number };
}

// ── ポンプ推奨特性 ──

export interface PumpSuggestionInput {
  readonly designFlow_m3h: number;
  readonly totalHead_m: number;
  readonly speed_rpm: number;
  readonly npsha_m?: number;
  readonly density_kg_m3?: number;
}

export interface PumpSuggestion {
  readonly specificSpeed: SpecificSpeedResult;
  readonly bep: BEPRecommendation;
  readonly maxNpshr_m: number | null;
  readonly estimatedPower_kW: number;
  readonly references: Reference[];
}

const REFERENCE_NS: Reference = {
  source: 'Pump Handbook, 4th Ed., Karassik et al.',
  page: 'Ch. 2',
  equation: 'Ns = N × √Q / H^(3/4)  (Q: m³/min, H: m)',
};

const REFERENCE_POWER: Reference = {
  source: 'Basic fluid mechanics',
  equation: 'P = ρgQH / (η × 1000)  [kW]',
};

/**
 * 比速度を計算する
 *
 * Ns = N × √Q / H^(3/4)
 *   N: 回転数 [min⁻¹]
 *   Q: 流量 [m³/min]
 *   H: 揚程 [m]
 */
export function calcSpecificSpeed(
  speed_rpm: number,
  flow_m3h: number,
  head_m: number,
  classifications: readonly PumpTypeClassification[]
): SpecificSpeedResult {
  if (flow_m3h <= 0 || head_m <= 0 || speed_rpm <= 0) {
    throw new Error('flow, head, and speed must be positive');
  }

  const flow_m3min = flow_m3h / 60;
  const ns = speed_rpm * Math.sqrt(flow_m3min) / Math.pow(head_m, 0.75);

  const classification = classifyPumpType(ns, classifications);

  return {
    ns,
    pumpType: classification.type,
    typicalEfficiency_pct: classification.typicalEfficiency_pct,
    reference: REFERENCE_NS,
  };
}

/**
 * 比速度に基づくポンプタイプ分類
 */
export function classifyPumpType(
  ns: number,
  classifications: readonly PumpTypeClassification[]
): PumpTypeClassification {
  for (const c of classifications) {
    if (ns >= c.ns_min && ns < c.ns_max) {
      return c;
    }
  }
  // フォールバック: 最後の分類を返す
  return classifications[classifications.length - 1];
}

/**
 * BEP推奨範囲を計算する
 *
 * - BEP流量範囲: 運転点がBEPの80~110%になるよう逆算
 *   → BEPフロー = Q_design × 0.9 ~ Q_design × 1.1
 * - 推奨運転範囲: BEP流量の70~120%
 *   → Q_design × 0.7 ~ Q_design × 1.2
 */
export function calcBEPRecommendation(designFlow_m3h: number): BEPRecommendation {
  if (designFlow_m3h <= 0) {
    return {
      bepFlowRange: { min_m3h: 0, max_m3h: 0 },
      operatingRange: { min_m3h: 0, max_m3h: 0 },
    };
  }

  return {
    bepFlowRange: {
      min_m3h: designFlow_m3h * 0.9,
      max_m3h: designFlow_m3h * 1.1,
    },
    operatingRange: {
      min_m3h: designFlow_m3h * 0.7,
      max_m3h: designFlow_m3h * 1.2,
    },
  };
}

/**
 * ポンプ推奨特性を総合的に算出する
 */
export function calcPumpSuggestion(
  input: PumpSuggestionInput,
  classifications: readonly PumpTypeClassification[]
): PumpSuggestion {
  const { designFlow_m3h, totalHead_m, speed_rpm, npsha_m, density_kg_m3 } = input;
  const density = density_kg_m3 ?? 998;

  const specificSpeed = calcSpecificSpeed(speed_rpm, designFlow_m3h, totalHead_m, classifications);
  const bep = calcBEPRecommendation(designFlow_m3h);

  // 最大許容NPSHr: NPSHa × 0.8（20%安全マージン）
  const maxNpshr_m = npsha_m != null ? npsha_m * 0.8 : null;

  // 推定動力: P = ρgQH / (η × 1000) [kW]
  // η = 典型効率の中央値を使用
  const effRange = specificSpeed.typicalEfficiency_pct;
  const eta = (effRange.min + effRange.max) / 2 / 100;
  const flow_m3s = designFlow_m3h / 3600;
  const estimatedPower_kW = (density * GRAVITY * flow_m3s * totalHead_m) / (eta * 1000);

  return {
    specificSpeed,
    bep,
    maxNpshr_m,
    estimatedPower_kW,
    references: [REFERENCE_NS, REFERENCE_POWER],
  };
}
