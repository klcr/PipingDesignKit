/**
 * ルート → セグメント変換
 *
 * PipeRoute を SegmentInput[] に自動変換し、
 * エルボを自動検出して継手として追加する。
 *
 * 外部ライブラリ非依存（domain レイヤールール遵守）
 */

import { SegmentInput, FittingInput, PipeSpec, PipeMaterial, FluidProperties } from '@domain/types';
import { PipeRoute, RouteConversionConfig, RouteAnalysis, DetectedElbow } from './types';
import { calcStraightRuns } from './routeGeometry';
import { detectElbows } from './elbowDetection';

/**
 * ルートを解析して UI プレビュー用の情報を返す
 *
 * セグメント変換に先立ち、直管区間・エルボ・サマリを提供する。
 */
export function analyzeRoute(route: PipeRoute, config: RouteConversionConfig): RouteAnalysis {
  if (route.nodes.length < 2) {
    return {
      straightRuns: [],
      detectedElbows: [],
      totalLength_m: 0,
      totalElevation_m: 0,
      elbowCount90: 0,
      elbowCount45: 0,
      elbowCount180: 0,
      warnings: [],
    };
  }

  const straightRuns = calcStraightRuns(route.nodes);
  const detectedElbows = detectElbows(
    route.nodes,
    config.elbowConnection,
    config.use90LongRadius
  );

  const totalLength_m = straightRuns.reduce((sum, r) => sum + r.length_m, 0);
  const totalElevation_m = straightRuns.reduce((sum, r) => sum + r.elevation_m, 0);

  const elbowCount90 = detectedElbows.filter(e => e.standardAngle === 90).length;
  const elbowCount45 = detectedElbows.filter(e => e.standardAngle === 45).length;
  const elbowCount180 = detectedElbows.filter(e => e.standardAngle === 180).length;

  const warnings = detectedElbows
    .filter(e => e.warning !== undefined)
    .map(e => e.warning!);

  return {
    straightRuns,
    detectedElbows,
    totalLength_m,
    totalElevation_m,
    elbowCount90,
    elbowCount45,
    elbowCount180,
    warnings,
  };
}

/**
 * ルートを SegmentInput[] に変換
 *
 * 変換ルール:
 * - ノードペア (i, i+1) ごとに 1 セグメント生成
 * - length_m = ノード間 3D 距離
 * - elevation_m = Z 差分
 * - エルボの帰属: ノード i+1 で検出されたエルボを当該セグメントの fittings に追加
 * - additionalFittings: ノード i の追加継手をセグメントに追加。最終ノードの追加継手は最終セグメントに追加
 *
 * @throws ノード数 2 未満の場合
 */
export function convertRouteToSegments(
  route: PipeRoute,
  pipe: PipeSpec,
  material: PipeMaterial,
  fluid: FluidProperties,
  flowRate_m3s: number,
  config: RouteConversionConfig
): SegmentInput[] {
  if (route.nodes.length < 2) {
    throw new Error('At least 2 nodes are required to create segments');
  }

  const straightRuns = calcStraightRuns(route.nodes);
  const detectedElbows = detectElbows(
    route.nodes,
    config.elbowConnection,
    config.use90LongRadius
  );

  // エルボをノードインデックスでルックアップ用に変換
  const elbowByNode = new Map<number, DetectedElbow>();
  for (const elbow of detectedElbows) {
    elbowByNode.set(elbow.nodeIndex, elbow);
  }

  const segments: SegmentInput[] = [];
  const nodeCount = route.nodes.length;

  for (let i = 0; i < straightRuns.length; i++) {
    const run = straightRuns[i];
    const fittings: FittingInput[] = [];

    // 1. 始点ノードの追加継手
    for (const f of route.nodes[i].additionalFittings) {
      fittings.push(f);
    }

    // 2. 終点ノードで検出されたエルボ
    const elbow = elbowByNode.get(i + 1);
    if (elbow) {
      fittings.push({ fittingId: elbow.fittingId, quantity: 1 });
    }

    // 3. 最終セグメントには最終ノードの追加継手も含める
    if (i === straightRuns.length - 1) {
      for (const f of route.nodes[nodeCount - 1].additionalFittings) {
        fittings.push(f);
      }
    }

    segments.push({
      pipe,
      material,
      fluid,
      flowRate_m3s,
      length_m: run.length_m,
      elevation_m: run.elevation_m,
      fittings,
    });
  }

  return segments;
}
