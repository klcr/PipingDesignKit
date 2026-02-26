/**
 * エタノール–水混合液の物性計算
 *
 * 密度: Redlich-Kister 過剰体積モデル (Danahy et al. 2018, open access CC BY)
 * 粘度: 2次元テーブル補間（Perry's / Khattab et al. 2012 データ）
 *
 * 濃度範囲: 0–100 wt%
 * 温度範囲: 15–55°C
 */

import { kellWaterDensity } from './kellWaterDensity';
import { linearInterpolate, TablePoint } from './interpolate';
import type { RedlichKisterCoeffs, EthanolWaterViscosityPoint } from './solutionTypes';

/** 分子量定数 */
const M_WATER = 18.015;   // g/mol
const M_ETHANOL = 46.069; // g/mol

/**
 * 質量分率 → モル分率への変換
 */
function wtToMoleFraction(wEthanol: number): { x1: number; x2: number } {
  if (wEthanol <= 0) return { x1: 1, x2: 0 };
  if (wEthanol >= 1) return { x1: 0, x2: 1 };

  const nEthanol = wEthanol / M_ETHANOL;
  const nWater = (1 - wEthanol) / M_WATER;
  const total = nEthanol + nWater;
  return {
    x1: nWater / total,    // water mole fraction
    x2: nEthanol / total,  // ethanol mole fraction
  };
}

/**
 * 純エタノールの密度 [kg/m³]
 *
 * 4次多項式 (Perry's, CRC Handbook データからのフィット)
 * 範囲: 10–60°C
 */
function pureEthanolDensity(t: number): number {
  // Fit from CRC Handbook / Danahy Table data
  return 806.59 - 0.8403 * t - 1.655e-3 * t * t;
}

/**
 * Redlich-Kister 過剰体積モデルによるエタノール–水密度
 *
 * V^E(x₂, T) = x₁·x₂ · Σᵢ Aᵢ(T)·(x₁ − x₂)ⁱ
 * Aᵢ(T) = aᵢ₀ + aᵢ₁·(T − 298.15)
 *
 * @param t - 温度 [°C]
 * @param wEthanol - エタノール質量分率 (0–1)
 * @param rkCoeffs - Redlich-Kister係数
 * @returns 密度 [kg/m³]
 */
export function ethanolWaterDensity(
  t: number,
  wEthanol: number,
  rkCoeffs: RedlichKisterCoeffs
): number {
  const rhoW = kellWaterDensity(t);
  const rhoE = pureEthanolDensity(t);

  if (wEthanol <= 0) return rhoW;
  if (wEthanol >= 1) return rhoE;

  const { x1, x2 } = wtToMoleFraction(wEthanol);
  const t_k = t + 273.15;
  const dT = t_k - 298.15;

  // Pure molar volumes [cm³/mol]
  const v1Star = M_WATER / (rhoW * 1e-3);    // g/mol / (g/cm³) = cm³/mol
  const v2Star = M_ETHANOL / (rhoE * 1e-3);

  // Excess volume [cm³/mol]
  let vExcess = 0;
  const diff = x1 - x2;
  for (let i = 0; i < rkCoeffs.a_i0.length; i++) {
    const Ai = rkCoeffs.a_i0[i] + rkCoeffs.a_i1[i] * dT;
    vExcess += Ai * Math.pow(diff, i);
  }
  vExcess *= x1 * x2;

  // Mixture molar volume [cm³/mol]
  const vMix = x1 * v1Star + x2 * v2Star + vExcess;

  // Average molar mass
  const mMix = x1 * M_WATER + x2 * M_ETHANOL;

  // Density [kg/m³] = g/mol / (cm³/mol) * 1000
  return (mMix / vMix) * 1000;
}

/**
 * 2次元テーブル補間によるエタノール–水粘度
 *
 * テーブルは (温度, 濃度wt%) → 粘度 [mPa·s] のデータ群。
 * まず同一濃度の温度補間を行い、次に濃度補間を行う。
 *
 * @param t - 温度 [°C]
 * @param wEthanol - エタノール質量分率 (0–1)
 * @param table - 粘度テーブルデータ
 * @returns 粘度 [Pa·s]
 */
export function ethanolWaterViscosity(
  t: number,
  wEthanol: number,
  table: readonly EthanolWaterViscosityPoint[]
): number {
  const wtPct = wEthanol * 100;

  // テーブルからユニークな濃度値を抽出（ソート済み）
  const uniqueConcs = [...new Set(table.map(p => p.wt_percent))].sort((a, b) => a - b);

  // 各濃度で温度補間
  const concViscPairs: TablePoint[] = [];
  for (const conc of uniqueConcs) {
    const tempPoints = table
      .filter(p => p.wt_percent === conc)
      .map(p => ({ x: p.temp_c, y: p.viscosity_mpa_s }))
      .sort((a, b) => a.x - b.x);

    if (tempPoints.length < 2) continue;

    // 温度が範囲外の場合はスキップ
    if (t < tempPoints[0].x || t > tempPoints[tempPoints.length - 1].x) continue;

    const viscAtTemp = linearInterpolate(t, tempPoints);
    concViscPairs.push({ x: conc, y: viscAtTemp });
  }

  if (concViscPairs.length < 2) {
    throw new RangeError(
      `Ethanol-water viscosity: insufficient data for T=${t}°C, wt%=${wtPct}`
    );
  }

  // 濃度範囲チェック
  if (wtPct < concViscPairs[0].x || wtPct > concViscPairs[concViscPairs.length - 1].x) {
    throw new RangeError(
      `Ethanol concentration ${wtPct} wt% is outside table range [${concViscPairs[0].x}, ${concViscPairs[concViscPairs.length - 1].x}]`
    );
  }

  // 粘度の濃度補間
  const viscMpas = linearInterpolate(wtPct, concViscPairs);
  return viscMpas * 1e-3; // mPa·s → Pa·s
}
