import { describe, it, expect } from 'vitest';
import { calcStraightPipeLoss, pressureToHead, headToPressure } from '../straightPipeLoss';
import { GRAVITY } from '../../types';

describe('calcStraightPipeLoss', () => {
  it('should calculate loss for 100m of 4" pipe at 2 m/s', () => {
    // f=0.019, L=100m, D=102.26mm, ρ=998.2, v=2.0
    // ΔP = 0.019 × (100/0.10226) × (998.2 × 4 / 2)
    //     = 0.019 × 977.9 × 1996.4
    //     = 37,093 Pa
    const dp = calcStraightPipeLoss(0.019, 100, 102.26, 998.2, 2.0);
    expect(dp).toBeCloseTo(37093, -2);
  });

  it('should return 0 for zero length', () => {
    const dp = calcStraightPipeLoss(0.019, 0, 102.26, 998.2, 2.0);
    expect(dp).toBe(0);
  });

  it('should return 0 for zero velocity', () => {
    const dp = calcStraightPipeLoss(0.019, 100, 102.26, 998.2, 0);
    expect(dp).toBe(0);
  });
});

describe('pressureToHead / headToPressure', () => {
  it('should convert 9789 Pa to ≈1m head for water at 20°C', () => {
    // h = 9789 / (998.2 × 9.80665) ≈ 1.0 m
    const head = pressureToHead(998.2 * GRAVITY, 998.2);
    expect(head).toBeCloseTo(1.0, 4);
  });

  it('should be inverse operations', () => {
    const head = 5.0;
    const dp = headToPressure(head, 998.2);
    const headBack = pressureToHead(dp, 998.2);
    expect(headBack).toBeCloseTo(head, 6);
  });

  it('should convert 1m head to ≈9789 Pa for water at 20°C', () => {
    const dp = headToPressure(1.0, 998.2);
    expect(dp).toBeCloseTo(998.2 * GRAVITY, 0);
  });
});
