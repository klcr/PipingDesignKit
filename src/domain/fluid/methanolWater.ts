/**
 * メタノール–水混合液の物性計算
 *
 * 純メタノール物性: Asada (2012) 区分4次多項式
 * 混合密度: 体積分率線形混合
 * 混合粘度: 対数混合則（簡易版）
 *
 * 出典: Asada, "Material Characterization of Alcohol-Water Mixtures",
 *        University of Hawaii thesis, 2012 (open access)
 *
 * 濃度範囲: 0–100 wt%
 * 温度範囲: 15–55°C (Asada実測範囲)
 */

import { kellWaterDensity } from './kellWaterDensity';
import { laliberteWaterViscosity } from './laliberte';
import type { PiecewisePolyCoeffs } from './solutionTypes';

/**
 * 区分多項式の評価
 *
 * breakpoint未満: low係数, 以上: high係数
 * y = a₁·t⁴ + a₂·t³ + a₃·t² + a₄·t + a₅
 */
function evalPiecewisePoly(t: number, coeffs: PiecewisePolyCoeffs): number {
  const c = t < coeffs.breakpoint_c ? coeffs.low : coeffs.high;
  return c[0] * t * t * t * t
       + c[1] * t * t * t
       + c[2] * t * t
       + c[3] * t
       + c[4];
}

/**
 * 純メタノールの密度 [kg/m³]
 */
export function pureMethanolDensity(t: number, coeffs: PiecewisePolyCoeffs): number {
  return evalPiecewisePoly(t, coeffs);
}

/**
 * 純メタノールの粘度 [Pa·s]
 */
export function pureMethanolViscosity(t: number, coeffs: PiecewisePolyCoeffs): number {
  return evalPiecewisePoly(t, coeffs);
}

/**
 * 質量分率 → 体積分率の換算
 *
 * Φ_m = (w_m/ρ_m) / (w_m/ρ_m + w_w/ρ_w)
 */
function massToVolumeFraction(
  wMethanol: number,
  rhoMethanol: number,
  rhoWater: number
): number {
  if (wMethanol <= 0) return 0;
  if (wMethanol >= 1) return 1;
  const vMethanol = wMethanol / rhoMethanol;
  const vWater = (1 - wMethanol) / rhoWater;
  return vMethanol / (vMethanol + vWater);
}

/**
 * メタノール–水混合液の密度
 *
 * 体積分率線形混合: ρ_mix = Φ_m·ρ_m(T) + Φ_w·ρ_w(T)
 * 精度: MAE ≈ 1%
 *
 * @param t - 温度 [°C]
 * @param wMethanol - メタノール質量分率 (0–1)
 * @param densityCoeffs - 純メタノール密度の区分多項式係数
 * @returns 密度 [kg/m³]
 */
export function methanolWaterDensity(
  t: number,
  wMethanol: number,
  densityCoeffs: PiecewisePolyCoeffs
): number {
  const rhoW = kellWaterDensity(t);
  const rhoM = pureMethanolDensity(t, densityCoeffs);
  const phi = massToVolumeFraction(wMethanol, rhoM, rhoW);
  return phi * rhoM + (1 - phi) * rhoW;
}

/**
 * メタノール–水混合液の粘度
 *
 * 対数混合則: ln(μ_mix) = Φ_w·ln(μ_w) + Φ_m·ln(μ_m)
 * 注: 極大（~40wt%付近）の再現はやや低精度
 *
 * @param t - 温度 [°C]
 * @param wMethanol - メタノール質量分率 (0–1)
 * @param densityCoeffs - 純メタノール密度係数（体積分率計算用）
 * @param viscosityCoeffs - 純メタノール粘度係数
 * @returns 粘度 [Pa·s]
 */
export function methanolWaterViscosity(
  t: number,
  wMethanol: number,
  densityCoeffs: PiecewisePolyCoeffs,
  viscosityCoeffs: PiecewisePolyCoeffs
): number {
  const rhoW = kellWaterDensity(t);
  const rhoM = pureMethanolDensity(t, densityCoeffs);
  const phi = massToVolumeFraction(wMethanol, rhoM, rhoW);

  const muW = laliberteWaterViscosity(t) * 1e-3; // mPa·s → Pa·s
  const muM = pureMethanolViscosity(t, viscosityCoeffs);

  // 対数混合則
  return Math.exp((1 - phi) * Math.log(muW) + phi * Math.log(muM));
}
