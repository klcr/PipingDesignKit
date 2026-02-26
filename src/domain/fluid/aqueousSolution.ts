/**
 * 水溶液物性の統一ディスパッチャー
 *
 * 溶液IDと(温度, 濃度)から適切な計算エンジンを呼び出し、
 * FluidProperties を返す。
 *
 * 対応モデル:
 *   - laliberte:  Laliberté universal electrolyte model (109溶質)
 *   - melinder:   Melinder glycol polynomial (EG-水, PG-水)
 *   - genotelle:  スクロース水溶液 (ICUMSA + Génotelle)
 *   - asada:      メタノール–水 (Asada 2012)
 *   - ethanol_rk: エタノール–水 (Redlich-Kister + table)
 */

import { FluidProperties, Reference } from '../types';
import {
  laliberteSingleSoluteDensity,
  laliberteSingleSoluteViscosity,
} from './laliberte';
import { melinderDensity, melinderViscosity } from './melinderGlycol';
import { getSucroseProperties } from './sucroseSolution';
import { methanolWaterDensity, methanolWaterViscosity } from './methanolWater';
import { ethanolWaterDensity, ethanolWaterViscosity } from './ethanolWater';
import type {
  SolutionMethod,
  ConcentrationUnit,
  LaliberteSoluteData,
  MelinderData,
  SucroseData,
  MethanolWaterData,
  EthanolWaterData,
} from './solutionTypes';

// ── 濃度変換ヘルパー ──

/**
 * 濃度をUI入力値(wt%, vol%, Brixなど)から質量分率(0–1)に変換
 *
 * vol% → wt% の近似変換にはグリコールの代表密度を使用
 */
function toMassFraction(
  concentration: number,
  unit: ConcentrationUnit,
  _method: SolutionMethod
): number {
  switch (unit) {
    case 'wt%':
      return concentration / 100;
    case 'vol%':
      // EG/PGの場合: vol% → wt% の近似変換
      // ρ_glycol ≈ 1113 kg/m³ (EG), ρ_water ≈ 998 kg/m³ (20°C)
      // wt% = vol% × ρ_glycol / (vol% × ρ_glycol + (100 - vol%) × ρ_water)
      // 簡易近似（±2%以内）
      {
        const rhoGlycol = 1113;  // EG代表値
        const rhoWater = 998;
        const volFrac = concentration / 100;
        return (volFrac * rhoGlycol) / (volFrac * rhoGlycol + (1 - volFrac) * rhoWater);
      }
    case 'mol/kg':
      // molality → wt% は溶質分子量が必要なため、ここでは近似不可
      // Lalibertéルートでは直接計算するため、ここは未使用想定
      throw new Error('mol/kg conversion requires molar mass; use Laliberté path directly');
    case 'Brix':
      return concentration / 100;  // Brix ≈ wt%
    default:
      throw new Error(`Unknown concentration unit: ${unit}`);
  }
}

// ── Laliberté ──

export interface LaliberteSolutionInput {
  method: 'laliberte';
  solute: LaliberteSoluteData;
  reference: Reference;
}

function calcLaliberte(
  t: number,
  concentration: number,
  unit: ConcentrationUnit,
  input: LaliberteSolutionInput
): FluidProperties {
  const w = toMassFraction(concentration, unit, 'laliberte');
  return {
    density: laliberteSingleSoluteDensity(t, w, input.solute.density),
    viscosity: laliberteSingleSoluteViscosity(t, w, input.solute.viscosity),
    temperature: t,
    pressure: 101.325,
    reference: input.reference,
  };
}

// ── Melinder ──

export interface MelinderSolutionInput {
  method: 'melinder';
  data: MelinderData;
}

function calcMelinder(
  t: number,
  concentration: number,
  unit: ConcentrationUnit,
  input: MelinderSolutionInput
): FluidProperties {
  const w = toMassFraction(concentration, unit, 'melinder');
  const { x_ref, t_ref_k, n_terms, density_coefficients, viscosity_coefficients, reference } = input.data;
  return {
    density: melinderDensity(w, t, x_ref, t_ref_k, n_terms, density_coefficients),
    viscosity: melinderViscosity(w, t, x_ref, t_ref_k, n_terms, viscosity_coefficients),
    temperature: t,
    pressure: 101.325,
    reference,
  };
}

// ── Sucrose ──

export interface SucroseSolutionInput {
  method: 'genotelle';
  data: SucroseData;
}

function calcSucrose(
  t: number,
  brix: number,
  input: SucroseSolutionInput
): FluidProperties {
  const props = getSucroseProperties(t, brix, input.data);
  return {
    density: props.density,
    viscosity: props.viscosity,
    temperature: t,
    pressure: 101.325,
    reference: input.data.reference,
  };
}

// ── Methanol-Water ──

export interface MethanolSolutionInput {
  method: 'asada';
  data: MethanolWaterData;
}

function calcMethanol(
  t: number,
  concentration: number,
  unit: ConcentrationUnit,
  input: MethanolSolutionInput
): FluidProperties {
  const w = toMassFraction(concentration, unit, 'asada');
  const { pure_methanol, reference } = input.data;
  return {
    density: methanolWaterDensity(t, w, pure_methanol.density),
    viscosity: methanolWaterViscosity(t, w, pure_methanol.density, pure_methanol.viscosity),
    temperature: t,
    pressure: 101.325,
    reference,
  };
}

// ── Ethanol-Water ──

export interface EthanolSolutionInput {
  method: 'ethanol_rk';
  data: EthanolWaterData;
}

function calcEthanol(
  t: number,
  concentration: number,
  unit: ConcentrationUnit,
  input: EthanolSolutionInput
): FluidProperties {
  const w = toMassFraction(concentration, unit, 'ethanol_rk');
  const { redlich_kister, viscosity_table, reference } = input.data;
  return {
    density: ethanolWaterDensity(t, w, redlich_kister),
    viscosity: ethanolWaterViscosity(t, w, viscosity_table),
    temperature: t,
    pressure: 101.325,
    reference,
  };
}

// ── 統一ディスパッチャー ──

export type SolutionInput =
  | LaliberteSolutionInput
  | MelinderSolutionInput
  | SucroseSolutionInput
  | MethanolSolutionInput
  | EthanolSolutionInput;

/**
 * 水溶液の物性を取得する統一関数
 *
 * @param t - 温度 [°C]
 * @param concentration - 濃度（単位は concentrationUnit に依存）
 * @param concentrationUnit - 濃度単位
 * @param input - モデル固有の入力データ
 * @returns FluidProperties
 */
export function getSolutionProperties(
  t: number,
  concentration: number,
  concentrationUnit: ConcentrationUnit,
  input: SolutionInput
): FluidProperties {
  switch (input.method) {
    case 'laliberte':
      return calcLaliberte(t, concentration, concentrationUnit, input);
    case 'melinder':
      return calcMelinder(t, concentration, concentrationUnit, input);
    case 'genotelle':
      return calcSucrose(t, concentration, input);
    case 'asada':
      return calcMethanol(t, concentration, concentrationUnit, input);
    case 'ethanol_rk':
      return calcEthanol(t, concentration, concentrationUnit, input);
    default: {
      const _exhaustive: never = input;
      throw new Error(`Unknown solution method: ${(_exhaustive as SolutionInput).method}`);
    }
  }
}
