/**
 * マルチセグメント計算ユースケース
 *
 * ユーザー入力 (CalcMultiSegmentInput) を受け取り、
 * 流体物性取得 → SystemInput 組立 → ドメイン計算を実行する。
 *
 * 依存: domain/ のみ（レイヤールール遵守）
 */

import { SystemInput, SystemResult } from '@domain/types';
import { getWaterProperties, WaterData } from '@domain/fluid/waterProperties';
import { calcSystemPressureDrop } from '@domain/system/systemPressureDrop';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';
import { flowRateToM3s } from '@domain/system/unitConversion';
import { CalcMultiSegmentInput } from './types';

/**
 * マルチセグメントの圧損計算を実行する
 *
 * @param input - ユーザー入力（temperature_c, flowRate_m3h は系統レベル）
 * @param waterData - 水物性データ
 * @param craneData - Crane TP-410 継手データ
 * @param ftData - 完全乱流摩擦係数データ
 * @returns SystemResult
 */
export function calcMultiSegment(
  input: CalcMultiSegmentInput,
  waterData: WaterData,
  craneData: CraneData,
  ftData: FtData
): SystemResult {
  // 1. 流体物性を取得（input.fluid 指定時はそれを使用、なければ水物性テーブルから補間）
  const fluid = input.fluid ?? getWaterProperties(input.temperature_c, waterData);

  // 2. 流量変換（系統共通）
  const flowRate_m3s = flowRateToM3s(input.flowRate_m3h, 'm3/h');

  // 3. SystemInput を組み立て
  const systemInput: SystemInput = {
    segments: input.segments.map(seg => ({
      pipe: seg.pipe,
      material: seg.material,
      fluid,
      flowRate_m3s,
      length_m: seg.length_m,
      elevation_m: seg.elevation_m,
      fittings: seg.fittings,
    })),
  };

  // 4. ドメイン計算を実行
  return calcSystemPressureDrop(systemInput, craneData, ftData);
}
