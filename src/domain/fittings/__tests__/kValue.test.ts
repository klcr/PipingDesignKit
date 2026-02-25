import { describe, it, expect } from 'vitest';
import { calcKCrane, calcK3K, calcKFromCv, calcFittingLoss, calcTotalFittingLoss } from '../kValue';

describe('calcKCrane', () => {
  it('should calculate K for 90° LR elbow (L/D=14, f_T=0.019)', () => {
    // K = 0.019 × 14 = 0.266
    expect(calcKCrane(14, 0.019)).toBeCloseTo(0.266, 3);
  });

  it('should calculate K for gate valve full open (L/D=8, f_T=0.017)', () => {
    // K = 0.017 × 8 = 0.136
    expect(calcKCrane(8, 0.017)).toBeCloseTo(0.136, 3);
  });

  it('should calculate K for globe valve (L/D=340, f_T=0.019)', () => {
    // K = 0.019 × 340 = 6.46
    expect(calcKCrane(340, 0.019)).toBeCloseTo(6.46, 1);
  });
});

describe('calcK3K', () => {
  it('should calculate 3-K value for 90° standard elbow in 2" pipe at Re=1e5', () => {
    // K = 800/100000 + 0.14 × (1 + 4.0/2^0.3)
    // 2^0.3 = 1.2311
    // K = 0.008 + 0.14 × (1 + 3.2486) = 0.008 + 0.14 × 4.2486 = 0.008 + 0.5948 = 0.6028
    const k = calcK3K(1e5, 2.0, 800, 0.14, 4.0);
    expect(k).toBeCloseTo(0.603, 2);
  });

  it('should show Reynolds dependence at low Re', () => {
    const kHighRe = calcK3K(1e6, 2.0, 800, 0.14, 4.0);
    const kLowRe = calcK3K(1e3, 2.0, 800, 0.14, 4.0);
    // Low Re should give higher K due to K₁/Re term
    expect(kLowRe).toBeGreaterThan(kHighRe);
  });
});

describe('calcKFromCv', () => {
  it('should convert Cv=100 to K for 2" Sch40 pipe (ID=52.50mm)', () => {
    // d_inch = 52.50/25.4 = 2.0669"
    // K = 894 × 2.0669⁴ / 100² = 894 × 18.26 / 10000 = 1.633
    const k = calcKFromCv(100, 52.50);
    expect(k).toBeCloseTo(1.633, 1);
  });

  it('should give larger K for smaller Cv', () => {
    const k50 = calcKFromCv(50, 52.50);
    const k100 = calcKFromCv(100, 52.50);
    expect(k50).toBeGreaterThan(k100);
    // K ∝ 1/Cv² so k50 should be ~4× k100
    expect(k50 / k100).toBeCloseTo(4, 0);
  });

  it('should throw for Cv <= 0', () => {
    expect(() => calcKFromCv(0, 52.50)).toThrow();
    expect(() => calcKFromCv(-1, 52.50)).toThrow();
  });
});

describe('calcFittingLoss', () => {
  it('should calculate loss for K=0.266 at 2 m/s, water at 20°C', () => {
    // ΔP = 0.266 × 998.2 × 4 / 2 = 531.0 Pa
    // h = 0.266 × 4 / (2 × 9.80665) = 0.0543 m
    const result = calcFittingLoss(0.266, 998.2, 2.0);
    expect(result.dp_pa).toBeCloseTo(531, 0);
    expect(result.head_m).toBeCloseTo(0.0543, 3);
  });
});

describe('calcTotalFittingLoss', () => {
  it('should sum K values for multiple fittings', () => {
    const fittings = [
      { k: 0.266, quantity: 4 },  // 4 × 90° LR elbow
      { k: 0.136, quantity: 1 },  // 1 × gate valve
    ];
    const result = calcTotalFittingLoss(fittings, 998.2, 2.0);
    // totalK = 4×0.266 + 1×0.136 = 1.064 + 0.136 = 1.200
    expect(result.totalK).toBeCloseTo(1.200, 3);
    // ΔP = 1.200 × 998.2 × 4 / 2 = 2395.7 Pa
    expect(result.dp_pa).toBeCloseTo(2396, 0);
  });
});
