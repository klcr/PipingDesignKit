import { describe, it, expect } from 'vitest';
import { calcSegmentPressureDrop } from '../pressureDrop';
import { SegmentInput, PipeSpec, PipeMaterial, FluidProperties, GRAVITY } from '../../types';
import { CraneData, FtData } from '../../fittings/fittingLoss';
import craneJson from '../../../../data/fittings-db/crane-tp410.json';
import ftJson from '../../../../data/fittings-db/ft-values.json';

const craneData = craneJson as unknown as CraneData;
const ftData = ftJson as unknown as FtData;

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

const carbonSteel: PipeMaterial = {
  id: 'carbon_steel_new',
  name: 'Carbon steel (new)',
  roughness_mm: 0.046,
  reference: { source: 'Crane TP-410' },
};

const water20C: FluidProperties = {
  density: 998.2,
  viscosity: 1.002e-3,
  temperature: 20,
  pressure: 2.339,
  reference: { source: 'IAPWS-IF97' },
};

describe('calcSegmentPressureDrop', () => {
  it('should calculate a simple segment: 50m of 2" pipe, 10 m³/h, 4 elbows, 5m elevation', () => {
    const input: SegmentInput = {
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: 10 / 3600, // 10 m³/h
      length_m: 50,
      elevation_m: 5,
      fittings: [
        { fittingId: 'elbow_90_lr_welded', quantity: 4 },
      ],
    };

    const result = calcSegmentPressureDrop(input, craneData, ftData);

    // Step 3: velocity
    // A = π/4 × (0.0525)² = 0.002165 m²
    // v = (10/3600) / 0.002165 = 1.283 m/s
    expect(result.velocity_m_s).toBeCloseTo(1.283, 2);

    // Step 4: Reynolds
    // Re = 998.2 × 1.283 × 0.0525 / 0.001002 ≈ 67,100
    expect(result.reynolds).toBeCloseTo(67100, -2);
    expect(result.flowRegime).toBe('turbulent');

    // Step 5: friction factor ≈ 0.022 (Churchill at this Re and roughness)
    expect(result.frictionFactor).toBeGreaterThan(0.018);
    expect(result.frictionFactor).toBeLessThan(0.028);

    // Step 6: straight pipe loss should be > 0
    expect(result.dp_friction).toBeGreaterThan(0);

    // Step 7: fitting losses (4 × 90° LR elbows)
    expect(result.fittingDetails).toHaveLength(1);
    expect(result.dp_fittings).toBeGreaterThan(0);

    // Step 8: elevation = ρgΔz = 998.2 × 9.80665 × 5 ≈ 48,942 Pa
    expect(result.dp_elevation).toBeCloseTo(998.2 * GRAVITY * 5, -1);

    // Step 9: total should be sum of all components
    expect(result.dp_total).toBeCloseTo(
      result.dp_friction + result.dp_fittings + result.dp_elevation,
      0
    );

    // Head losses should be consistent
    expect(result.head_total_m).toBeGreaterThan(5); // at least the static head
    expect(result.references.length).toBeGreaterThan(0);
  });

  it('should handle zero-length pipe (fittings only)', () => {
    const input: SegmentInput = {
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: 10 / 3600,
      length_m: 0,
      elevation_m: 0,
      fittings: [
        { fittingId: 'entrance_sharp', quantity: 1 },
        { fittingId: 'exit_all', quantity: 1 },
      ],
    };

    const result = calcSegmentPressureDrop(input, craneData, ftData);

    expect(result.dp_friction).toBe(0);
    expect(result.dp_elevation).toBe(0);
    // Entrance K=0.5 + Exit K=1.0 = 1.5
    // ΔP = 1.5 × 998.2 × 1.283² / 2 ≈ 1233 Pa
    expect(result.dp_fittings).toBeGreaterThan(1000);
    expect(result.dp_fittings).toBeLessThan(1500);
  });
});

describe('calcSegmentPressureDrop - unit conversion consistency', () => {
  it('should satisfy ΔP = ρ × g × h for each component', () => {
    const input: SegmentInput = {
      pipe: pipe2inch,
      material: carbonSteel,
      fluid: water20C,
      flowRate_m3s: 10 / 3600,
      length_m: 100,
      elevation_m: 10,
      fittings: [
        { fittingId: 'elbow_90_lr_welded', quantity: 2 },
        { fittingId: 'valve_gate_full', quantity: 1 },
      ],
    };

    const result = calcSegmentPressureDrop(input, craneData, ftData);

    // Head and pressure should be consistent: h = ΔP / (ρg)
    const expectedHeadFriction = result.dp_friction / (water20C.density * GRAVITY);
    expect(result.head_friction_m).toBeCloseTo(expectedHeadFriction, 4);

    const expectedHeadFittings = result.dp_fittings / (water20C.density * GRAVITY);
    expect(result.head_fittings_m).toBeCloseTo(expectedHeadFittings, 4);
  });
});
