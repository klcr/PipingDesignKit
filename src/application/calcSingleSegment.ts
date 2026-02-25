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
import { CraneData, FtData } from '@domain/fittings/fittingLoss';
import { CalcSingleSegmentInput } from './types';

/**
 * 単セグメントの圧損計算を実行する
 *
 * @param input - ユーザー入力（pipe, material は解決済み）
 * @param waterData - 水物性データ
 * @param craneData - Crane TP-410 継手データ
 * @param ftData - 完全乱流摩擦係数データ
 * @returns SegmentResult
 */
export function calcSingleSegment(
  input: CalcSingleSegmentInput,
  waterData: WaterData,
  craneData: CraneData,
  ftData: FtData
): SegmentResult {
  // 1. 温度から流体物性を取得
  const fluid = getWaterProperties(input.temperature_c, waterData);

  // 2. SegmentInput を組み立て（flowRate_m3h → m3s 変換）
  const segmentInput: SegmentInput = {
    pipe: input.pipe,
    material: input.material,
    fluid,
    flowRate_m3s: input.flowRate_m3h / 3600,
    length_m: input.length_m,
    elevation_m: input.elevation_m,
    fittings: input.fittings,
  };

  // 3. ドメイン計算を実行
  return calcSegmentPressureDrop(segmentInput, craneData, ftData);
}
