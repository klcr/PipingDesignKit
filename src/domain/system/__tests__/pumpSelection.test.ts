import { describe, it, expect } from 'vitest';
import { calcNPSHa, calcResistanceCurve, findOperatingPoint, PumpCurvePoint } from '../pumpSelection';

describe('calcNPSHa', () => {
  it('calculates NPSHa for standard conditions', () => {
    const npsha = calcNPSHa({
      atmosphericPressure_kPa: 101.325,
      vaporPressure_kPa: 2.339,
      suctionStaticHead_m: 3.0,
      suctionFrictionLoss_m: 1.0,
      density: 998.2,
    });
    // (101.325 - 2.339) * 1000 / (998.2 * 9.80665) + 3.0 - 1.0
    // = 98986 / 9790.72 + 2.0
    // = 10.11 + 2.0 = ~12.11
    expect(npsha).toBeCloseTo(12.11, 1);
  });

  it('returns lower NPSHa when vapor pressure is high', () => {
    const npsha = calcNPSHa({
      atmosphericPressure_kPa: 101.325,
      vaporPressure_kPa: 47.39, // 80°C water
      suctionStaticHead_m: 3.0,
      suctionFrictionLoss_m: 1.0,
      density: 971.8,
    });
    // (101.325 - 47.39) * 1000 / (971.8 * 9.80665) + 2.0
    // = 53935 / 9530.39 + 2.0
    // = 5.66 + 2.0 = ~7.66
    expect(npsha).toBeCloseTo(7.66, 1);
  });
});

describe('calcResistanceCurve', () => {
  it('generates correct number of points', () => {
    const curve = calcResistanceCurve(5.0, 10.0, 15.0, 10, 1.5);
    expect(curve).toHaveLength(11);
  });

  it('starts at static head when flow is zero', () => {
    const curve = calcResistanceCurve(5.0, 10.0, 15.0);
    expect(curve[0].flow_m3h).toBe(0);
    expect(curve[0].head_m).toBe(5.0);
  });

  it('passes through design point', () => {
    const staticHead = 5.0;
    const frictionHead = 10.0;
    const designFlow = 15.0;
    const curve = calcResistanceCurve(staticHead, frictionHead, designFlow, 100, 1.5);

    // Find point closest to design flow
    const designPoint = curve.reduce((closest, p) =>
      Math.abs(p.flow_m3h - designFlow) < Math.abs(closest.flow_m3h - designFlow) ? p : closest
    );
    expect(designPoint.head_m).toBeCloseTo(staticHead + frictionHead, 0);
  });

  it('follows quadratic law (H = Hs + K*Q^2)', () => {
    const curve = calcResistanceCurve(5.0, 10.0, 15.0, 20, 1.5);
    const K = 10.0 / (15.0 * 15.0);
    for (const p of curve) {
      const expected = 5.0 + K * p.flow_m3h * p.flow_m3h;
      expect(p.head_m).toBeCloseTo(expected, 6);
    }
  });
});

describe('findOperatingPoint', () => {
  const samplePumpCurve: PumpCurvePoint[] = [
    { flow_m3h:  0, head_m: 25.0, efficiency_pct:  0, npshr_m: 1.0 },
    { flow_m3h:  6, head_m: 23.5, efficiency_pct: 38, npshr_m: 1.1 },
    { flow_m3h: 12, head_m: 20.0, efficiency_pct: 63, npshr_m: 1.5 },
    { flow_m3h: 18, head_m: 14.5, efficiency_pct: 72, npshr_m: 2.2 },
    { flow_m3h: 24, head_m:  7.0, efficiency_pct: 58, npshr_m: 3.5 },
    { flow_m3h: 27, head_m:  3.0, efficiency_pct: 40, npshr_m: 4.5 },
  ];

  it('finds intersection with resistance curve', () => {
    const resistance = calcResistanceCurve(5.0, 10.0, 15.0, 30, 2.0);
    const op = findOperatingPoint(samplePumpCurve, resistance);

    expect(op).not.toBeNull();
    if (!op) return;

    // Operating point should be somewhere between 12 and 18 m³/h
    expect(op.flow_m3h).toBeGreaterThan(10);
    expect(op.flow_m3h).toBeLessThan(20);
    expect(op.head_m).toBeGreaterThan(10);
    expect(op.head_m).toBeLessThan(22);
    expect(op.efficiency_pct).toBeGreaterThan(0);
  });

  it('returns null when curves do not intersect', () => {
    // Very high static head - no intersection
    const resistance = calcResistanceCurve(30.0, 10.0, 15.0, 20, 1.5);
    const op = findOperatingPoint(samplePumpCurve, resistance);
    expect(op).toBeNull();
  });

  it('interpolates efficiency and NPSHr at operating point', () => {
    const resistance = calcResistanceCurve(5.0, 10.0, 15.0, 30, 2.0);
    const op = findOperatingPoint(samplePumpCurve, resistance);

    expect(op).not.toBeNull();
    if (!op) return;

    expect(op.efficiency_pct).toBeGreaterThan(50);
    expect(op.npshr_m).toBeGreaterThan(1.0);
  });
});
