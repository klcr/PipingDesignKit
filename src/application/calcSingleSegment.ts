/**
 * 単セグメント計算ユースケース
 *
 * ユーザー入力 (CalcSingleSegmentInput) を受け取り、
 * 流体物性取得 → SegmentInput 組立 → ドメイン計算を実行する。
 *
 * 依存: domain/ のみ（レイヤールール遵守）
 */

import { SegmentInput, SegmentResult } from '@domain/types';
import { getWaterProperties, WaterData } from '@domain/fluid/waterProperties';
import { calcSegmentPressureDrop } from '@domain/system/pressureDrop';
import { Darby3KData, EntranceExitData } from '@domain/fittings/fittingLoss';
import { flowRateToM3s } from '@domain/system/unitConversion';
import { CalcSingleSegmentInput } from './types';

/**
 * 単セグメントの圧損計算を実行する
 *
 * @param input - ユーザー入力（pipe, material は解決済み）
 * @param waterData - 水物性データ
 * @param darby3kData - Darby 3-K 継手データ
 * @param entranceExitData - 入口/出口K値データ
 * @returns SegmentResult
 */
export function calcSingleSegment(
  input: CalcSingleSegmentInput,
  waterData: WaterData,
  darby3kData: Darby3KData,
  entranceExitData: EntranceExitData
): SegmentResult {
  // 1. 流体物性を取得（input.fluid 指定時はそれを使用、なければ水物性テーブルから補間）
  const fluid = input.fluid ?? getWaterProperties(input.temperature_c, waterData);

  // 2. SegmentInput を組み立て（flowRate_m3h → m3s 変換）
  const segmentInput: SegmentInput = {
    pipe: input.pipe,
    material: input.material,
    fluid,
    flowRate_m3s: flowRateToM3s(input.flowRate_m3h, 'm3/h'),
    length_m: input.length_m,
    elevation_m: input.elevation_m,
    fittings: input.fittings,
  };

  // 3. ドメイン計算を実行
  return calcSegmentPressureDrop(segmentInput, darby3kData, entranceExitData);
}
