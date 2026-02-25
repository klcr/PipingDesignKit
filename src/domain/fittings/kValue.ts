/**
 * 継手損失係数 K 値の計算
 *
 * - Crane L/D法: K = f_T × (L/D)
 * - Darby 3-K法: K = K₁/Re + K_i × (1 + K_d/D^0.3)
 * - Cv変換: K = 894 × d⁴ / Cv² (d in inches)
 * - 固定K: 入口・出口など（パイプサイズ非依存）
 */

import { GRAVITY, Reference } from '../types';

const CRANE_REF: Reference = {
  source: 'Crane TP-410',
  page: 'A-26 to A-29',
  equation: 'K = f_T × (L/D)',
};

const DARBY_3K_REF: Reference = {
  source: 'Darby, 2001',
  equation: 'K = K₁/Re + K_i×(1 + K_d/D^0.3)',
};

const CV_REF: Reference = {
  source: 'Crane TP-410',
  equation: 'K = 894 × d⁴ / Cv²',
};

/**
 * Crane L/D法でK値を計算
 * K = f_T × (L/D)
 *
 * @param ldRatio L/D比（継手固有の定数）
 * @param ft 完全乱流摩擦係数 f_T（パイプサイズ依存）
 */
export function calcKCrane(ldRatio: number, ft: number): number {
  return ft * ldRatio;
}

/**
 * Darby 3-K法でK値を計算
 * K = K₁/Re + K_i × (1 + K_d / D_inch^0.3)
 *
 * @param re レイノルズ数
 * @param id_inch 管内径 (inches)
 * @param k1 K₁ 係数
 * @param ki K_i 係数
 * @param kd K_d 係数
 */
export function calcK3K(
  re: number,
  id_inch: number,
  k1: number,
  ki: number,
  kd: number
): number {
  return k1 / re + ki * (1 + kd / Math.pow(id_inch, 0.3));
}

/**
 * Cv値からK値に変換
 * K = 894 × d⁴ / Cv²
 *
 * dはインチ単位。メートルから変換する場合: d_inch = id_mm / 25.4
 *
 * @param cv 流量係数 Cv (US GPM @ 1 psi, SG=1)
 * @param id_mm 管内径 (mm)
 */
export function calcKFromCv(cv: number, id_mm: number): number {
  if (cv <= 0) throw new Error('Cv must be positive');
  const id_inch = id_mm / 25.4;
  return 894 * Math.pow(id_inch, 4) / (cv * cv);
}

/**
 * K値から圧力損失を計算
 * ΔP = K × (ρV²/2) [Pa]
 * h  = K × (V²/(2g)) [m]
 */
export function calcFittingLoss(
  k: number,
  density: number,
  velocity: number
): { dp_pa: number; head_m: number } {
  const dynamicPressure = density * velocity * velocity / 2;
  return {
    dp_pa: k * dynamicPressure,
    head_m: k * velocity * velocity / (2 * GRAVITY),
  };
}

/**
 * 複数継手の合計損失を計算
 * ΣK × (ρV²/2)
 */
export function calcTotalFittingLoss(
  fittings: ReadonlyArray<{ k: number; quantity: number }>,
  density: number,
  velocity: number
): { totalK: number; dp_pa: number; head_m: number } {
  const totalK = fittings.reduce((sum, f) => sum + f.k * f.quantity, 0);
  const { dp_pa, head_m } = calcFittingLoss(totalK, density, velocity);
  return { totalK, dp_pa, head_m };
}

export { CRANE_REF, DARBY_3K_REF, CV_REF };
