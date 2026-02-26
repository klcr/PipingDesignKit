import { describe, it, expect } from 'vitest';
import {
  calcSpecificSpeed,
  classifyPumpType,
  calcBEPRecommendation,
  calcPumpSuggestion,
  PumpTypeClassification,
} from '../pumpRequirements';

const classifications: PumpTypeClassification[] = [
  { type: 'radial', ns_min: 0, ns_max: 300, typicalEfficiency_pct: { min: 55, max: 75 }, description: 'Radial', description_ja: 'ラジアル' },
  { type: 'francis', ns_min: 300, ns_max: 600, typicalEfficiency_pct: { min: 60, max: 80 }, description: 'Francis', description_ja: 'フランシス' },
  { type: 'mixed_flow', ns_min: 600, ns_max: 1500, typicalEfficiency_pct: { min: 65, max: 85 }, description: 'Mixed', description_ja: '斜流' },
  { type: 'axial', ns_min: 1500, ns_max: 99999, typicalEfficiency_pct: { min: 70, max: 90 }, description: 'Axial', description_ja: '軸流' },
];

describe('calcSpecificSpeed', () => {
  it('calculates correct specific speed for a standard case', () => {
    // Q=15 m³/h, H=15 m, N=2900 rpm
    // Q_m3min = 15/60 = 0.25
    // Ns = 2900 × √0.25 / 15^0.75
    //    = 2900 × 0.5 / 7.6225...
    //    ≈ 190.2
    const result = calcSpecificSpeed(2900, 15, 15, classifications);
    expect(result.ns).toBeCloseTo(190.2, 0);
    expect(result.pumpType).toBe('radial');
  });

  it('classifies as francis type for medium Ns', () => {
    // Need Ns ≈ 400: try Q=100 m³/h, H=10 m, N=2900 rpm
    // Q_m3min = 100/60 = 1.667
    // Ns = 2900 × √1.667 / 10^0.75
    //    = 2900 × 1.291 / 5.623
    //    ≈ 666  -- too high, mixed_flow
    // Try Q=50, H=20, N=2900
    // Q_m3min = 50/60 = 0.833
    // Ns = 2900 × √0.833 / 20^0.75
    //    = 2900 × 0.9129 / 9.457
    //    ≈ 279.9 -- radial, close
    // Try Q=60, H=15, N=2900
    // Q_m3min = 1.0
    // Ns = 2900 × 1.0 / 15^0.75 = 2900 / 7.622 = 380.4
    const result = calcSpecificSpeed(2900, 60, 15, classifications);
    expect(result.ns).toBeCloseTo(380.4, 0);
    expect(result.pumpType).toBe('francis');
  });

  it('classifies as mixed_flow for higher Ns', () => {
    // Q=200 m³/h, H=5 m, N=1450 rpm
    // Q_m3min = 200/60 = 3.333
    // Ns = 1450 × √3.333 / 5^0.75
    //    = 1450 × 1.826 / 3.344
    //    ≈ 792.0
    const result = calcSpecificSpeed(1450, 200, 5, classifications);
    expect(result.ns).toBeCloseTo(792.0, 0);
    expect(result.pumpType).toBe('mixed_flow');
  });

  it('classifies as axial for very high Ns', () => {
    // Q=1000 m³/h, H=3 m, N=1450 rpm
    // Q_m3min = 1000/60 = 16.6667
    // Ns = 1450 × √16.6667 / 3^0.75
    //    = 1450 × 4.0825 / 2.2795
    //    ≈ 2596.9
    const result = calcSpecificSpeed(1450, 1000, 3, classifications);
    expect(result.ns).toBeCloseTo(2596.9, 0);
    expect(result.pumpType).toBe('axial');
  });

  it('throws for zero or negative inputs', () => {
    expect(() => calcSpecificSpeed(2900, 0, 15, classifications)).toThrow();
    expect(() => calcSpecificSpeed(2900, 15, 0, classifications)).toThrow();
    expect(() => calcSpecificSpeed(0, 15, 15, classifications)).toThrow();
    expect(() => calcSpecificSpeed(2900, -1, 15, classifications)).toThrow();
  });

  it('includes reference information', () => {
    const result = calcSpecificSpeed(2900, 15, 15, classifications);
    expect(result.reference.source).toContain('Pump Handbook');
    expect(result.reference.equation).toContain('Ns');
  });
});

describe('classifyPumpType', () => {
  it('classifies boundary value at ns_max correctly (exclusive upper bound)', () => {
    // ns=300 should be francis (ns_min=300, ns_max=600)
    const result = classifyPumpType(300, classifications);
    expect(result.type).toBe('francis');
  });

  it('classifies ns=0 as radial', () => {
    const result = classifyPumpType(0, classifications);
    expect(result.type).toBe('radial');
  });

  it('classifies ns=1500 as axial', () => {
    const result = classifyPumpType(1500, classifications);
    expect(result.type).toBe('axial');
  });
});

describe('calcBEPRecommendation', () => {
  it('calculates correct BEP flow range', () => {
    const result = calcBEPRecommendation(100);
    expect(result.bepFlowRange.min_m3h).toBeCloseTo(90, 1);
    expect(result.bepFlowRange.max_m3h).toBeCloseTo(110, 1);
  });

  it('calculates correct operating range', () => {
    const result = calcBEPRecommendation(100);
    expect(result.operatingRange.min_m3h).toBeCloseTo(70, 1);
    expect(result.operatingRange.max_m3h).toBeCloseTo(120, 1);
  });

  it('returns zero ranges for zero flow', () => {
    const result = calcBEPRecommendation(0);
    expect(result.bepFlowRange.min_m3h).toBe(0);
    expect(result.bepFlowRange.max_m3h).toBe(0);
    expect(result.operatingRange.min_m3h).toBe(0);
    expect(result.operatingRange.max_m3h).toBe(0);
  });
});

describe('calcPumpSuggestion', () => {
  it('returns comprehensive suggestion for standard pump', () => {
    const result = calcPumpSuggestion(
      { designFlow_m3h: 15, totalHead_m: 15, speed_rpm: 2900 },
      classifications
    );

    expect(result.specificSpeed.ns).toBeGreaterThan(0);
    expect(result.specificSpeed.pumpType).toBe('radial');
    expect(result.bep.bepFlowRange.min_m3h).toBeCloseTo(13.5, 1);
    expect(result.bep.bepFlowRange.max_m3h).toBeCloseTo(16.5, 1);
    expect(result.maxNpshr_m).toBeNull(); // no NPSHa provided
    expect(result.estimatedPower_kW).toBeGreaterThan(0);
    expect(result.references.length).toBeGreaterThan(0);
  });

  it('calculates max NPSHr when NPSHa is provided', () => {
    const result = calcPumpSuggestion(
      { designFlow_m3h: 15, totalHead_m: 15, speed_rpm: 2900, npsha_m: 10 },
      classifications
    );

    expect(result.maxNpshr_m).toBeCloseTo(8.0, 1); // 10 × 0.8
  });

  it('estimates power correctly', () => {
    // P = ρgQH / (η × 1000) [kW]
    // Q = 15/3600 m³/s = 0.004167
    // ρ = 998, g = 9.80665, H = 15
    // η = (55+75)/2/100 = 0.65 for radial
    // P = 998 × 9.80665 × 0.004167 × 15 / (0.65 × 1000)
    //   = 998 × 9.80665 × 0.0625 / 650
    //   ≈ 0.940
    const result = calcPumpSuggestion(
      { designFlow_m3h: 15, totalHead_m: 15, speed_rpm: 2900, density_kg_m3: 998 },
      classifications
    );

    expect(result.estimatedPower_kW).toBeCloseTo(0.940, 1);
  });

  it('uses default density when not provided', () => {
    const withDefault = calcPumpSuggestion(
      { designFlow_m3h: 15, totalHead_m: 15, speed_rpm: 2900 },
      classifications
    );
    const withExplicit = calcPumpSuggestion(
      { designFlow_m3h: 15, totalHead_m: 15, speed_rpm: 2900, density_kg_m3: 998 },
      classifications
    );

    expect(withDefault.estimatedPower_kW).toBeCloseTo(withExplicit.estimatedPower_kW, 3);
  });
});
