/**
 * 配管ルート型定義
 *
 * ノード座標 (X, Y, Z) による配管ルート定義と
 * 自動エルボ検出のための型。
 *
 * 内部計算はすべて SI 単位系 (m)
 */

import { FittingInput } from '@domain/types';

// ── 座標・ベクトル ──

/** 3D 座標点 (m) */
export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 3D 方向ベクトル（正規化済み） */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

// ── ノード・ルート ──

/** 配管ルートのノード */
export interface RouteNode {
  readonly id: string;
  readonly position: Point3D;
  /** ユーザーが手動追加した継手（バルブ等） */
  readonly additionalFittings: FittingInput[];
}

/** 配管ルート全体 */
export interface PipeRoute {
  readonly nodes: readonly RouteNode[];
}

// ── エルボ検出 ──

/** エルボ標準角度 (0 = 直線で継手なし) */
export type ElbowStandardAngle = 0 | 45 | 90 | 180;

/** エルボ接続タイプ */
export type ElbowConnectionType = 'welded' | 'threaded';

/** エルボ検出結果 */
export interface DetectedElbow {
  readonly nodeIndex: number;
  readonly angleDeg: number;
  readonly standardAngle: ElbowStandardAngle;
  readonly fittingId: string;
  readonly warning?: string;
}

// ── 直管区間 ──

/** ノード間の直管区間情報 */
export interface StraightRun {
  readonly fromNodeIndex: number;
  readonly toNodeIndex: number;
  readonly length_m: number;
  readonly elevation_m: number;
  readonly direction: Vector3D;
}

// ── 変換設定 ──

/** ルート → セグメント変換設定 */
export interface RouteConversionConfig {
  readonly elbowConnection: ElbowConnectionType;
  readonly use90LongRadius: boolean;
}

// ── 解析結果 ──

/** ルート解析結果（UI プレビュー用） */
export interface RouteAnalysis {
  readonly straightRuns: readonly StraightRun[];
  readonly detectedElbows: readonly DetectedElbow[];
  readonly totalLength_m: number;
  readonly totalElevation_m: number;
  readonly elbowCount90: number;
  readonly elbowCount45: number;
  readonly elbowCount180: number;
  readonly warnings: readonly string[];
}
