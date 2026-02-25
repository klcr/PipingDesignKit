/**
 * 系統圧損計算 — 10ステップパイプライン
 *
 * Step 1: 流体物性（密度、粘度）
 * Step 2: 配管ジオメトリ（内径、流路面積）
 * Step 3: 流速 V = Q/A
 * Step 4: レイノルズ数 Re = ρVD/μ
 * Step 5: 摩擦係数 f（Churchill式）
 * Step 6: 直管圧損 ΔP = f(L/D)(ρV²/2)
 * Step 7: 継手圧損 ΔP = ΣK(ρV²/2)
 * Step 8: 高低差 ΔP = ρgΔz
 * Step 9: 合計
 * Step 10: 出力（圧力・水頭変換）
 */

import { SegmentInput, SegmentResult, Reference } from '../types';
import { calcFlowArea, calcVelocity, calcReynolds, classifyFlow } from '../pipe/pipeGeometry';
import { churchillFrictionFactor, calcFtFullyTurbulent } from '../pipe/frictionFactor';
import { calcStraightPipeLoss, pressureToHead } from '../pipe/straightPipeLoss';
import { resolveFittings, CraneData, FtData } from '../fittings/fittingLoss';
import { calcElevationLoss } from './headLoss';

/**
 * 区間ごとの圧損を計算する
 */
export function calcSegmentPressureDrop(
  input: SegmentInput,
  craneData: CraneData,
  ftData: FtData
): SegmentResult {
  const { pipe, material, fluid, flowRate_m3s, length_m, elevation_m, fittings } = input;

  // Step 2: ジオメトリ
  const area = calcFlowArea(pipe.id_mm);

  // Step 3: 流速
  const velocity = calcVelocity(flowRate_m3s, area);

  // Step 4: レイノルズ数
  const id_m = pipe.id_mm / 1000;
  const reynolds = calcReynolds(fluid.density, velocity, id_m, fluid.viscosity);
  const flowRegime = classifyFlow(reynolds);

  // Step 5: 摩擦係数（Churchill式）
  const frictionResult = churchillFrictionFactor(reynolds, material.roughness_mm, pipe.id_mm);
  const f = frictionResult.f;

  // f_T: 継手K値計算用（完全乱流摩擦係数）
  // NPS が ft-values.json にあればそれを使い、なければ Von Kármán で計算
  const nps = pipe.nps;
  const ftValue = ftData.values[nps] ?? calcFtFullyTurbulent(material.roughness_mm, pipe.id_mm).f;

  // Step 6: 直管圧損
  const dp_friction = calcStraightPipeLoss(f, length_m, pipe.id_mm, fluid.density, velocity);

  // Step 7: 継手圧損
  const fittingDetails = resolveFittings(
    fittings,
    craneData,
    ftValue,
    pipe.id_mm,
    fluid.density,
    velocity
  );
  const dp_fittings = fittingDetails.reduce((sum, fd) => sum + fd.dp_pa, 0);

  // Step 8: 高低差
  const dp_elevation = calcElevationLoss(fluid.density, elevation_m);

  // Step 9: 合計
  const dp_total = dp_friction + dp_fittings + dp_elevation;

  // Step 10: 水頭変換
  const head_friction = pressureToHead(dp_friction, fluid.density);
  const head_fittings = pressureToHead(dp_fittings, fluid.density);
  const head_elevation = elevation_m;
  const head_total = pressureToHead(dp_total, fluid.density);

  // 出典集約
  const references: Reference[] = [
    frictionResult.reference,
    fluid.reference,
    material.reference,
    ...fittingDetails.map(fd => fd.reference),
  ];

  return {
    velocity_m_s: velocity,
    reynolds,
    flowRegime,
    frictionFactor: f,
    frictionFactorMethod: frictionResult.method,

    dp_friction,
    dp_fittings,
    dp_elevation,
    dp_total,

    head_friction_m: head_friction,
    head_fittings_m: head_fittings,
    head_elevation_m: head_elevation,
    head_total_m: head_total,

    fittingDetails,
    references,
  };
}
