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
