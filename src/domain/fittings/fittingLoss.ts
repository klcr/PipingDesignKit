/**
 * 継手損失の解決 — データファイルからK値を計算
 *
 * crane-tp410.json と ft-values.json を使い、
 * 継手ID + パイプサイズ → K値 → 圧損を計算する。
 */

import { FittingResult, FittingInput, KValueMethod } from '../types';
import { calcKCrane, calcKFromCv, calcFittingLoss, CRANE_REF, CV_REF } from './kValue';

/** crane-tp410.json の fitting エントリ */
export interface CraneFittingEntry {
  readonly id: string;
  readonly type: string;
  readonly description: string;
  readonly ldRatio: number;
  readonly connection: string;
}

/** crane-tp410.json の entrance/exit エントリ */
export interface CraneFixedKEntry {
  readonly id: string;
  readonly description: string;
  readonly k: number;
}

/** crane-tp410.json のルート型 */
export interface CraneData {
  readonly fittings: readonly CraneFittingEntry[];
  readonly entrances: readonly CraneFixedKEntry[];
  readonly exits: readonly CraneFixedKEntry[];
}

/** ft-values.json の型 */
export interface FtData {
  readonly values: Record<string, number>;
}

/**
 * 継手入力リストから計算済みFittingResultリストを生成する
 */
export function resolveFittings(
  inputs: readonly FittingInput[],
  craneData: CraneData,
  ft: number,
  id_mm: number,
  density: number,
  velocity: number
): FittingResult[] {
  return inputs.map(input => resolveSingleFitting(input, craneData, ft, id_mm, density, velocity));
}

function resolveSingleFitting(
  input: FittingInput,
  craneData: CraneData,
  ft: number,
  id_mm: number,
  density: number,
  velocity: number
): FittingResult {
  // Cv override の場合
  if (input.cvOverride !== undefined && input.cvOverride > 0) {
    const k = calcKFromCv(input.cvOverride, id_mm);
    const loss = calcFittingLoss(k, density, velocity);
    return {
      id: input.fittingId,
      description: `Cv=${input.cvOverride} (user input)`,
      quantity: input.quantity,
      k_value: k,
      method: 'cv' as KValueMethod,
      dp_pa: loss.dp_pa * input.quantity,
      head_loss_m: loss.head_m * input.quantity,
      reference: CV_REF,
    };
  }

  // 固定K: entrances
  const entrance = craneData.entrances.find(e => e.id === input.fittingId);
  if (entrance) {
    const loss = calcFittingLoss(entrance.k, density, velocity);
    return {
      id: input.fittingId,
      description: entrance.description,
      quantity: input.quantity,
      k_value: entrance.k,
      method: 'fixed_k' as KValueMethod,
      dp_pa: loss.dp_pa * input.quantity,
      head_loss_m: loss.head_m * input.quantity,
      reference: { source: 'Crane TP-410', page: 'A-29' },
    };
  }

  // 固定K: exits
  const exit = craneData.exits.find(e => e.id === input.fittingId);
  if (exit) {
    const loss = calcFittingLoss(exit.k, density, velocity);
    return {
      id: input.fittingId,
      description: exit.description,
      quantity: input.quantity,
      k_value: exit.k,
      method: 'fixed_k' as KValueMethod,
      dp_pa: loss.dp_pa * input.quantity,
      head_loss_m: loss.head_m * input.quantity,
      reference: { source: 'Crane TP-410', page: 'A-29' },
    };
  }

  // L/D法: fittings
  const fitting = craneData.fittings.find(f => f.id === input.fittingId);
  if (!fitting) {
    throw new Error(`Fitting not found: ${input.fittingId}`);
  }

  const k = calcKCrane(fitting.ldRatio, ft);
  const loss = calcFittingLoss(k, density, velocity);

  return {
    id: input.fittingId,
    description: fitting.description,
    quantity: input.quantity,
    k_value: k,
    method: 'crane_ld' as KValueMethod,
    dp_pa: loss.dp_pa * input.quantity,
    head_loss_m: loss.head_m * input.quantity,
    reference: CRANE_REF,
  };
}
