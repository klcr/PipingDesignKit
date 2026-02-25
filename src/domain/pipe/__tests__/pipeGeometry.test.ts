import { describe, it, expect } from 'vitest';
import { calcFlowArea, calcVelocity, calcReynolds, classifyFlow } from '../pipeGeometry';

describe('calcFlowArea', () => {
  it('should calculate area for 2" Sch40 (ID=52.50mm)', () => {
    // A = π/4 × (0.0525)² = 0.002165 m²
    const area = calcFlowArea(52.50);
    expect(area).toBeCloseTo(0.002165, 5);
  });

  it('should calculate area for 4" Sch40 (ID=102.26mm)', () => {
    // A = π/4 × (0.10226)² = 0.008213 m²
    const area = calcFlowArea(102.26);
    expect(area).toBeCloseTo(0.008213, 5);
  });
});

describe('calcVelocity', () => {
  it('should calculate velocity for 10 m³/h in 2" Sch40 pipe', () => {
    const area = calcFlowArea(52.50);
    const Q_m3s = 10 / 3600; // 10 m³/h → m³/s
    const v = calcVelocity(Q_m3s, area);
    // v = (10/3600) / 0.002165 ≈ 1.283 m/s
    expect(v).toBeCloseTo(1.283, 2);
  });

  it('should throw for zero area', () => {
    expect(() => calcVelocity(0.001, 0)).toThrow();
  });
});

describe('calcReynolds', () => {
  it('should calculate Re for 2" pipe, 20°C water, v=1.28 m/s', () => {
    // Re = 998.2 × 1.283 × 0.05250 / 0.001002 ≈ 67,100
    const re = calcReynolds(998.2, 1.283, 0.05250, 0.001002);
    expect(re).toBeCloseTo(67100, -2);
  });

  it('should throw for zero viscosity', () => {
    expect(() => calcReynolds(998, 1.0, 0.05, 0)).toThrow();
  });
});

describe('classifyFlow', () => {
  it('should classify Re=1000 as laminar', () => {
    expect(classifyFlow(1000)).toBe('laminar');
  });

  it('should classify Re=2100 as transitional', () => {
    expect(classifyFlow(2100)).toBe('transitional');
  });

  it('should classify Re=3000 as transitional', () => {
    expect(classifyFlow(3000)).toBe('transitional');
  });

  it('should classify Re=4000 as turbulent', () => {
    expect(classifyFlow(4000)).toBe('turbulent');
  });

  it('should classify Re=100000 as turbulent', () => {
    expect(classifyFlow(100000)).toBe('turbulent');
  });
});
