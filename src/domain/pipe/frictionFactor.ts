/**
 * 摩擦係数の計算
 *
 * - Churchill (1977): 全流動領域対応、反復計算不要
 * - Swamee-Jain (1976): 乱流域の陽的近似（参考用）
 * - Von Kármán: 完全乱流域の f_T（継手K値計算用）
 */

import { Reference } from '../types';

const CHURCHILL_REF: Reference = {
  source: 'Churchill, S.W., 1977',
  equation: 'f = 8×[(8/Re)¹² + (A+B)^(-3/2)]^(1/12)',
};

const SWAMEE_JAIN_REF: Reference = {
  source: 'Swamee & Jain, 1976',
  equation: 'f = 0.25/[log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²',
};

const VON_KARMAN_REF: Reference = {
  source: 'Crane TP-410, Von Kármán equation',
  equation: 'f_T = 1/[2×log₁₀(3.7D/ε)]²',
};

export interface FrictionFactorResult {
  readonly f: number;
  readonly method: string;
  readonly reference: Reference;
}

/**
 * Churchill (1977) 式 — Darcy摩擦係数
 *
 * 層流・遷移・乱流すべてをカバーする単一の陽的式。
 * f = 8 × [(8/Re)¹² + (A + B)^(-3/2)]^(1/12)
 *
 * A = [2.457 × ln(1/((7/Re)^0.9 + 0.27(ε/D)))]¹⁶
 * B = (37530/Re)¹⁶
 *
 * @param re レイノルズ数 (> 0)
 * @param roughness_mm 管粗度 ε (mm)
 * @param id_mm 管内径 D (mm)
 * @returns Darcy摩擦係数 f
 */
export function churchillFrictionFactor(
  re: number,
  roughness_mm: number,
  id_mm: number
): FrictionFactorResult {
  if (re <= 0) throw new Error('Reynolds number must be positive');

  const relRoughness = roughness_mm / id_mm;

  const term1 = Math.pow(8 / re, 12);

  const innerA = Math.pow(7 / re, 0.9) + 0.27 * relRoughness;
  const A = Math.pow(2.457 * Math.log(1 / innerA), 16);

  const B = Math.pow(37530 / re, 16);

  const f = 8 * Math.pow(term1 + Math.pow(A + B, -1.5), 1 / 12);

  return { f, method: 'churchill', reference: CHURCHILL_REF };
}

/**
 * Swamee-Jain (1976) 陽的近似 — 乱流域のみ
 *
 * f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²
 *
 * 有効範囲: 5000 ≤ Re ≤ 10⁸, 10⁻⁶ ≤ ε/D ≤ 10⁻²
 * Colebrook-White式に対して±1%の精度
 */
export function swameeJainFrictionFactor(
  re: number,
  roughness_mm: number,
  id_mm: number
): FrictionFactorResult {
  const relRoughness = roughness_mm / id_mm;

  const logTerm = Math.log10(relRoughness / 3.7 + 5.74 / Math.pow(re, 0.9));
  const f = 0.25 / (logTerm * logTerm);

  return { f, method: 'swamee-jain', reference: SWAMEE_JAIN_REF };
}

/**
 * Von Kármán式で完全乱流摩擦係数 f_T を計算
 *
 * f_T = 1 / [2 × log₁₀(3.7D/ε)]²
 *
 * Crane TP-410 の継手K値計算に使用。
 * f_T は Re に依存しない（完全乱流域の漸近値）。
 */
export function calcFtFullyTurbulent(
  roughness_mm: number,
  id_mm: number
): FrictionFactorResult {
  if (roughness_mm <= 0) throw new Error('Roughness must be positive');
  if (id_mm <= 0) throw new Error('Diameter must be positive');

  const ratio = 3.7 * id_mm / roughness_mm;
  const logTerm = Math.log10(ratio);
  const f = 1 / (2 * logTerm) ** 2;

  return { f, method: 'von-karman', reference: VON_KARMAN_REF };
}
