/**
 * Melinder (2010) グリコール水溶液多項式
 *
 * エチレングリコール–水 (EG) とプロピレングリコール–水 (PG) の
 * 密度・粘度を、18項三角多項式で計算する。
 *
 * 出典: Melinder (2010), "Properties of Secondary Working Fluids"
 *        LBNL Buildings Library v9.1.0 (BSD-3 license)
 *
 * 多項式形式:
 *   Property(T, X) = Σₖ aₖ · (100·(X − X_ref))^i(k) · (T − T_ref)^j(k)
 *
 * i群 [0..5] ごとの j 項数: nT = [4, 4, 4, 3, 2, 1] → 計18項
 *
 * 密度: 直接 kg/m³
 * 粘度: ln(μ/[mPa·s]) → μ = exp(result) [mPa·s]
 */

/**
 * Melinder 三角多項式の評価
 *
 * @param x - グリコール質量分率 (0–1)
 * @param t_k - 温度 [K]
 * @param xRef - 基準質量分率
 * @param tRef - 基準温度 [K]
 * @param nTerms - 各i群のj項数 [4, 4, 4, 3, 2, 1]
 * @param coeffs - 多項式係数（nTermsの合計と同数）
 * @returns 多項式の値
 */
export function melinderPoly(
  x: number,
  t_k: number,
  xRef: number,
  tRef: number,
  nTerms: readonly number[],
  coeffs: readonly number[]
): number {
  const dx = 100 * (x - xRef);
  const dy = t_k - tRef;

  let result = 0;
  let n = 0;
  for (let i = 0; i < nTerms.length; i++) {
    const dxPowI = Math.pow(dx, i);
    for (let j = 0; j < nTerms[i]; j++) {
      result += coeffs[n] * dxPowI * Math.pow(dy, j);
      n++;
    }
  }
  return result;
}

/**
 * Melinder モデルによるグリコール水溶液の密度
 *
 * @param x - グリコール質量分率 (0–1)
 * @param t_c - 温度 [°C]
 * @param xRef - 基準質量分率
 * @param tRefK - 基準温度 [K]
 * @param nTerms - 各i群のj項数
 * @param densityCoeffs - 密度多項式の係数
 * @returns 密度 [kg/m³]
 */
export function melinderDensity(
  x: number,
  t_c: number,
  xRef: number,
  tRefK: number,
  nTerms: readonly number[],
  densityCoeffs: readonly number[]
): number {
  const t_k = t_c + 273.15;
  return melinderPoly(x, t_k, xRef, tRefK, nTerms, densityCoeffs);
}

/**
 * Melinder モデルによるグリコール水溶液の粘度
 *
 * 多項式は ln(μ/[mPa·s]) を返すため、exp() して Pa·s に変換する。
 *
 * @param x - グリコール質量分率 (0–1)
 * @param t_c - 温度 [°C]
 * @param xRef - 基準質量分率
 * @param tRefK - 基準温度 [K]
 * @param nTerms - 各i群のj項数
 * @param viscosityCoeffs - 粘度多項式の係数 (ln(μ/[mPa·s]))
 * @returns 粘度 [Pa·s]
 */
export function melinderViscosity(
  x: number,
  t_c: number,
  xRef: number,
  tRefK: number,
  nTerms: readonly number[],
  viscosityCoeffs: readonly number[]
): number {
  const t_k = t_c + 273.15;
  const lnMu = melinderPoly(x, t_k, xRef, tRefK, nTerms, viscosityCoeffs);
  return Math.exp(lnMu) * 1e-3; // mPa·s → Pa·s
}
