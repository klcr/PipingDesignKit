/**
 * スクロース（砂糖）水溶液の物性計算
 *
 * 密度: ICUMSA / NBS Circular 440 (1942) 多項式 (20°C基準)
 *        温度補正はNBS440補足テーブルからの線形近似
 * 粘度: 2次元テーブル補間（Perry's / ICUMSA データ）
 *
 * 濃度範囲: 0–75 wt% (0–75 °Brix)
 * 温度範囲: 20–80°C
 */

import type { SucroseData, SucroseViscosityPoint } from './solutionTypes';
import { linearInterpolate, TablePoint } from './interpolate';

/**
 * スクロース水溶液の密度 (20°C)
 *
 * ρ₂₀(B) = a0 + a1·B + a2·B² + a3·B³ + a4·B⁴ + a5·B⁵
 * B = °Brix ≈ wt%
 *
 * 5次多項式はICUMSAテーブル(0–75 Brix)へのフィットで±0.3 kg/m³以内。
 *
 * @param brix - 濃度 [°Brix ≈ wt%]
 * @param coeffs - 多項式係数 [a0, a1, a2, a3, a4, a5]
 * @returns 密度 [kg/m³] (20°C)
 */
export function sucroseDensity20C(
  brix: number,
  coeffs: readonly number[]
): number {
  let result = 0;
  for (let i = 0; i < coeffs.length; i++) {
    result += coeffs[i] * Math.pow(brix, i);
  }
  return result;
}

/**
 * スクロース水溶液の密度（温度補正付き）
 *
 * ρ(T, B) ≈ ρ₂₀(B) - α(B)·(T - 20)
 * α(B) = 0.33 + 0.003·B  [kg/(m³·°C)] — NBS440補足テーブルからの近似
 *
 * @param t - 温度 [°C]
 * @param brix - 濃度 [°Brix]
 * @param coeffs - 20°C密度多項式係数
 * @returns 密度 [kg/m³]
 */
export function sucroseDensity(
  t: number,
  brix: number,
  coeffs: readonly number[]
): number {
  const rho20 = sucroseDensity20C(brix, coeffs);
  // 温度補正係数: 低濃度で ~0.33, 高濃度で ~0.55 kg/(m³·°C)
  const alpha = 0.33 + 0.003 * brix;
  return rho20 - alpha * (t - 20);
}

/**
 * 2次元テーブル補間によるスクロース水溶液の粘度
 *
 * テーブルは (温度, Brix) → 粘度 [mPa·s] のデータ群。
 * まず同一Brixの温度補間を行い、次にBrix補間を行う。
 *
 * @param t - 温度 [°C]
 * @param brix - 濃度 [°Brix ≈ wt%]
 * @param table - 粘度テーブルデータ
 * @returns 粘度 [Pa·s]
 */
export function sucroseViscosity(
  t: number,
  brix: number,
  table: readonly SucroseViscosityPoint[]
): number {
  // テーブルからユニークなBrix値を抽出（ソート済み）
  const uniqueBrix = [...new Set(table.map(p => p.brix))].sort((a, b) => a - b);

  // 各Brixで温度補間
  const brixViscPairs: TablePoint[] = [];
  for (const b of uniqueBrix) {
    const tempPoints = table
      .filter(p => p.brix === b)
      .map(p => ({ x: p.temp_c, y: p.viscosity_mpa_s }))
      .sort((a, b) => a.x - b.x);

    if (tempPoints.length < 2) continue;

    // 温度が範囲外の場合はスキップ
    if (t < tempPoints[0].x || t > tempPoints[tempPoints.length - 1].x) continue;

    const viscAtTemp = linearInterpolate(t, tempPoints);
    brixViscPairs.push({ x: b, y: viscAtTemp });
  }

  if (brixViscPairs.length < 2) {
    throw new RangeError(
      `Sucrose viscosity: insufficient data for T=${t}°C, Brix=${brix}`
    );
  }

  // Brix範囲チェック
  if (brix < brixViscPairs[0].x || brix > brixViscPairs[brixViscPairs.length - 1].x) {
    throw new RangeError(
      `Sucrose Brix ${brix} is outside table range [${brixViscPairs[0].x}, ${brixViscPairs[brixViscPairs.length - 1].x}]`
    );
  }

  // 粘度のBrix補間
  const viscMpas = linearInterpolate(brix, brixViscPairs);
  return viscMpas * 1e-3; // mPa·s → Pa·s
}

/**
 * スクロース水溶液の物性を取得（密度・粘度）
 */
export function getSucroseProperties(
  t: number,
  brix: number,
  data: SucroseData
): { density: number; viscosity: number } {
  return {
    density: sucroseDensity(t, brix, data.density_20c_coefficients),
    viscosity: sucroseViscosity(t, brix, data.viscosity_table),
  };
}
