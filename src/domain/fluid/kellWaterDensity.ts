/**
 * Kell (1975) 純水密度の有理多項式
 *
 * Lalibertéモデルなど、混合物モデルの水成分密度計算に使用する。
 *
 * 出典: Kell, G.S., J. Chem. Eng. Data 20(1):97, 1975
 * 精度: ±0.01 kg/m³ (0–40°C), ±0.1 kg/m³ (40–150°C)
 * 範囲: 0–150°C, 大気圧
 */

/**
 * Kell (1975) 有理多項式による純水密度
 *
 * @param t - 温度 [°C]  (0 ≤ t ≤ 150)
 * @returns 密度 [kg/m³]
 */
export function kellWaterDensity(t: number): number {
  const numerator =
    999.83952
    + 16.945176 * t
    - 7.9870401e-3 * t * t
    - 4.6170461e-5 * t * t * t
    + 1.0556302e-7 * t * t * t * t
    - 2.8054253e-10 * t * t * t * t * t;
  const denominator = 1 + 1.687985e-2 * t;
  return numerator / denominator;
}
