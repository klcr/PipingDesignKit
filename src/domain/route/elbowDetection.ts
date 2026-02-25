/**
 * エルボ検出 — 3 ノードの方向変化からエルボ角度・種別を検出
 *
 * 外部ライブラリ非依存（domain レイヤールール遵守）
 */

import { Point3D, RouteNode, DetectedElbow, ElbowStandardAngle, ElbowConnectionType } from './types';
import { calcDirection, dotProduct } from './routeGeometry';

/** 度 ↔ ラジアン変換 */
const RAD_TO_DEG = 180 / Math.PI;

/** デフォルト許容角度 (°) — 標準角度への丸め閾値 */
const DEFAULT_TOLERANCE_DEG = 5;

/**
 * 3 ノード A → B → C のベンド角度 (°) を算出
 *
 * AB 方向と BC 方向のなす角を返す。
 * - 0° = 直線（方向変化なし）
 * - 90° = 直角
 * - 180° = U ターン（逆方向）
 */
export function calcBendAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const v1 = calcDirection(a, b);
  const v2 = calcDirection(b, c);
  const dot = dotProduct(v1, v2);
  // clamp to [-1, 1] to handle floating-point rounding
  const clamped = Math.max(-1, Math.min(1, dot));
  return Math.acos(clamped) * RAD_TO_DEG;
}

/**
 * 角度を最近傍の標準エルボ角度に分類
 *
 * @param angleDeg - 計算されたベンド角度 (°)
 * @param toleranceDeg - 許容範囲 (°)。この範囲内なら警告なし
 * @returns standardAngle (0/45/90/180) と任意の warning
 */
export function classifyAngle(
  angleDeg: number,
  toleranceDeg: number = DEFAULT_TOLERANCE_DEG
): { standardAngle: ElbowStandardAngle; warning?: string } {
  const candidates: ElbowStandardAngle[] = [0, 45, 90, 180];
  let bestAngle: ElbowStandardAngle = 0;
  let bestDiff = Infinity;

  for (const candidate of candidates) {
    const diff = Math.abs(angleDeg - candidate);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestAngle = candidate;
    }
  }

  if (bestDiff > toleranceDeg && bestAngle !== 0) {
    return {
      standardAngle: bestAngle,
      warning: `Bend angle ${angleDeg.toFixed(1)}° deviates from standard ${bestAngle}° by ${bestDiff.toFixed(1)}°`,
    };
  }

  return { standardAngle: bestAngle };
}

/**
 * 標準角度 + 接続方式 → Crane TP-410 の fitting ID にマッピング
 *
 * @returns fitting ID。0° (直線) の場合は空文字列
 */
export function resolveElbowFittingId(
  standardAngle: ElbowStandardAngle,
  connection: ElbowConnectionType,
  use90LongRadius: boolean
): string {
  if (standardAngle === 0) return '';

  if (standardAngle === 180) return 'return_bend_180';

  if (standardAngle === 90) {
    if (connection === 'threaded') return 'elbow_90_std_threaded';
    return use90LongRadius ? 'elbow_90_lr_welded' : 'elbow_90_std_welded';
  }

  if (standardAngle === 45) {
    return connection === 'threaded' ? 'elbow_45_std_threaded' : 'elbow_45_std_welded';
  }

  return '';
}

/**
 * ルートの全内部ノードを走査してエルボを検出
 *
 * ノード i (1 ≤ i ≤ N-2) について、i-1 → i → i+1 の方向変化を検出。
 * 直線 (0°) はスキップ。
 *
 * @param nodes - ルートノード列（3 ノード以上で有効）
 * @param connection - エルボ接続方式
 * @param use90LongRadius - 90° エルボにロングラジアスを使用するか
 * @returns 検出されたエルボの配列
 */
export function detectElbows(
  nodes: readonly RouteNode[],
  connection: ElbowConnectionType,
  use90LongRadius: boolean
): DetectedElbow[] {
  if (nodes.length < 3) return [];

  const elbows: DetectedElbow[] = [];

  for (let i = 1; i < nodes.length - 1; i++) {
    const a = nodes[i - 1].position;
    const b = nodes[i].position;
    const c = nodes[i + 1].position;

    const angleDeg = calcBendAngle(a, b, c);
    const { standardAngle, warning } = classifyAngle(angleDeg);

    if (standardAngle === 0) continue;

    const fittingId = resolveElbowFittingId(standardAngle, connection, use90LongRadius);

    elbows.push({
      nodeIndex: i,
      angleDeg,
      standardAngle,
      fittingId,
      warning,
    });
  }

  return elbows;
}
