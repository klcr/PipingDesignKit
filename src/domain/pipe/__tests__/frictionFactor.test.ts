import { describe, it, expect } from 'vitest';
import {
  churchillFrictionFactor,
  swameeJainFrictionFactor,
  calcFtFullyTurbulent,
} from '../frictionFactor';

describe('churchillFrictionFactor', () => {
  it('should return f = 64/Re for laminar flow (Re=1000)', () => {
    // 層流: f = 64/Re = 64/1000 = 0.064
    const result = churchillFrictionFactor(1000, 0.046, 52.5);
    expect(result.f).toBeCloseTo(0.064, 3);
    expect(result.method).toBe('churchill');
  });

  it('should return f ≈ 64/Re for very low Re (Re=100)', () => {
    const result = churchillFrictionFactor(100, 0.046, 52.5);
    expect(result.f).toBeCloseTo(0.64, 1);
  });

  it('should match Moody chart for turbulent flow (Re=1e5, ε/D≈0.001)', () => {
    // 2" Sch40: ID=52.50mm, ε=0.046mm → ε/D≈0.000876
    // Moody chart at Re=1e5, ε/D≈0.001 → f≈0.022
    const result = churchillFrictionFactor(1e5, 0.046, 52.5);
    expect(result.f).toBeCloseTo(0.022, 2);
  });

  it('should approach f_T for very high Re (fully turbulent)', () => {
    const result = churchillFrictionFactor(1e7, 0.046, 52.5);
    const ft = calcFtFullyTurbulent(0.046, 52.5);
    // Should be within 5% of f_T
    expect(result.f).toBeCloseTo(ft.f, 3);
  });

  it('should handle smooth pipe (roughness = 0.001)', () => {
    // Very smooth pipe, high Re
    const result = churchillFrictionFactor(1e6, 0.001, 100);
    expect(result.f).toBeGreaterThan(0);
    expect(result.f).toBeLessThan(0.02);
  });

  it('should throw for Re <= 0', () => {
    expect(() => churchillFrictionFactor(0, 0.046, 52.5)).toThrow();
    expect(() => churchillFrictionFactor(-1, 0.046, 52.5)).toThrow();
  });
});

describe('swameeJainFrictionFactor', () => {
  it('should be close to Churchill for turbulent flow', () => {
    const churchill = churchillFrictionFactor(1e5, 0.046, 52.5);
    const swamee = swameeJainFrictionFactor(1e5, 0.046, 52.5);
    // Should agree within 2%
    expect(swamee.f).toBeCloseTo(churchill.f, 2);
  });
});

describe('calcFtFullyTurbulent', () => {
  it('should match Crane table for 2" pipe (f_T=0.019)', () => {
    // 2" Sch40: ID=52.50mm, ε=0.046mm
    const result = calcFtFullyTurbulent(0.046, 52.50);
    expect(result.f).toBeCloseTo(0.019, 2);
  });

  it('should match Crane table for 4" pipe (f_T=0.017)', () => {
    // 4" Sch40: ID=102.26mm, ε=0.046mm
    const result = calcFtFullyTurbulent(0.046, 102.26);
    expect(result.f).toBeCloseTo(0.017, 2);
  });

  it('should match Crane table for 8" pipe (f_T=0.014)', () => {
    // 8" Sch40: ID=202.72mm, ε=0.046mm
    const result = calcFtFullyTurbulent(0.046, 202.72);
    expect(result.f).toBeCloseTo(0.014, 2);
  });

  it('should throw for zero roughness', () => {
    expect(() => calcFtFullyTurbulent(0, 52.5)).toThrow();
  });
});
