import { describe, it, expect } from 'vitest';
import { calcSegmentPressureDrop } from '../pressureDrop';
import { SegmentInput, PipeSpec, PipeMaterial, FluidProperties, GRAVITY } from '../../types';
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

    const result = calcSegmentPressureDrop(input, darby3kData, entranceExitData);

    expect(result.velocity_m_s).toBeCloseTo(1.283, 2);
    expect(result.reynolds).toBeCloseTo(67100, -2);
    expect(result.flowRegime).toBe('turbulent');
    expect(result.frictionFactor).toBeGreaterThan(0.018);
    expect(result.frictionFactor).toBeLessThan(0.028);
    expect(result.dp_friction).toBeGreaterThan(0);
    expect(result.fittingDetails).toHaveLength(1);
    expect(result.dp_fittings).toBeGreaterThan(0);
    expect(result.dp_elevation).toBeCloseTo(998.2 * GRAVITY * 5, -1);
    expect(result.dp_total).toBeCloseTo(
      result.dp_friction + result.dp_fittings + result.dp_elevation,
      0
    );
    expect(result.head_total_m).toBeGreaterThan(5);
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

    const result = calcSegmentPressureDrop(input, darby3kData, entranceExitData);

    expect(result.dp_friction).toBe(0);
    expect(result.dp_elevation).toBe(0);
    // Entrance K=0.5 + Exit K=1.0 = 1.5
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

    const result = calcSegmentPressureDrop(input, darby3kData, entranceExitData);

    const expectedHeadFriction = result.dp_friction / (water20C.density * GRAVITY);
    expect(result.head_friction_m).toBeCloseTo(expectedHeadFriction, 4);

    const expectedHeadFittings = result.dp_fittings / (water20C.density * GRAVITY);
    expect(result.head_fittings_m).toBeCloseTo(expectedHeadFittings, 4);
  });
});
