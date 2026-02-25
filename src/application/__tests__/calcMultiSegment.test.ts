import { describe, it, expect } from 'vitest';
import { calcMultiSegment } from '../calcMultiSegment';
import { calcSingleSegment } from '../calcSingleSegment';
import { CalcMultiSegmentInput, SegmentDefinition } from '../types';
import { PipeSpec, PipeMaterial } from '@domain/types';
import { WaterData } from '@domain/fluid/waterProperties';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';

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
  reference: { source: 'Crane TP-410' },
};

describe('calcMultiSegment', () => {
  it('should produce same result as calcSingleSegment for 1 segment', () => {
    const seg: SegmentDefinition = {
      pipe: pipe2inch,
      material: carbonSteel,
      length_m: 50,
      elevation_m: 5,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 4 }],
    };

    const multiResult = calcMultiSegment(
      { temperature_c: 20, flowRate_m3h: 10, segments: [seg] },
      waterData, craneData, ftData
    );

    const singleResult = calcSingleSegment(
      { temperature_c: 20, pipe: pipe2inch, material: carbonSteel, flowRate_m3h: 10, length_m: 50, elevation_m: 5, fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 4 }] },
      waterData, craneData, ftData
    );

    expect(multiResult.dp_total).toBeCloseTo(singleResult.dp_total, 4);
    expect(multiResult.head_total_m).toBeCloseTo(singleResult.head_total_m, 4);
    expect(multiResult.segmentResults[0].velocity_m_s).toBeCloseTo(singleResult.velocity_m_s, 4);
  });

  it('should correctly sum 2 segments with different pipe sizes', () => {
    const seg1: SegmentDefinition = {
      pipe: pipe2inch,
      material: carbonSteel,
      length_m: 30,
      elevation_m: 3,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 2 }],
    };

    const seg2: SegmentDefinition = {
      pipe: pipe3inch,
      material: carbonSteel,
      length_m: 20,
      elevation_m: 2,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 1 }],
    };

    const input: CalcMultiSegmentInput = {
      temperature_c: 20,
      flowRate_m3h: 10,
      segments: [seg1, seg2],
    };

    const result = calcMultiSegment(input, waterData, craneData, ftData);

    expect(result.segmentResults).toHaveLength(2);

    // Total = sum of individual components
    const sumDp = result.segmentResults[0].dp_total + result.segmentResults[1].dp_total;
    expect(result.dp_total).toBeCloseTo(sumDp, 4);

    // Different pipe sizes → different velocities
    expect(result.segmentResults[0].velocity_m_s).toBeGreaterThan(
      result.segmentResults[1].velocity_m_s
    );
  });

  it('should resolve fluid properties from temperature', () => {
    const seg: SegmentDefinition = {
      pipe: pipe2inch,
      material: carbonSteel,
      length_m: 50,
      elevation_m: 0,
      fittings: [],
    };

    const result80C = calcMultiSegment(
      { temperature_c: 80, flowRate_m3h: 10, segments: [seg] },
      waterData, craneData, ftData
    );

    // At 80°C, viscosity is much lower → higher Reynolds number
    expect(result80C.segmentResults[0].reynolds).toBeGreaterThan(100000);
    expect(result80C.segmentResults[0].flowRegime).toBe('turbulent');
  });
});
