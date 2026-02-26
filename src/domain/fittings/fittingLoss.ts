/**
 * 継手損失の解決 — データファイルからK値を計算
 *
 * darby-3k.json と entrance-exit-k.json を使い、
 * 継手ID + パイプサイズ + Re → K値 → 圧損を計算する。
 */

import { FittingResult, FittingInput, KValueMethod } from '../types';
import { calcK3K, calcKFromCv, calcFittingLoss, DARBY_3K_REF, CV_REF } from './kValue';

/** darby-3k.json の fitting エントリ */
export interface Darby3KFittingEntry {
  readonly id: string;
  readonly type: string;
  readonly description: string;
  readonly description_ja?: string;
  readonly k1: number;
  readonly ki: number;
  readonly kd: number;
}

/** entrance-exit-k.json の entrance/exit エントリ */
export interface FixedKEntry {
  readonly id: string;
  readonly description: string;
  readonly description_ja?: string;
  readonly k: number;
}

/** darby-3k.json のルート型 */
export interface Darby3KData {
  readonly fittings: readonly Darby3KFittingEntry[];
}

/** entrance-exit-k.json のルート型 */
export interface EntranceExitData {
  readonly entrances: readonly FixedKEntry[];
  readonly exits: readonly FixedKEntry[];
}

const ENTRANCE_EXIT_REF = {
  source: 'Idelchik, 2007',
  page: 'Diagrams 3-1, 11-1',
};

/**
 * 継手入力リストから計算済みFittingResultリストを生成する
 */
export function resolveFittings(
  inputs: readonly FittingInput[],
  darby3kData: Darby3KData,
  entranceExitData: EntranceExitData,
  reynolds: number,
  id_mm: number,
  density: number,
  velocity: number
): FittingResult[] {
  return inputs.map(input => resolveSingleFitting(input, darby3kData, entranceExitData, reynolds, id_mm, density, velocity));
}

function resolveSingleFitting(
  input: FittingInput,
  darby3kData: Darby3KData,
  entranceExitData: EntranceExitData,
  reynolds: number,
  id_mm: number,
  density: number,
  velocity: number
): FittingResult {
  // Cv override の場合
  if (input.cvOverride !== undefined && input.cvOverride > 0) {
    const k = calcKFromCv(input.cvOverride, id_mm);
    const loss = calcFittingLoss(k, density, velocity);

    // Cv → K 変換結果の妥当性チェック（id_mm との整合性）
    let warning: string | undefined;
    if (k < 0.001) {
      warning = `K=${k.toExponential(2)}: Cv=${input.cvOverride} is very large relative to pipe ID=${id_mm}mm`;
    } else if (k > 500) {
      warning = `K=${k.toFixed(1)}: Cv=${input.cvOverride} is very small relative to pipe ID=${id_mm}mm`;
    }

    return {
      id: input.fittingId,
      description: `Cv=${input.cvOverride} (user input)`,
      quantity: input.quantity,
      k_value: k,
      method: 'cv' as KValueMethod,
      dp_pa: loss.dp_pa * input.quantity,
      head_loss_m: loss.head_m * input.quantity,
      reference: CV_REF,
      warning,
    };
  }

  // 固定K: entrances
  const entrance = entranceExitData.entrances.find(e => e.id === input.fittingId);
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
      reference: ENTRANCE_EXIT_REF,
    };
  }

  // 固定K: exits
  const exit = entranceExitData.exits.find(e => e.id === input.fittingId);
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
      reference: ENTRANCE_EXIT_REF,
    };
  }

  // Darby 3-K法: fittings
  const fitting = darby3kData.fittings.find(f => f.id === input.fittingId);
  if (!fitting) {
    throw new Error(`Fitting not found: ${input.fittingId}`);
  }

  const id_inch = id_mm / 25.4;
  const k = calcK3K(reynolds, id_inch, fitting.k1, fitting.ki, fitting.kd);
  const loss = calcFittingLoss(k, density, velocity);

  return {
    id: input.fittingId,
    description: fitting.description,
    quantity: input.quantity,
    k_value: k,
    method: '3k' as KValueMethod,
    dp_pa: loss.dp_pa * input.quantity,
    head_loss_m: loss.head_m * input.quantity,
    reference: DARBY_3K_REF,
  };
}
