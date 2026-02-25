/**
 * SVG 座標変換ユーティリティ
 *
 * マウスイベントの clientX/clientY を
 * SVG ユーザー座標系（viewBox 座標）に変換する。
 */

import { Point2D } from '../views/PipeViewRenderer';

/**
 * クライアント座標を SVG ユーザー座標に変換
 */
export function clientToSvgPoint(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point2D | null {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}
