/**
 * アプリケーション層の入出力型
 *
 * ユーザー入力（UI フォームの値）をドメイン計算に渡すための型定義。
 * application/ は domain/ のみに依存する。
 */

import { PipeSpec, PipeMaterial, FittingInput } from '@domain/types';

/** 単セグメント計算のユースケース入力 */
export interface CalcSingleSegmentInput {
  readonly temperature_c: number;
  readonly pipe: PipeSpec;           // infrastructure で解決済み
  readonly material: PipeMaterial;   // infrastructure で解決済み
  readonly flowRate_m3h: number;     // ユーザー入力単位 (m³/h)
  readonly length_m: number;
  readonly elevation_m: number;
  readonly fittings: FittingInput[];
}

/** マルチセグメント計算の個別セグメント定義 */
export interface SegmentDefinition {
  readonly pipe: PipeSpec;           // infrastructure で解決済み
  readonly material: PipeMaterial;   // infrastructure で解決済み
  readonly length_m: number;
  readonly elevation_m: number;
  readonly fittings: FittingInput[];
}

/** マルチセグメント計算のユースケース入力 */
export interface CalcMultiSegmentInput {
  readonly temperature_c: number;      // 系統共通（同一流体）
  readonly flowRate_m3h: number;       // 系統共通（直列 = 質量保存）
  readonly segments: SegmentDefinition[];
}
