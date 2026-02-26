/**
 * 水溶液物性計算の型定義
 *
 * 複数の計算方式（Laliberté, Melinder, 個別相関式, テーブル補間）を
 * 統一的に扱うための型を定義する。
 */

import { Reference } from '../types';

// ── 濃度単位 ──

export type ConcentrationUnit = 'wt%' | 'vol%' | 'mol/kg' | 'Brix';

// ── 計算方式 ──

export type SolutionMethod =
  | 'laliberte'       // Laliberté universal electrolyte model
  | 'melinder'        // Melinder glycol polynomial
  | 'genotelle'       // Sucrose (ICUMSA density + Génotelle viscosity)
  | 'asada'           // Methanol-water (Asada 2012)
  | 'ethanol_rk'      // Ethanol-water (Redlich-Kister density + table viscosity)
  ;

// ── Laliberté モデル係数 ──

export interface LaliberteDensityCoeffs {
  readonly c0: number;
  readonly c1: number;
  readonly c2: number;
  readonly c3: number;
  readonly c4: number;
}

export interface LaliberteViscosityCoeffs {
  readonly v1: number;
  readonly v2: number;
  readonly v3: number;
  readonly v4: number;
  readonly v5: number;
  readonly v6: number;
}

export interface LaliberteSoluteData {
  readonly name: string;
  readonly name_ja: string;
  readonly cas: string;
  readonly formula: string;
  readonly molar_mass: number;
  readonly density: LaliberteDensityCoeffs;
  readonly viscosity: LaliberteViscosityCoeffs;
  readonly valid_range: {
    readonly w_max?: number;
    readonly t_min_c?: number;
    readonly t_max_c?: number;
    readonly w_max_visc?: number;
    readonly t_min_visc_c?: number;
    readonly t_max_visc_c?: number;
  };
}

export interface LaliberteData {
  readonly referenceId: string;
  readonly reference: Reference;
  readonly solutes: { readonly [formula: string]: LaliberteSoluteData };
}

// ── Melinder グリコール多項式係数 ──

export interface MelinderData {
  readonly referenceId: string;
  readonly reference: Reference;
  readonly fluid: string;
  readonly name: string;
  readonly name_ja: string;
  readonly x_ref: number;           // 基準質量分率
  readonly t_ref_k: number;         // 基準温度 [K]
  readonly n_terms: readonly number[];  // 各i群のj項数 e.g. [4,4,4,3,2,1]
  readonly density_coefficients: readonly number[];
  readonly viscosity_coefficients: readonly number[];  // ln(μ/[mPa·s]) の係数
  readonly concentration_range: {
    readonly min: number;   // 質量分率
    readonly max: number;
  };
  readonly temperature_range: {
    readonly min_k: number;
    readonly max_k: number;
  };
}

// ── スクロース水溶液係数 ──

export interface SucroseViscosityPoint {
  readonly temp_c: number;
  readonly brix: number;
  readonly viscosity_mpa_s: number;
}

export interface SucroseData {
  readonly referenceId: string;
  readonly reference: Reference;
  readonly density_20c_coefficients: readonly number[];  // ρ₂₀(B) 多項式係数
  readonly viscosity_table: readonly SucroseViscosityPoint[];
  readonly concentration_range: { readonly min: number; readonly max: number };
  readonly temperature_range: { readonly min_c: number; readonly max_c: number };
}

// ── メタノール–水 係数 (Asada 2012) ──

export interface PiecewisePolyCoeffs {
  readonly breakpoint_c: number;
  readonly low: readonly number[];   // T < breakpoint の係数 [a1..a5] (T⁴→定数)
  readonly high: readonly number[];  // T >= breakpoint の係数
}

export interface MethanolWaterData {
  readonly referenceId: string;
  readonly reference: Reference;
  readonly pure_methanol: {
    readonly density: PiecewisePolyCoeffs;
    readonly viscosity: PiecewisePolyCoeffs;
  };
  readonly concentration_range: { readonly min: number; readonly max: number };
  readonly temperature_range: { readonly min_c: number; readonly max_c: number };
}

// ── エタノール–水 ──

export interface RedlichKisterCoeffs {
  readonly a_i0: readonly number[];  // [A0_0, A1_0, A2_0] cm³/mol
  readonly a_i1: readonly number[];  // [A0_1, A1_1, A2_1] cm³/(mol·K)
}

export interface EthanolWaterViscosityPoint {
  readonly temp_c: number;
  readonly wt_percent: number;
  readonly viscosity_mpa_s: number;
}

export interface EthanolWaterData {
  readonly referenceId: string;
  readonly reference: Reference;
  readonly redlich_kister: RedlichKisterCoeffs;
  readonly viscosity_table: readonly EthanolWaterViscosityPoint[];
  readonly concentration_range: { readonly min: number; readonly max: number };
  readonly temperature_range: { readonly min_c: number; readonly max_c: number };
}

// ── 水溶液定義（レジストリ用） ──

export interface SolutionDefinition {
  readonly id: string;
  readonly name: string;
  readonly name_ja: string;
  readonly method: SolutionMethod;
  readonly concentrationUnit: ConcentrationUnit;
  readonly concentrationRange: { readonly min: number; readonly max: number };
  readonly temperatureRange: { readonly min: number; readonly max: number };
  readonly defaultConcentration: number;
  readonly reference: Reference;
  /** Lalibertéモデルの場合の溶質formula */
  readonly laliberteFormula?: string;
}
