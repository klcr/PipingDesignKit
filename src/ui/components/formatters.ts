/**
 * 共通フォーマット関数
 *
 * 3 つのフィーチャーコンポーネント (PipeLossCalculator, MultiSegmentCalculator, RouteEditor)
 * で重複していたフォーマッタを一元化。
 */

/** 数値を指定小数桁数で文字列化 */
export function formatNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

/** 圧力 (Pa) を適切な単位 (Pa / kPa / MPa) で表示 */
export function formatPa(pa: number): string {
  if (Math.abs(pa) >= 1e6) return `${(pa / 1e6).toFixed(3)} MPa`;
  if (Math.abs(pa) >= 1e3) return `${(pa / 1e3).toFixed(2)} kPa`;
  return `${pa.toFixed(1)} Pa`;
}
