/**
 * 汎用流体物性取得 — テーブル補間方式
 *
 * 任意の流体データ (FluidTableData) に対して
 * 温度から密度・粘度を線形補間で取得する。
 * water.json / seawater.json / ethylene-glycol-*.json 等すべてに対応。
 */

import { FluidProperties, Reference } from '../types';
import { linearInterpolate, TablePoint } from './interpolate';

/** 流体テーブルエントリ型（全流体共通フォーマット） */
export interface FluidTableEntry {
  readonly temp_c: number;
  readonly pressure_kpa: number;
  readonly density_kg_m3: number;
  readonly viscosity_pa_s: number;
  readonly specific_heat_j_kgk: number;
}

/** 流体データのルート型 */
export interface FluidTableData {
  readonly referenceId: string;
  readonly fluid: string;
  readonly description: string;
  readonly saturation_table: readonly FluidTableEntry[];
}

/**
 * 温度(°C)から流体物性を取得する（汎用）。
 * テーブル範囲外はRangeErrorをスローする。
 */
export function getFluidProperties(
  temp_c: number,
  fluidData: FluidTableData,
  reference: Reference
): FluidProperties {
  const table = fluidData.saturation_table;

  const densityTable: TablePoint[] = table.map(e => ({ x: e.temp_c, y: e.density_kg_m3 }));
  const viscosityTable: TablePoint[] = table.map(e => ({ x: e.temp_c, y: e.viscosity_pa_s }));
  const pressureTable: TablePoint[] = table.map(e => ({ x: e.temp_c, y: e.pressure_kpa }));

  return {
    density: linearInterpolate(temp_c, densityTable),
    viscosity: linearInterpolate(temp_c, viscosityTable),
    temperature: temp_c,
    pressure: linearInterpolate(temp_c, pressureTable),
    reference,
  };
}
