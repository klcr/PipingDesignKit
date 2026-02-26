/**
 * 計算解説タブ用の型定義
 */

import type { FluidProperties, PipeSpec, PipeMaterial, FittingInput, SegmentResult } from '@domain/types';
import type { PumpSuggestion } from '@domain/system/pumpRequirements';

/** 圧損計算の入力と結果のスナップショット */
export interface ExplanationSnapshot {
  readonly fluid: FluidProperties;
  readonly pipe: PipeSpec;
  readonly material: PipeMaterial;
  readonly flowRate_m3h: number;
  readonly length_m: number;
  readonly elevation_m: number;
  readonly fittings: FittingInput[];
  readonly result: SegmentResult;
}

/** ポンプ選定解説用のスナップショット */
export interface PumpExplanationSnapshot {
  readonly designFlow_m3h: number;
  readonly staticHead_m: number;
  readonly frictionHead_m: number;
  readonly density: number;
  readonly vaporPressure_kPa: number;
  readonly atmosphericPressure_kPa: number;
  readonly suctionStaticHead_m: number;
  readonly suctionFrictionLoss_m: number;
  readonly speed_rpm: number;
  readonly suggestion: PumpSuggestion | null;
}
