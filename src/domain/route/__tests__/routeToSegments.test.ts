import { describe, it, expect } from 'vitest';
import { analyzeRoute, convertRouteToSegments } from '../routeToSegments';
import { PipeRoute, RouteConversionConfig, RouteNode } from '../types';
import { PipeSpec, PipeMaterial, FluidProperties } from '@domain/types';

/** テスト用ヘルパー: 座標からノードを作成 */
function node(x: number, y: number, z: number, id?: string, additionalFittings: { fittingId: string; quantity: number }[] = []): RouteNode {
  return { id: id ?? `N${x}_${y}_${z}`, position: { x, y, z }, additionalFittings };
}

/** テスト用固定値 */
const testPipe: PipeSpec = {
  standard: 'ANSI B36.10M',
  nps: '2',
  dn: 50,
  od_mm: 60.3,
  wall_mm: 3.91,
  id_mm: 52.48,
  schedule: '40',
};

const testMaterial: PipeMaterial = {
  id: 'carbon_steel_new',
  name: 'Carbon Steel (new)',
  roughness_mm: 0.046,
  reference: { source: 'Crane TP-410', page: 'A-23' },
};

const testFluid: FluidProperties = {
  density: 998.2,
  viscosity: 0.001002,
  temperature: 20,
  pressure: 101.325,
  reference: { source: 'IAPWS-IF97' },
};

const testFlowRate = 0.002778; // m³/s (≈ 10 m³/h)

const defaultConfig: RouteConversionConfig = {
  elbowConnection: 'welded',
  use90LongRadius: true,
};

describe('analyzeRoute', () => {
  it('ノード 1 個 → 空の解析結果', () => {
    const route: PipeRoute = { nodes: [node(0, 0, 0)] };
    const result = analyzeRoute(route, defaultConfig);
    expect(result.straightRuns).toHaveLength(0);
    expect(result.detectedElbows).toHaveLength(0);
    expect(result.totalLength_m).toBe(0);
  });

  it('直線ルート → エルボなし', () => {
    const route: PipeRoute = { nodes: [node(0, 0, 0), node(5, 0, 0), node(10, 0, 0)] };
    const result = analyzeRoute(route, defaultConfig);
    expect(result.straightRuns).toHaveLength(2);
    expect(result.detectedElbows).toHaveLength(0);
    expect(result.totalLength_m).toBeCloseTo(10);
    expect(result.elbowCount90).toBe(0);
  });

  it('L 字ルート → 90° エルボ × 1', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)],
    };
    const result = analyzeRoute(route, defaultConfig);
    expect(result.straightRuns).toHaveLength(2);
    expect(result.detectedElbows).toHaveLength(1);
    expect(result.elbowCount90).toBe(1);
    expect(result.totalLength_m).toBeCloseTo(20);
  });

  it('コの字ルート → 90° エルボ × 2', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0), node(0, 10, 0)],
    };
    const result = analyzeRoute(route, defaultConfig);
    expect(result.elbowCount90).toBe(2);
    expect(result.straightRuns).toHaveLength(3);
  });

  it('高低差が正しく集計される', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(0, 0, 5), node(10, 0, 5), node(10, 0, 8)],
    };
    const result = analyzeRoute(route, defaultConfig);
    expect(result.totalElevation_m).toBeCloseTo(8);
  });

  it('warning が収集される', () => {
    // 30° ベンド → 45° に丸められ warning
    const cos30 = Math.cos(30 * Math.PI / 180);
    const sin30 = Math.sin(30 * Math.PI / 180);
    const route: PipeRoute = {
      nodes: [
        node(0, 0, 0),
        node(10, 0, 0),
        node(10 + cos30 * 10, sin30 * 10, 0),
      ],
    };
    const result = analyzeRoute(route, defaultConfig);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('convertRouteToSegments', () => {
  it('直線 → 1 セグメント（エルボなし）', () => {
    const route: PipeRoute = { nodes: [node(0, 0, 0), node(10, 0, 0)] };
    const segments = convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig);
    expect(segments).toHaveLength(1);
    expect(segments[0].length_m).toBeCloseTo(10);
    expect(segments[0].elevation_m).toBeCloseTo(0);
    expect(segments[0].fittings).toHaveLength(0);
  });

  it('L 字 → 2 セグメント、1 番目にエルボ', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)],
    };
    const segments = convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig);
    expect(segments).toHaveLength(2);
    expect(segments[0].length_m).toBeCloseTo(10);
    expect(segments[1].length_m).toBeCloseTo(10);
    // エルボはノード 1 で検出 → セグメント 0 (fromNode=0, toNode=1) に帰属
    expect(segments[0].fittings).toHaveLength(1);
    expect(segments[0].fittings[0].fittingId).toBe('elbow_90_lr_welded');
    expect(segments[1].fittings).toHaveLength(0);
  });

  it('コの字 → 3 セグメント、2 エルボ', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0), node(0, 10, 0)],
    };
    const segments = convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig);
    expect(segments).toHaveLength(3);
    // セグメント 0: エルボ (ノード 1)
    expect(segments[0].fittings.some(f => f.fittingId === 'elbow_90_lr_welded')).toBe(true);
    // セグメント 1: エルボ (ノード 2)
    expect(segments[1].fittings.some(f => f.fittingId === 'elbow_90_lr_welded')).toBe(true);
    // セグメント 2: エルボなし
    expect(segments[2].fittings).toHaveLength(0);
  });

  it('3D ルートで elevation_m が正しい', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(0, 0, 5), node(10, 0, 5)],
    };
    const segments = convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig);
    expect(segments[0].elevation_m).toBeCloseTo(5);
    expect(segments[1].elevation_m).toBeCloseTo(0);
  });

  it('additionalFittings が保持される', () => {
    const route: PipeRoute = {
      nodes: [
        node(0, 0, 0, 'N0', [{ fittingId: 'valve_gate_full', quantity: 1 }]),
        node(10, 0, 0, 'N1'),
        node(10, 10, 0, 'N2', [{ fittingId: 'valve_ball_full', quantity: 1 }]),
      ],
    };
    const segments = convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig);
    // セグメント 0: 始点ノードの gate valve + エルボ
    expect(segments[0].fittings).toHaveLength(2);
    expect(segments[0].fittings[0].fittingId).toBe('valve_gate_full');
    expect(segments[0].fittings[1].fittingId).toBe('elbow_90_lr_welded');
    // セグメント 1: 最終ノードの ball valve
    expect(segments[1].fittings).toHaveLength(1);
    expect(segments[1].fittings[0].fittingId).toBe('valve_ball_full');
  });

  it('pipe/material/fluid が全セグメントに共通適用される', () => {
    const route: PipeRoute = {
      nodes: [node(0, 0, 0), node(10, 0, 0), node(10, 10, 0)],
    };
    const segments = convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig);
    for (const seg of segments) {
      expect(seg.pipe).toBe(testPipe);
      expect(seg.material).toBe(testMaterial);
      expect(seg.fluid).toBe(testFluid);
      expect(seg.flowRate_m3s).toBe(testFlowRate);
    }
  });

  it('ノード 2 未満でエラー', () => {
    const route: PipeRoute = { nodes: [node(0, 0, 0)] };
    expect(() => convertRouteToSegments(route, testPipe, testMaterial, testFluid, testFlowRate, defaultConfig)).toThrow('At least 2 nodes');
  });
});
