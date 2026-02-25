/**
 * 水の物性取得 — テーブル補間方式
 *
 * data/fluid-properties/water.json の飽和水テーブルを使用し、
 * 温度を指定して密度・粘度を線形補間で取得する。
 */

import { FluidProperties, Reference } from '../types';
import { linearInterpolate, TablePoint } from './interpolate';

/** water.json の saturation_table エントリ型 */
export interface WaterTableEntry {
  readonly temp_c: number;
  readonly pressure_kpa: number;
  readonly density_kg_m3: number;
  readonly viscosity_pa_s: number;
  readonly specific_heat_j_kgk: number;
}

/** water.json のルート型 */
export interface WaterData {
  readonly referenceId: string;
  readonly fluid: string;
  readonly saturation_table: readonly WaterTableEntry[];
}

const WATER_REFERENCE: Reference = {
  source: 'IAPWS-IF97',
  page: 'Saturated liquid table',
  equation: 'Linear interpolation of tabulated values',
};

/**
 * 温度(°C)から飽和水の物性を取得する。
 * テーブル範囲外はRangeErrorをスローする。
 */
export function getWaterProperties(
  temp_c: number,
  waterData: WaterData
): FluidProperties {
  const table = waterData.saturation_table;

  const densityTable: TablePoint[] = table.map(e => ({ x: e.temp_c, y: e.density_kg_m3 }));
  const viscosityTable: TablePoint[] = table.map(e => ({ x: e.temp_c, y: e.viscosity_pa_s }));
  const pressureTable: TablePoint[] = table.map(e => ({ x: e.temp_c, y: e.pressure_kpa }));

  return {
    density: linearInterpolate(temp_c, densityTable),
    viscosity: linearInterpolate(temp_c, viscosityTable),
    temperature: temp_c,
    pressure: linearInterpolate(temp_c, pressureTable),
    reference: WATER_REFERENCE,
  };
}
