/**
 * Laliberté universal electrolyte model — 密度・粘度
 *
 * 単一の数学的枠組みで109種の電解質水溶液の密度と粘度を計算する。
 * 溶質ごとに密度5係数(c0–c4)・粘度6係数(v1–v6)を持ち、
 * 質量分率と温度から物性を計算する。
 *
 * 出典:
 *   - 密度: Laliberté & Cooper (2004) J.Chem.Eng.Data 49:1141
 *   - 粘度: Laliberté (2007) J.Chem.Eng.Data 52:321
 *   - 係数更新: Laliberté (2009) J.Chem.Eng.Data 54:1725
 *
 * 精度:
 *   - 密度: 平均偏差 ~0.10 kg/m³ (標準偏差 1.44 kg/m³)
 *   - 粘度: 平均偏差 ~0.1% (標準偏差 3.7%)
 */

import { kellWaterDensity } from './kellWaterDensity';
import type { LaliberteDensityCoeffs, LaliberteViscosityCoeffs } from './solutionTypes';

/**
 * Laliberté水粘度 (Laliberté 2007 の純水基準式)
 *
 * @param t - 温度 [°C]
 * @returns 粘度 [mPa·s]
 */
export function laliberteWaterViscosity(t: number): number {
  return (t + 246) / (0.05594 * t * t + 5.2842 * t + 137.37);
}

/**
 * Lalibertéモデルによる溶質の見かけ密度
 *
 * ρ_app,i = (c0*(1-w_w) + c1) * exp(1e-6*(t+c4)²) / ((1-w_w) + c2 + c3*t)
 *
 * @param t - 温度 [°C]
 * @param ww - 水の質量分率
 * @param coeffs - 溶質密度係数 {c0, c1, c2, c3, c4}
 * @returns 見かけ密度 [kg/m³]
 */
function apparentDensity(
  t: number,
  ww: number,
  coeffs: LaliberteDensityCoeffs
): number {
  const { c0, c1, c2, c3, c4 } = coeffs;
  const ws = 1 - ww;  // solute mass fraction
  const numerator = (c0 * ws + c1) * Math.exp(1e-6 * (t + c4) * (t + c4));
  const denominator = ws + c2 + c3 * t;
  return numerator / denominator;
}

/**
 * Lalibertéモデルによる溶質の見かけ粘度
 *
 * ηᵢ = exp((v1*(1-w_w)^v2 + v3) / (v4*t + 1)) / (v5*(1-w_w)^v6 + 1)
 *
 * @param t - 温度 [°C]
 * @param ww - 水の質量分率
 * @param coeffs - 溶質粘度係数 {v1, v2, v3, v4, v5, v6}
 * @returns 見かけ粘度 [mPa·s]
 */
function apparentViscosity(
  t: number,
  ww: number,
  coeffs: LaliberteViscosityCoeffs
): number {
  const { v1, v2, v3, v4, v5, v6 } = coeffs;
  const ws = 1 - ww;
  const numerator = Math.exp((v1 * Math.pow(ws, v2) + v3) / (v4 * t + 1));
  const denominator = v5 * Math.pow(ws, v6) + 1;
  return numerator / denominator;
}

/**
 * Lalibertéモデルによる電解質水溶液の密度
 *
 * 混合則: ρ = 1 / (w_w/ρ_w + Σ wᵢ/ρ_app,i)
 *
 * @param t - 温度 [°C]
 * @param soluteWeightFractions - 各溶質の質量分率の配列
 * @param densityCoeffs - 各溶質の密度係数の配列（順序は soluteWeightFractions に対応）
 * @returns 密度 [kg/m³]
 */
export function laliberteDensity(
  t: number,
  soluteWeightFractions: readonly number[],
  densityCoeffs: readonly LaliberteDensityCoeffs[]
): number {
  const totalSolute = soluteWeightFractions.reduce((a, b) => a + b, 0);
  const ww = 1 - totalSolute;
  const rhoW = kellWaterDensity(t);

  let sumFrac = ww / rhoW;
  for (let i = 0; i < soluteWeightFractions.length; i++) {
    const rhoApp = apparentDensity(t, ww, densityCoeffs[i]);
    sumFrac += soluteWeightFractions[i] / rhoApp;
  }

  return 1 / sumFrac;
}

/**
 * Lalibertéモデルによる電解質水溶液の粘度
 *
 * 混合則(対数): η = η_w^(w_w) · Π ηᵢ^(wᵢ)
 *
 * @param t - 温度 [°C]
 * @param soluteWeightFractions - 各溶質の質量分率の配列
 * @param viscosityCoeffs - 各溶質の粘度係数の配列
 * @returns 粘度 [Pa·s]
 */
export function laliberteViscosity(
  t: number,
  soluteWeightFractions: readonly number[],
  viscosityCoeffs: readonly LaliberteViscosityCoeffs[]
): number {
  const totalSolute = soluteWeightFractions.reduce((a, b) => a + b, 0);
  const ww = 1 - totalSolute;
  const etaW = laliberteWaterViscosity(t); // mPa·s

  let result = Math.pow(etaW, ww);
  for (let i = 0; i < soluteWeightFractions.length; i++) {
    const etaI = apparentViscosity(t, ww, viscosityCoeffs[i]);
    result *= Math.pow(etaI, soluteWeightFractions[i]);
  }

  return result * 1e-3; // mPa·s → Pa·s
}

/**
 * 単一溶質の Laliberté 密度計算（簡易版）
 *
 * @param t - 温度 [°C]
 * @param w - 溶質質量分率 (0–1)
 * @param coeffs - 密度係数
 * @returns 密度 [kg/m³]
 */
export function laliberteSingleSoluteDensity(
  t: number,
  w: number,
  coeffs: LaliberteDensityCoeffs
): number {
  return laliberteDensity(t, [w], [coeffs]);
}

/**
 * 単一溶質の Laliberté 粘度計算（簡易版）
 *
 * @param t - 温度 [°C]
 * @param w - 溶質質量分率 (0–1)
 * @param coeffs - 粘度係数
 * @returns 粘度 [Pa·s]
 */
export function laliberteSingleSoluteViscosity(
  t: number,
  w: number,
  coeffs: LaliberteViscosityCoeffs
): number {
  return laliberteViscosity(t, [w], [coeffs]);
}
