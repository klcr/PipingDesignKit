import { describe, it, expect } from 'vitest';
import { calcSingleSegment } from '../calcSingleSegment';
import { CalcSingleSegmentInput } from '../types';
import { PipeSpec, PipeMaterial, GRAVITY } from '@domain/types';
import { WaterData } from '@domain/fluid/waterProperties';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';

import waterJson from '@data/fluid-properties/water.json';
import craneJson from '@data/fittings-db/crane-tp410.json';
import ftJson from '@data/fittings-db/ft-values.json';

const waterData = waterJson as unknown as WaterData;
const craneData = craneJson as unknown as CraneData;
const ftData = ftJson as unknown as FtData;

// 2" Sch40 ANSI pipe (same as pressureDrop.test.ts)
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

describe('calcSingleSegment', () => {
  it('should calculate with m³/h flow rate (same result as domain with m³/s)', () => {
    const input: CalcSingleSegmentInput = {
      temperature_c: 20,
      pipe: pipe2inch,
      material: carbonSteel,
      flowRate_m3h: 10,       // 10 m³/h
      length_m: 50,
      elevation_m: 5,
      fittings: [
        { fittingId: 'elbow_90_lr_welded', quantity: 4 },
      ],
    };

    const result = calcSingleSegment(input, waterData, craneData, ftData);

    // Flow rate conversion: 10 m³/h → 10/3600 m³/s
    // Velocity: Q/A = (10/3600) / (π/4 × 0.0525²) ≈ 1.283 m/s
    expect(result.velocity_m_s).toBeCloseTo(1.283, 2);

    // Reynolds ≈ 67,100
    expect(result.reynolds).toBeCloseTo(67100, -2);
    expect(result.flowRegime).toBe('turbulent');

    // Total should include friction + fittings + elevation
    expect(result.dp_total).toBeCloseTo(
      result.dp_friction + result.dp_fittings + result.dp_elevation,
      0
    );

    // Elevation ≈ ρgΔz
    expect(result.dp_elevation).toBeCloseTo(998.2 * GRAVITY * 5, -1);

    // Head should be at least the static head
    expect(result.head_total_m).toBeGreaterThan(5);
    expect(result.references.length).toBeGreaterThan(0);
  });

  it('should get fluid properties from temperature', () => {
    const input: CalcSingleSegmentInput = {
      temperature_c: 80,
      pipe: pipe2inch,
      material: carbonSteel,
      flowRate_m3h: 10,
      length_m: 50,
      elevation_m: 0,
      fittings: [],
    };

    const result = calcSingleSegment(input, waterData, craneData, ftData);

    // At 80°C, density is lower (~971 kg/m³) and viscosity much lower
    // So Reynolds is higher → different friction factor
    expect(result.reynolds).toBeGreaterThan(100000);
    expect(result.flowRegime).toBe('turbulent');
  });

  it('should handle zero-length pipe with fittings only', () => {
    const input: CalcSingleSegmentInput = {
      temperature_c: 20,
      pipe: pipe2inch,
      material: carbonSteel,
      flowRate_m3h: 10,
      length_m: 0,
      elevation_m: 0,
      fittings: [
        { fittingId: 'entrance_sharp', quantity: 1 },
        { fittingId: 'exit_all', quantity: 1 },
      ],
    };

    const result = calcSingleSegment(input, waterData, craneData, ftData);

    expect(result.dp_friction).toBe(0);
    expect(result.dp_elevation).toBe(0);
    // Entrance K=0.5 + Exit K=1.0 → combined ≈ 1233 Pa
    expect(result.dp_fittings).toBeGreaterThan(1000);
    expect(result.dp_fittings).toBeLessThan(1500);
  });
});
