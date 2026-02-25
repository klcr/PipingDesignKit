import { describe, it, expect } from 'vitest';
import {
  calcDistance,
  calcDirection,
  calcElevation,
  dotProduct,
  normalizeVector,
  vectorMagnitude,
  calcStraightRuns,
} from '../routeGeometry';
import { RouteNode } from '../types';

/** テスト用ヘルパー: 座標からノードを作成 */
function node(x: number, y: number, z: number, id?: string): RouteNode {
  return { id: id ?? `N${x}_${y}_${z}`, position: { x, y, z }, additionalFittings: [] };
}

describe('calcDistance', () => {
  it('X 軸上の 2 点間距離', () => {
    expect(calcDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 })).toBe(3);
  });

  it('3D 距離 (3,4,0) = 5', () => {
    expect(calcDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
  });

  it('3D 距離 (1,2,2) = 3', () => {
    expect(calcDistance({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 })).toBe(3);
  });

  it('同一点間の距離は 0', () => {
    expect(calcDistance({ x: 5, y: 5, z: 5 }, { x: 5, y: 5, z: 5 })).toBe(0);
  });
});

describe('vectorMagnitude', () => {
  it('単位ベクトルの大きさは 1', () => {
    expect(vectorMagnitude({ x: 1, y: 0, z: 0 })).toBe(1);
  });

  it('(3,4,0) の大きさは 5', () => {
    expect(vectorMagnitude({ x: 3, y: 4, z: 0 })).toBe(5);
  });
});

describe('normalizeVector', () => {
  it('(3,0,0) → (1,0,0)', () => {
    const v = normalizeVector({ x: 3, y: 0, z: 0 });
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  it('ゼロベクトルでエラー', () => {
    expect(() => normalizeVector({ x: 0, y: 0, z: 0 })).toThrow('zero vector');
  });
});

describe('calcDirection', () => {
  it('X 軸正方向', () => {
    const d = calcDirection({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
    expect(d.x).toBeCloseTo(1);
    expect(d.y).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(0);
  });

  it('Y 軸正方向', () => {
    const d = calcDirection({ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 });
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });

  it('斜め方向は正規化される', () => {
    const d = calcDirection({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 0 });
    const mag = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
    expect(mag).toBeCloseTo(1);
  });

  it('同一点でエラー', () => {
    expect(() => calcDirection({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toThrow('identical points');
  });
});

describe('calcElevation', () => {
  it('上向きは正', () => {
    expect(calcElevation({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 })).toBe(5);
  });

  it('下向きは負', () => {
    expect(calcElevation({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 3 })).toBe(-7);
  });

  it('水平は 0', () => {
    expect(calcElevation({ x: 0, y: 0, z: 5 }, { x: 10, y: 10, z: 5 })).toBe(0);
  });
});

describe('dotProduct', () => {
  it('同方向の単位ベクトルの内積は 1', () => {
    expect(dotProduct({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(1);
  });

  it('直交ベクトルの内積は 0', () => {
    expect(dotProduct({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
  });

  it('逆方向の単位ベクトルの内積は -1', () => {
    expect(dotProduct({ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 })).toBe(-1);
  });
});

describe('calcStraightRuns', () => {
  it('2 ノード → 1 直管区間', () => {
    const runs = calcStraightRuns([node(0, 0, 0), node(10, 0, 0)]);
    expect(runs).toHaveLength(1);
    expect(runs[0].length_m).toBeCloseTo(10);
    expect(runs[0].elevation_m).toBeCloseTo(0);
    expect(runs[0].fromNodeIndex).toBe(0);
    expect(runs[0].toNodeIndex).toBe(1);
  });

  it('3 ノード → 2 直管区間', () => {
    const runs = calcStraightRuns([
      node(0, 0, 0),
      node(10, 0, 0),
      node(10, 10, 0),
    ]);
    expect(runs).toHaveLength(2);
    expect(runs[0].length_m).toBeCloseTo(10);
    expect(runs[1].length_m).toBeCloseTo(10);
  });

  it('高低差が正しく算出される', () => {
    const runs = calcStraightRuns([
      node(0, 0, 0),
      node(0, 0, 5),
      node(10, 0, 5),
    ]);
    expect(runs[0].elevation_m).toBeCloseTo(5);
    expect(runs[1].elevation_m).toBeCloseTo(0);
  });

  it('ノード数 1 でエラー', () => {
    expect(() => calcStraightRuns([node(0, 0, 0)])).toThrow('At least 2 nodes');
  });
});
