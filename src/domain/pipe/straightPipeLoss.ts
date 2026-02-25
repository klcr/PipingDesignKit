/**
 * 直管圧損計算 — Darcy-Weisbach式
 *
 * ΔP = f × (L/D) × (ρV²/2)  [Pa]
 * h_L = f × (L/D) × (V²/(2g)) [m]
 */

import { GRAVITY } from '../types';

/**
 * 直管部の圧力損失を計算する
 *
 * @param f Darcy摩擦係数
 * @param length_m 管長 (m)
 * @param id_mm 管内径 (mm)
 * @param density 流体密度 (kg/m³)
 * @param velocity 流速 (m/s)
 * @returns 圧力損失 (Pa)
 */
export function calcStraightPipeLoss(
  f: number,
  length_m: number,
  id_mm: number,
  density: number,
  velocity: number
): number {
  const id_m = id_mm / 1000;
  return f * (length_m / id_m) * (density * velocity * velocity / 2);
}

/**
 * 圧力損失から水頭損失に変換
 * h = ΔP / (ρg)
 */
export function pressureToHead(dp_pa: number, density: number): number {
  return dp_pa / (density * GRAVITY);
}

/**
 * 水頭損失から圧力損失に変換
 * ΔP = ρgh
 */
export function headToPressure(head_m: number, density: number): number {
  return density * GRAVITY * head_m;
}
