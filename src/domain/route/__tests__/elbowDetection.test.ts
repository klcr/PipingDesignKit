import { describe, it, expect } from 'vitest';
import {
  calcBendAngle,
  classifyAngle,
  resolveElbowFittingId,
  detectElbows,
} from '../elbowDetection';
import { RouteNode } from '../types';

/** テスト用ヘルパー: 座標からノードを作成 */
function node(x: number, y: number, z: number, id?: string): RouteNode {
  return { id: id ?? `N${x}_${y}_${z}`, position: { x, y, z }, additionalFittings: [] };
}

describe('calcBendAngle', () => {
  it('直線 (X 軸上 3 点) → 0°', () => {
    const angle = calcBendAngle({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
    expect(angle).toBeCloseTo(0, 5);
  });

  it('L 字 (X → Y) → 90°', () => {
    const angle = calcBendAngle({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 });
    expect(angle).toBeCloseTo(90, 5);
  });

  it('U ターン → 180°', () => {
    const angle = calcBendAngle({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    expect(angle).toBeCloseTo(180, 5);
  });

  it('45° ベンド', () => {
    // (0,0,0) → (10,0,0) → (10+cos45*10, sin45*10, 0)
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    const angle = calcBendAngle(
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10 + cos45 * 10, y: sin45 * 10, z: 0 }
    );
    expect(angle).toBeCloseTo(45, 1);
  });

  it('3D 直角 (X → Z)', () => {
    const angle = calcBendAngle({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 0, z: 10 });
    expect(angle).toBeCloseTo(90, 5);
  });
});

describe('classifyAngle', () => {
  it('0° → standardAngle=0, warning なし', () => {
    const result = classifyAngle(0);
    expect(result.standardAngle).toBe(0);
    expect(result.warning).toBeUndefined();
  });

  it('90° → standardAngle=90, warning なし', () => {
    const result = classifyAngle(90);
    expect(result.standardAngle).toBe(90);
    expect(result.warning).toBeUndefined();
  });

  it('45° → standardAngle=45, warning なし', () => {
    const result = classifyAngle(45);
    expect(result.standardAngle).toBe(45);
    expect(result.warning).toBeUndefined();
  });

  it('180° → standardAngle=180, warning なし', () => {
    const result = classifyAngle(180);
    expect(result.standardAngle).toBe(180);
    expect(result.warning).toBeUndefined();
  });

  it('93° → standardAngle=90, warning なし (許容範囲内)', () => {
    const result = classifyAngle(93);
    expect(result.standardAngle).toBe(90);
    expect(result.warning).toBeUndefined();
  });

  it('30° → standardAngle=45, warning あり (許容範囲外)', () => {
    const result = classifyAngle(30);
    expect(result.standardAngle).toBe(45);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('30.0°');
    expect(result.warning).toContain('45°');
  });

  it('3° → standardAngle=0, warning なし (直線扱い)', () => {
    const result = classifyAngle(3);
    expect(result.standardAngle).toBe(0);
    expect(result.warning).toBeUndefined();
  });

  it('カスタム許容範囲 10° で 80° → standardAngle=90, warning なし', () => {
    const result = classifyAngle(80, 10);
    expect(result.standardAngle).toBe(90);
    expect(result.warning).toBeUndefined();
  });
});

describe('resolveElbowFittingId', () => {
  it('90° + welded + LR → elbow_90_lr_welded', () => {
    expect(resolveElbowFittingId(90, 'welded', true)).toBe('elbow_90_lr_welded');
  });

  it('90° + welded + STD → elbow_90_std_welded', () => {
    expect(resolveElbowFittingId(90, 'welded', false)).toBe('elbow_90_std_welded');
  });

  it('90° + threaded → elbow_90_std_threaded', () => {
    expect(resolveElbowFittingId(90, 'threaded', true)).toBe('elbow_90_std_threaded');
  });

  it('45° + welded → elbow_45_std_welded', () => {
    expect(resolveElbowFittingId(45, 'welded', false)).toBe('elbow_45_std_welded');
  });

  it('45° + threaded → elbow_45_std_threaded', () => {
    expect(resolveElbowFittingId(45, 'threaded', false)).toBe('elbow_45_std_threaded');
  });

  it('180° → return_bend_180', () => {
    expect(resolveElbowFittingId(180, 'welded', false)).toBe('return_bend_180');
  });

  it('0° → null (エルボなし)', () => {
    expect(resolveElbowFittingId(0, 'welded', false)).toBeNull();
  });
});

describe('detectElbows', () => {
  it('L 字ルート → 90° エルボ × 1', () => {
    const nodes = [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)];
    const elbows = detectElbows(nodes, 'welded', true);
    expect(elbows).toHaveLength(1);
    expect(elbows[0].nodeIndex).toBe(1);
    expect(elbows[0].standardAngle).toBe(90);
    expect(elbows[0].fittingId).toBe('elbow_90_lr_welded');
  });

  it('コの字ルート → 90° エルボ × 2', () => {
    const nodes = [
      node(0, 0, 0),
      node(10, 0, 0),
      node(10, 10, 0),
      node(0, 10, 0),
    ];
    const elbows = detectElbows(nodes, 'welded', true);
    expect(elbows).toHaveLength(2);
    expect(elbows[0].standardAngle).toBe(90);
    expect(elbows[1].standardAngle).toBe(90);
  });

  it('直線ルート → エルボなし', () => {
    const nodes = [node(0, 0, 0), node(5, 0, 0), node(10, 0, 0)];
    const elbows = detectElbows(nodes, 'welded', true);
    expect(elbows).toHaveLength(0);
  });

  it('2 ノード → エルボなし', () => {
    const nodes = [node(0, 0, 0), node(10, 0, 0)];
    const elbows = detectElbows(nodes, 'welded', true);
    expect(elbows).toHaveLength(0);
  });

  it('3D L 字 (水平 → 垂直) → 90° エルボ', () => {
    const nodes = [node(0, 0, 0), node(10, 0, 0), node(10, 0, 10)];
    const elbows = detectElbows(nodes, 'welded', false);
    expect(elbows).toHaveLength(1);
    expect(elbows[0].standardAngle).toBe(90);
    expect(elbows[0].fittingId).toBe('elbow_90_std_welded');
  });

  it('接続方式切替で fitting ID が変わる', () => {
    const nodes = [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)];
    const welded = detectElbows(nodes, 'welded', true);
    const threaded = detectElbows(nodes, 'threaded', true);
    expect(welded[0].fittingId).toBe('elbow_90_lr_welded');
    expect(threaded[0].fittingId).toBe('elbow_90_std_threaded');
  });

  it('非標準角度 (30°) → warning 付きで 45° に分類', () => {
    // v1 = (1,0,0), v2 at 30° from v1
    const cos30 = Math.cos(30 * Math.PI / 180);
    const sin30 = Math.sin(30 * Math.PI / 180);
    const nodes = [
      node(0, 0, 0),
      node(10, 0, 0),
      node(10 + cos30 * 10, sin30 * 10, 0),
    ];
    const elbows = detectElbows(nodes, 'welded', false);
    expect(elbows).toHaveLength(1);
    expect(elbows[0].standardAngle).toBe(45);
    expect(elbows[0].warning).toBeDefined();
  });
});
