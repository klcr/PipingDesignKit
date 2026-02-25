/**
 * 共通型定義 — 全ドメインモジュールで共有する基本型
 *
 * 内部計算はすべてSI単位系:
 *   長さ: m, 圧力: Pa, 密度: kg/m³, 粘度: Pa·s, 流速: m/s, 流量: m³/s, 温度: °C
 */

/** 重力加速度定数 */
export const GRAVITY = 9.80665; // m/s²

// ── 単位型 ──

export type PressureUnit = 'Pa' | 'kPa' | 'MPa' | 'bar' | 'psi' | 'kgf/cm2' | 'mmH2O';
export type FlowRateUnit = 'm3/h' | 'L/min' | 'USgpm';
export type LengthUnit = 'mm' | 'm' | 'in' | 'ft';
export type TemperatureUnit = 'C' | 'K' | 'F';

// ── 出典追跡（コンセプト「根拠が見える」の核心）──

export interface Reference {
  readonly source: string;
  readonly page?: string;
  readonly equation?: string;
}

// ── 流動状態 ──

export type FlowRegime = 'laminar' | 'transitional' | 'turbulent';

// ── 流体物性 ──

export interface FluidProperties {
  readonly density: number;       // kg/m³
  readonly viscosity: number;     // Pa·s
  readonly temperature: number;   // °C
  readonly pressure: number;      // kPa
  readonly reference: Reference;
}

// ── 配管仕様 ──

export interface PipeSpec {
  readonly standard: string;
  readonly nps: string;
  readonly dn: number;
  readonly od_mm: number;
  readonly wall_mm: number;
  readonly id_mm: number;
  readonly schedule?: string;
}

// ── 管材質・粗度 ──

export interface PipeMaterial {
  readonly id: string;
  readonly name: string;
  readonly roughness_mm: number;
  readonly reference: Reference;
}

// ── 継手情報（計算済み） ──

export type KValueMethod = 'crane_ld' | '3k' | 'fixed_k' | 'cv';

export interface FittingResult {
  readonly id: string;
  readonly description: string;
  readonly quantity: number;
  readonly k_value: number;
  readonly method: KValueMethod;
  readonly dp_pa: number;
  readonly head_loss_m: number;
  readonly reference: Reference;
}

// ── 計算結果（区間別） ──

export interface SegmentInput {
  readonly pipe: PipeSpec;
  readonly material: PipeMaterial;
  readonly fluid: FluidProperties;
  readonly flowRate_m3s: number;
  readonly length_m: number;
  readonly elevation_m: number;
  readonly fittings: FittingInput[];
}

export interface FittingInput {
  readonly fittingId: string;
  readonly quantity: number;
  readonly cvOverride?: number;
}

export interface SegmentResult {
  readonly velocity_m_s: number;
  readonly reynolds: number;
  readonly flowRegime: FlowRegime;
  readonly frictionFactor: number;
  readonly frictionFactorMethod: string;

  readonly dp_friction: number;
  readonly dp_fittings: number;
  readonly dp_elevation: number;
  readonly dp_total: number;

  readonly head_friction_m: number;
  readonly head_fittings_m: number;
  readonly head_elevation_m: number;
  readonly head_total_m: number;

  readonly fittingDetails: FittingResult[];
  readonly references: Reference[];
}
