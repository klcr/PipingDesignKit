/**
 * 汎用線形補間ユーティリティ
 */

export interface TablePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * テーブルからの線形補間。
 * テーブルはx昇順ソート済みを前提とする。
 * 範囲外はRangeErrorをスローする。
 */
export function linearInterpolate(xTarget: number, table: readonly TablePoint[]): number {
  if (table.length < 2) {
    throw new Error('Table must have at least 2 points');
  }

  if (xTarget < table[0].x || xTarget > table[table.length - 1].x) {
    throw new RangeError(
      `Value ${xTarget} is outside table range [${table[0].x}, ${table[table.length - 1].x}]`
    );
  }

  // 一致点があればそのまま返す
  for (const point of table) {
    if (point.x === xTarget) return point.y;
  }

  // 挟む2点を探す
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i].x <= xTarget && xTarget <= table[i + 1].x) {
      const x0 = table[i].x;
      const x1 = table[i + 1].x;
      const y0 = table[i].y;
      const y1 = table[i + 1].y;
      return y0 + (y1 - y0) * (xTarget - x0) / (x1 - x0);
    }
  }

  // ここには到達しないはず
  throw new RangeError(`Interpolation failed for x=${xTarget}`);
}
