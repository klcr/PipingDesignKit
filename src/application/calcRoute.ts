/**
 * ルート計算ユースケース
 *
 * ユーザー入力 (CalcRouteInput) を受け取り、
 * 流体物性取得 → ルート → セグメント変換 → ドメイン計算を実行する。
 *
 * 依存: domain/ のみ（レイヤールール遵守）
 */

import { SystemResult } from '@domain/types';
import { getWaterProperties, WaterData } from '@domain/fluid/waterProperties';
import { calcSystemPressureDrop } from '@domain/system/systemPressureDrop';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';
import { flowRateToM3s } from '@domain/system/unitConversion';
import { convertRouteToSegments } from '@domain/route/routeToSegments';
import { CalcRouteInput } from './types';

/**
 * ルートの圧損計算を実行する
 *
 * @param input - ユーザー入力（route, pipe, material はルート全体で共通）
 * @param waterData - 水物性データ
 * @param craneData - Crane TP-410 継手データ
 * @param ftData - 完全乱流摩擦係数データ
 * @returns SystemResult
 */
export function calcRoute(
  input: CalcRouteInput,
  waterData: WaterData,
  craneData: CraneData,
  ftData: FtData
): SystemResult {
  // 1. 流体物性を取得（input.fluid 指定時はそれを使用、なければ水物性テーブルから補間）
  const fluid = input.fluid ?? getWaterProperties(input.temperature_c, waterData);

  // 2. 流量変換
  const flowRate_m3s = flowRateToM3s(input.flowRate_m3h, 'm3/h');

  // 3. ルートからセグメントへ変換
  const segments = convertRouteToSegments(
    input.route,
    input.pipe,
    input.material,
    fluid,
    flowRate_m3s,
    input.conversionConfig
  );

  // 4. ドメイン計算を実行
  return calcSystemPressureDrop({ segments }, craneData, ftData);
}
