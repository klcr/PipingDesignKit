/**
 * ポンプ選定補助 — TDH計算・抵抗曲線・運転点算出・NPSHa計算
 *
 * 外部ライブラリ依存なし（domain/ レイヤールール遵守）
 */

import { GRAVITY } from '../types';
import { linearInterpolate, TablePoint } from '../fluid/interpolate';

// ── ポンプカーブ型 ──

export interface PumpCurvePoint {
  readonly flow_m3h: number;
  readonly head_m: number;
  readonly efficiency_pct: number;
  readonly npshr_m: number;
}

// ── 抵抗曲線型 ──

export interface ResistanceCurvePoint {
  readonly flow_m3h: number;
  readonly head_m: number;
}

// ── 運転点 ──

export interface OperatingPoint {
  readonly flow_m3h: number;
  readonly head_m: number;
  readonly efficiency_pct: number;
  readonly npshr_m: number;
}

// ── NPSHa ──

export interface NPSHaInput {
  readonly atmosphericPressure_kPa: number;
  readonly vaporPressure_kPa: number;
  readonly suctionStaticHead_m: number;
  readonly suctionFrictionLoss_m: number;
  readonly density: number; // kg/m³
}

/**
 * NPSHa（有効NPSH）を計算する
 *
 * NPSHa = (Pa - Pv) / (ρg) + hs - hf
 *   Pa: 大気圧 [kPa]
 *   Pv: 流体の蒸気圧 [kPa]
 *   hs: 吸込み実揚程 [m] (正=ポンプ下方に液面)
 *   hf: 吸込み側摩擦損失 [m]
 */
export function calcNPSHa(input: NPSHaInput): number {
  const { atmosphericPressure_kPa, vaporPressure_kPa, suctionStaticHead_m, suctionFrictionLoss_m, density } = input;
  return ((atmosphericPressure_kPa - vaporPressure_kPa) * 1000) / (density * GRAVITY)
    + suctionStaticHead_m
    - suctionFrictionLoss_m;
}

/**
 * 配管抵抗曲線を生成する
 *
 * 抵抗曲線: H = H_static + K * Q²
 * K は設計流量と設計摩擦損失水頭から逆算する
 *
 * @param staticHead_m - 実揚程（高低差）[m]
 * @param frictionHead_m - 設計流量における摩擦損失水頭 [m]
 * @param designFlow_m3h - 設計流量 [m³/h]
 * @param numPoints - 曲線のポイント数
 * @param maxFlowRatio - 設計流量に対する最大流量比
 */
export function calcResistanceCurve(
  staticHead_m: number,
  frictionHead_m: number,
  designFlow_m3h: number,
  numPoints: number = 20,
  maxFlowRatio: number = 1.5
): ResistanceCurvePoint[] {
  if (designFlow_m3h <= 0) {
    return [{ flow_m3h: 0, head_m: staticHead_m }];
  }

  // K = frictionHead / Q^2
  const K = frictionHead_m / (designFlow_m3h * designFlow_m3h);
  const maxFlow = designFlow_m3h * maxFlowRatio;
  const points: ResistanceCurvePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const flow = (maxFlow * i) / numPoints;
    const head = staticHead_m + K * flow * flow;
    points.push({ flow_m3h: flow, head_m: head });
  }

  return points;
}

/**
 * ポンプカーブと抵抗曲線の交点（運転点）を求める
 *
 * 線形補間で交差点を探索する。
 * 交点が見つからない場合は null を返す。
 */
export function findOperatingPoint(
  pumpCurve: readonly PumpCurvePoint[],
  resistanceCurve: readonly ResistanceCurvePoint[]
): OperatingPoint | null {
  if (pumpCurve.length < 2 || resistanceCurve.length < 2) return null;

  // 抵抗曲線を補間テーブルに変換
  const resistanceTable: TablePoint[] = resistanceCurve.map(p => ({
    x: p.flow_m3h,
    y: p.head_m,
  }));

  // ポンプ曲線上の各区間で交差を探す
  for (let i = 0; i < pumpCurve.length - 1; i++) {
    const q1 = pumpCurve[i].flow_m3h;
    const q2 = pumpCurve[i + 1].flow_m3h;
    const hp1 = pumpCurve[i].head_m;
    const hp2 = pumpCurve[i + 1].head_m;

    // 抵抗曲線の対応する揚程を取得
    let hr1: number;
    let hr2: number;
    try {
      hr1 = linearInterpolate(q1, resistanceTable);
      hr2 = linearInterpolate(q2, resistanceTable);
    } catch {
      continue; // 抵抗曲線の範囲外
    }

    // diff = pump_head - resistance_head
    const diff1 = hp1 - hr1;
    const diff2 = hp2 - hr2;

    // 符号が変わる = 交差
    if (diff1 * diff2 <= 0) {
      // 線形補間で交差点の流量を求める
      const t = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2));
      const opFlow = q1 + t * (q2 - q1);
      const opHead = hp1 + t * (hp2 - hp1);

      // 効率とNPSHrを補間
      const effTable: TablePoint[] = pumpCurve.map(p => ({ x: p.flow_m3h, y: p.efficiency_pct }));
      const npshrTable: TablePoint[] = pumpCurve.map(p => ({ x: p.flow_m3h, y: p.npshr_m }));

      let efficiency: number;
      let npshr: number;
      try {
        efficiency = linearInterpolate(opFlow, effTable);
        npshr = linearInterpolate(opFlow, npshrTable);
      } catch {
        efficiency = pumpCurve[i].efficiency_pct;
        npshr = pumpCurve[i].npshr_m;
      }

      return {
        flow_m3h: opFlow,
        head_m: opHead,
        efficiency_pct: efficiency,
        npshr_m: npshr,
      };
    }
  }

  return null;
}
