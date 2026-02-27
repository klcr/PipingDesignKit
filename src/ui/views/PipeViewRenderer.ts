/**
 * 配管ルート投影変換ユーティリティ
 *
 * 3D 座標 (Point3D) を各ビューの 2D スクリーン座標 (Point2D) に変換する。
 * React 非依存の純粋関数モジュール。
 *
 * SVG 座標系は Y 軸が下向きのため、工学的な上向き軸（Y, Z）は反転する。
 */

import { Point3D } from '@domain/route/types';

/** 2D スクリーン座標 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/** バウンディングボックス */
export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** 投影タイプ */
export type ProjectionType = 'plan' | 'elevation' | 'isometric';

// ── 定数 ──

const COS30 = Math.cos(Math.PI / 6); // √3/2 ≈ 0.866
const SIN30 = Math.sin(Math.PI / 6); // 0.5

// ── 投影関数 ──

/**
 * 平面図投影 (X-Y)
 * x_2d = X, y_2d = -Y (SVG Y 反転)
 */
export function projectPlan(p: Point3D): Point2D {
  return { x: p.x, y: -p.y };
}

/**
 * 立面図投影 (X-Z)
 * x_2d = X, y_2d = -Z (Z 上向き → SVG Y 反転)
 */
export function projectElevation(p: Point3D): Point2D {
  return { x: p.x, y: -p.z };
}

/**
 * アイソメ投影 (30° 等角投影)
 * x_2d = (X - Y) * cos30
 * y_2d = -((X + Y) * sin30 + Z)
 */
export function projectIsometric(p: Point3D): Point2D {
  return {
    x: (p.x - p.y) * COS30,
    y: -((p.x + p.y) * SIN30 + p.z),
  };
}

/**
 * 投影タイプに応じた座標変換
 */
export function projectPoint(p: Point3D, type: ProjectionType): Point2D {
  switch (type) {
    case 'plan':
      return projectPlan(p);
    case 'elevation':
      return projectElevation(p);
    case 'isometric':
      return projectIsometric(p);
  }
}

// ── ビューポート計算 ──

/**
 * 2D 点群のバウンディングボックスを算出
 * @throws 空配列の場合
 */
export function calcBoundingBox(points: readonly Point2D[]): BoundingBox {
  if (points.length === 0) {
    throw new Error('Cannot calculate bounding box of empty point set');
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * バウンディングボックスから SVG viewBox 文字列を生成
 *
 * アスペクト比を保つために正方形に正規化し、パディングを追加。
 * 幅・高さがゼロ（単一点）の場合はデフォルトサイズを使用。
 */
export function calcViewBox(bbox: BoundingBox, padding: number): string {
  const rawW = bbox.maxX - bbox.minX;
  const rawH = bbox.maxY - bbox.minY;
  const size = Math.max(rawW, rawH, 1); // 最小サイズ 1m 保証
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const halfSize = size / 2 + padding;

  return `${cx - halfSize} ${cy - halfSize} ${halfSize * 2} ${halfSize * 2}`;
}

// ── 逆投影 ──

/**
 * 平面図逆投影: SVG 2D 座標 → ワールド X, Y
 * Z はプランビューから復元不可（呼び出し元が元の Z を保持する）
 */
export function inversePlan(svgPt: Point2D): { x: number; y: number } {
  return { x: svgPt.x, y: -svgPt.y };
}

/**
 * 立面図逆投影: SVG 2D 座標 → ワールド X, Z
 * Y はエレベーションビューから復元不可（呼び出し元が元の Y を保持する）
 */
export function inverseElevation(svgPt: Point2D): { x: number; z: number } {
  return { x: svgPt.x, z: -svgPt.y };
}

// ── ビュー変換 ──

/** ビュー変換パラメータ */
export interface ViewTransform {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

/**
 * ベース viewBox にズーム/パン変換を適用
 */
export function applyTransform(baseViewBox: string, transform: ViewTransform): string {
  const [bx, by, bw, bh] = baseViewBox.split(' ').map(Number);
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const zw = bw / transform.zoom;
  const zh = bh / transform.zoom;
  return `${cx - zw / 2 - transform.panX} ${cy - zh / 2 - transform.panY} ${zw} ${zh}`;
}
