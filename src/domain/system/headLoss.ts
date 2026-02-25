/**
 * 水頭損失計算
 */

import { GRAVITY } from '../types';

/**
 * 圧力損失から水頭損失に変換
 * h = ΔP / (ρg)
 */
export function calcHeadLoss(dp_pa: number, density: number): number {
  return dp_pa / (density * GRAVITY);
}

/**
 * 高低差による圧力変化
 * ΔP = ρgΔz (正: 上向き = 圧力増加)
 */
export function calcElevationLoss(density: number, dz_m: number): number {
  return density * GRAVITY * dz_m;
}
