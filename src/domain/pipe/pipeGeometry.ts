/**
 * 配管ジオメトリ計算
 *
 * 流路面積、流速、レイノルズ数、流動状態判定
 */

import { FlowRegime } from '../types';

/**
 * 流路断面積 A = π(D/2)²
 * @param id_mm 内径 (mm)
 * @returns 面積 (m²)
 */
export function calcFlowArea(id_mm: number): number {
  const id_m = id_mm / 1000;
  return Math.PI * (id_m / 2) ** 2;
}

/**
 * 流速 V = Q / A
 * @param flowRate_m3s 体積流量 (m³/s)
 * @param area_m2 流路面積 (m²)
 * @returns 流速 (m/s)
 */
export function calcVelocity(flowRate_m3s: number, area_m2: number): number {
  if (area_m2 <= 0) throw new Error('Flow area must be positive');
  return flowRate_m3s / area_m2;
}

/**
 * レイノルズ数 Re = ρVD/μ
 * @param density 密度 (kg/m³)
 * @param velocity 流速 (m/s)
 * @param id_m 内径 (m)
 * @param viscosity 動粘度 (Pa·s)
 * @returns Re (無次元)
 */
export function calcReynolds(
  density: number,
  velocity: number,
  id_m: number,
  viscosity: number
): number {
  if (viscosity <= 0) throw new Error('Viscosity must be positive');
  return (density * velocity * id_m) / viscosity;
}

/**
 * 流動状態を判定する
 * - laminar: Re < 2100
 * - transitional: 2100 ≤ Re < 4000
 * - turbulent: Re ≥ 4000
 */
export function classifyFlow(re: number): FlowRegime {
  if (re < 2100) return 'laminar';
  if (re < 4000) return 'transitional';
  return 'turbulent';
}
