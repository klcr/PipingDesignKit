import { describe, it, expect } from 'vitest';
import { calcSystemPressureDrop } from '../systemPressureDrop';
import { calcSegmentPressureDrop } from '../pressureDrop';
import { SegmentInput, SystemInput, PipeSpec, PipeMaterial, FluidProperties, GRAVITY } from '../../types';
import { Darby3KData, EntranceExitData } from '../../fittings/fittingLoss';
import darby3kJson from '../../../../data/fittings-db/darby-3k.json';
import entranceExitJson from '../../../../data/fittings-db/entrance-exit-k.json';

const darby3kData = darby3kJson as unknown as Darby3KData;
const entranceExitData = entranceExitJson as unknown as EntranceExitData;

// 2" Sch40 ANSI pipe
const pipe2inch: PipeSpec = {
  standard: 'ASME B36.10M',
  nps: '2',
  dn: 50,
  od_mm: 60.3,
  wall_mm: 3.91,
  id_mm: 52.50,
  schedule: '40',
};

// 3" Sch40 ANSI pipe
const pipe3inch: PipeSpec = {
  standard: 'ASME B36.10M',
  nps: '3',
  dn: 80,
  od_mm: 88.9,
  wall_mm: 5.49,
  id_mm: 77.93,
  schedule: '40',
};

const carbonSteel: PipeMaterial = {
  id: 'carbon_steel_new',
  name: 'Carbon steel (new)',
  roughness_mm: 0.046,
  reference: { source: 'Moody, 1944' },
};


const water20C: FluidProperties = {
  density: 998.2,
  viscosity: 1.002e-3,
  temperature: 20,
  pressure: 2.339,
  reference: { source: 'IAPWS-IF97' },
};

const flowRate = 10 / 3600; // 10 m³/h → m³/s

describe('calcSystemPressureDrop', () => {
  it('should return zeros for empty segment array', () => {
    const input: SystemInput = { segments: [] };
    const result = calcSystemPressureDrop(input, darby3kData, entranceExitData);

    expect(result.segmentResults).toHaveLength(0);
    expect(result.dp_total).toBe(0);
    expect(result.head_total_m).toBe(0);
    expect(result.references).toHaveLength(0);
  });

  it('single segment should match calcSegmentPressureDrop', () => {
    const segment: SegmentInput = {
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: flowRate,
      length_m: 50,
      elevation_m: 5,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 4 }],
    };

    const directResult = calcSegmentPressureDrop(segment, darby3kData, entranceExitData);

    const systemInput: SystemInput = { segments: [segment] };
    const systemResult = calcSystemPressureDrop(systemInput, darby3kData, entranceExitData);

    expect(systemResult.segmentResults).toHaveLength(1);
    expect(systemResult.dp_friction_total).toBeCloseTo(directResult.dp_friction, 4);
    expect(systemResult.dp_fittings_total).toBeCloseTo(directResult.dp_fittings, 4);
    expect(systemResult.dp_elevation_total).toBeCloseTo(directResult.dp_elevation, 4);
    expect(systemResult.dp_total).toBeCloseTo(directResult.dp_total, 4);
    expect(systemResult.head_total_m).toBeCloseTo(directResult.head_total_m, 4);
  });

  it('two segments with different pipe sizes: totals equal sum of segments', () => {
    const seg1: SegmentInput = {
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: flowRate,
      length_m: 30,
      elevation_m: 3,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 2 }],
    };

    const seg2: SegmentInput = {
      pipe: pipe3inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: flowRate,
      length_m: 20,
      elevation_m: 2,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 3 }],
    };

    const systemInput: SystemInput = { segments: [seg1, seg2] };
    const result = calcSystemPressureDrop(systemInput, darby3kData, entranceExitData);

    expect(result.segmentResults).toHaveLength(2);

    expect(result.segmentResults[0].velocity_m_s).not.toBeCloseTo(
      result.segmentResults[1].velocity_m_s, 1
    );

    const sumFriction = result.segmentResults[0].dp_friction + result.segmentResults[1].dp_friction;
    const sumFittings = result.segmentResults[0].dp_fittings + result.segmentResults[1].dp_fittings;
    const sumElevation = result.segmentResults[0].dp_elevation + result.segmentResults[1].dp_elevation;

    expect(result.dp_friction_total).toBeCloseTo(sumFriction, 4);
    expect(result.dp_fittings_total).toBeCloseTo(sumFittings, 4);
    expect(result.dp_elevation_total).toBeCloseTo(sumElevation, 4);
    expect(result.dp_total).toBeCloseTo(sumFriction + sumFittings + sumElevation, 4);
  });

  it('three segments with mixed elevation sum correctly', () => {
    const makeSeg = (elevation_m: number): SegmentInput => ({
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: flowRate,
      length_m: 10,
      elevation_m,
      fittings: [],
    });

    const systemInput: SystemInput = {
      segments: [makeSeg(0), makeSeg(5), makeSeg(-2)],
    };
    const result = calcSystemPressureDrop(systemInput, darby3kData, entranceExitData);

    expect(result.segmentResults).toHaveLength(3);

    const netElevation = 0 + 5 + (-2);
    expect(result.dp_elevation_total).toBeCloseTo(water20C.density * GRAVITY * netElevation, -1);
    expect(result.head_elevation_total_m).toBeCloseTo(netElevation, 4);
  });

  it('should deduplicate references across segments', () => {
    const seg1: SegmentInput = {
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: flowRate,
      length_m: 10,
      elevation_m: 0,
      fittings: [],
    };

    const seg2: SegmentInput = { ...seg1, length_m: 20 };

    const systemInput: SystemInput = { segments: [seg1, seg2] };
    const result = calcSystemPressureDrop(systemInput, darby3kData, entranceExitData);

    const sources = result.references.map(r => r.source);
    const uniqueSources = [...new Set(sources)];
    expect(sources.length).toBe(uniqueSources.length);
  });
});
