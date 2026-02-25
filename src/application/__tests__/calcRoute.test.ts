import { describe, it, expect } from 'vitest';
import { calcRoute } from '../calcRoute';
import { calcMultiSegment } from '../calcMultiSegment';
import { CalcRouteInput, SegmentDefinition } from '../types';
import { PipeSpec, PipeMaterial } from '@domain/types';
import { WaterData } from '@domain/fluid/waterProperties';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';
import { RouteNode, RouteConversionConfig } from '@domain/route/types';

import waterJson from '@data/fluid-properties/water.json';
import craneJson from '@data/fittings-db/crane-tp410.json';
import ftJson from '@data/fittings-db/ft-values.json';

const waterData = waterJson as unknown as WaterData;
const craneData = craneJson as unknown as CraneData;
const ftData = ftJson as unknown as FtData;

const pipe2inch: PipeSpec = {
  standard: 'ASME B36.10M',
  nps: '2',
  dn: 50,
  od_mm: 60.3,
  wall_mm: 3.91,
  id_mm: 52.50,
  schedule: '40',
};

const carbonSteel: PipeMaterial = {
  id: 'carbon_steel_new',
  name: 'Carbon steel (new)',
  roughness_mm: 0.046,
  reference: { source: 'Crane TP-410' },
};

const defaultConfig: RouteConversionConfig = {
  elbowConnection: 'welded',
  use90LongRadius: true,
};

function node(x: number, y: number, z: number, id?: string, additionalFittings: { fittingId: string; quantity: number }[] = []): RouteNode {
  return { id: id ?? `N${x}_${y}_${z}`, position: { x, y, z }, additionalFittings };
}

describe('calcRoute', () => {
  it('L 字ルート → 2 セグメント、dp_total > 0', () => {
    const input: CalcRouteInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      route: {
        nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)],
      },
      pipe: pipe2inch,
      material: carbonSteel,
      conversionConfig: defaultConfig,
    };

    const result = calcRoute(input, waterData, craneData, ftData);
    expect(result.segmentResults).toHaveLength(2);
    expect(result.dp_total).toBeGreaterThan(0);
    expect(result.head_total_m).toBeGreaterThan(0);
  });

  it('直線ルートと calcMultiSegment の結果が一致する', () => {
    // 直線ルート（エルボなし）: 10m の直管
    const routeInput: CalcRouteInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      route: {
        nodes: [node(0, 0, 0), node(10, 0, 0)],
      },
      pipe: pipe2inch,
      material: carbonSteel,
      conversionConfig: defaultConfig,
    };

    const routeResult = calcRoute(routeInput, waterData, craneData, ftData);

    // 同等のマルチセグメント入力
    const seg: SegmentDefinition = {
      pipe: pipe2inch,
      material: carbonSteel,
      length_m: 10,
      elevation_m: 0,
      fittings: [],
    };
    const multiResult = calcMultiSegment(
      { temperature_c: 20, flowRate_m3h: 10, segments: [seg] },
      waterData, craneData, ftData
    );

    expect(routeResult.dp_total).toBeCloseTo(multiResult.dp_total, 4);
    expect(routeResult.head_total_m).toBeCloseTo(multiResult.head_total_m, 4);
  });

  it('L 字ルートと手動エルボ付きマルチセグメントの結果が一致する', () => {
    // L 字ルート: (0,0,0) → (10,0,0) → (10,10,0)
    const routeInput: CalcRouteInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      route: {
        nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)],
      },
      pipe: pipe2inch,
      material: carbonSteel,
      conversionConfig: defaultConfig,
    };

    const routeResult = calcRoute(routeInput, waterData, craneData, ftData);

    // 手動で同じ構成を組む
    const seg1: SegmentDefinition = {
      pipe: pipe2inch,
      material: carbonSteel,
      length_m: 10,
      elevation_m: 0,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 1 }],
    };
    const seg2: SegmentDefinition = {
      pipe: pipe2inch,
      material: carbonSteel,
      length_m: 10,
      elevation_m: 0,
      fittings: [],
    };
    const multiResult = calcMultiSegment(
      { temperature_c: 20, flowRate_m3h: 10, segments: [seg1, seg2] },
      waterData, craneData, ftData
    );

    expect(routeResult.dp_total).toBeCloseTo(multiResult.dp_total, 4);
    expect(routeResult.head_total_m).toBeCloseTo(multiResult.head_total_m, 4);
  });

  it('高低差のあるルートで elevation 圧損が反映される', () => {
    const input: CalcRouteInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      route: {
        nodes: [node(0, 0, 0), node(0, 0, 10), node(10, 0, 10)],
      },
      pipe: pipe2inch,
      material: carbonSteel,
      conversionConfig: defaultConfig,
    };

    const result = calcRoute(input, waterData, craneData, ftData);
    expect(result.dp_elevation_total).toBeGreaterThan(0);
    expect(result.head_elevation_total_m).toBeCloseTo(10, 1);
  });

  it('追加継手がルート計算に反映される', () => {
    // バルブ付きルート
    const inputWithValve: CalcRouteInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      route: {
        nodes: [
          node(0, 0, 0, 'N0', [{ fittingId: 'valve_gate_full', quantity: 1 }]),
          node(10, 0, 0),
        ],
      },
      pipe: pipe2inch,
      material: carbonSteel,
      conversionConfig: defaultConfig,
    };

    // バルブなしルート
    const inputWithout: CalcRouteInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      route: { nodes: [node(0, 0, 0), node(10, 0, 0)] },
      pipe: pipe2inch,
      material: carbonSteel,
      conversionConfig: defaultConfig,
    };

    const withValve = calcRoute(inputWithValve, waterData, craneData, ftData);
    const without = calcRoute(inputWithout, waterData, craneData, ftData);
    expect(withValve.dp_total).toBeGreaterThan(without.dp_total);
  });
});
