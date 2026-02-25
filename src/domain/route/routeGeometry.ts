/**
 * ルートジオメトリ — ノード間距離・方向ベクトル・高低差の純粋関数
 *
 * 外部ライブラリ非依存（domain レイヤールール遵守）
 */

import { Point3D, Vector3D, StraightRun, RouteNode } from './types';

/**
 * 2 点間の 3D ユークリッド距離 (m)
 */
export function calcDistance(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * ベクトルの大きさ
 */
export function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * ベクトル正規化
 * @throws ゼロベクトルの場合
 */
export function normalizeVector(v: Vector3D): Vector3D {
  const mag = vectorMagnitude(v);
  if (mag === 0) {
    throw new Error('Cannot normalize zero vector');
  }
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/**
 * 2 点間の正規化方向ベクトル (from → to)
 * @throws 同一点の場合
 */
export function calcDirection(from: Point3D, to: Point3D): Vector3D {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (mag === 0) {
    throw new Error('Cannot calculate direction between identical points');
  }
  return { x: dx / mag, y: dy / mag, z: dz / mag };
}

/**
 * 高低差 (m) — to.z - from.z（正 = 上向き）
 */
export function calcElevation(from: Point3D, to: Point3D): number {
  return to.z - from.z;
}

/**
 * ベクトルの内積
 */
export function dotProduct(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * ノード列から全直管区間を算出
 *
 * ノード数 N の場合、N-1 区間を返す。
 * @throws ノード数が 2 未満の場合
 */
export function calcStraightRuns(nodes: readonly RouteNode[]): StraightRun[] {
  if (nodes.length < 2) {
    throw new Error('At least 2 nodes are required to calculate straight runs');
  }

  const runs: StraightRun[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i].position;
    const to = nodes[i + 1].position;
    runs.push({
      fromNodeIndex: i,
      toNodeIndex: i + 1,
      length_m: calcDistance(from, to),
      elevation_m: calcElevation(from, to),
      direction: calcDirection(from, to),
    });
  }
  return runs;
}
