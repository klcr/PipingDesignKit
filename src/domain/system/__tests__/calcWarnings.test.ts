import { describe, it, expect } from 'vitest';
import { generateSegmentWarnings, WarningCheckParams } from '../calcWarnings';
import type { FittingResult } from '../../types';

/** Helper: 正常条件（警告が出ない）のベースパラメータ */
function baseParams(overrides?: Partial<WarningCheckParams>): WarningCheckParams {
  return {
    reynolds: 100_000,
    flowRegime: 'turbulent',
    velocity_m_s: 2.0,
    roughness_mm: 0.015,
    id_mm: 52.5,        // 2" Sch40
    fittingDetails: [],
    elevation_m: 5,
    frictionFactor: 0.018,
    length_m: 50,
    ...overrides,
  };
}

function makeFitting(overrides?: Partial<FittingResult>): FittingResult {
  return {
    id: 'elbow_90_lr_welded',
    description: '90° LR elbow',
    quantity: 1,
    k_value: 0.2,
    method: '3k',
    dp_pa: 100,
    head_loss_m: 0.01,
    reference: { source: 'Darby (2001)' },
    ...overrides,
  };
}

describe('generateSegmentWarnings', () => {
  it('returns empty array for normal turbulent conditions', () => {
    const warnings = generateSegmentWarnings(baseParams());
    expect(warnings).toHaveLength(0);
  });

  // 1. 極低Re
  it('warns on very low Reynolds number (Re < 100)', () => {
    const warnings = generateSegmentWarnings(baseParams({
      reynolds: 50,
      flowRegime: 'laminar',
    }));
    const w = warnings.find(w => w.messageKey === 'warn.very_low_reynolds');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('caution');
    expect(w!.messageParams?.re).toBe(50);
  });

  // 2. 遷移域
  it('warns on transitional flow (Re 2100-4000)', () => {
    const warnings = generateSegmentWarnings(baseParams({
      reynolds: 3000,
      flowRegime: 'transitional',
    }));
    const w = warnings.find(w => w.messageKey === 'warn.transitional_flow');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('warning');
    expect(w!.messageParams?.re).toBe(3000);
  });

  // 3. 高流速
  it('warns on high velocity (> 3 m/s)', () => {
    const warnings = generateSegmentWarnings(baseParams({
      velocity_m_s: 4.5,
    }));
    const w = warnings.find(w => w.messageKey === 'warn.high_velocity');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('warning');
    expect(w!.messageParams?.v).toBe(4.5);
  });

  it('does not warn at exactly 3 m/s', () => {
    const warnings = generateSegmentWarnings(baseParams({
      velocity_m_s: 3.0,
    }));
    expect(warnings.find(w => w.messageKey === 'warn.high_velocity')).toBeUndefined();
  });

  // 4. 低流速
  it('warns on low velocity (< 0.5 m/s)', () => {
    const warnings = generateSegmentWarnings(baseParams({
      velocity_m_s: 0.3,
    }));
    const w = warnings.find(w => w.messageKey === 'warn.low_velocity');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('info');
  });

  // 5. 高相対粗度
  it('warns on high relative roughness (ε/D > 0.001)', () => {
    // DN15 (ID ≈ 16mm) with roughness 0.045 mm → ε/D ≈ 0.0028
    const warnings = generateSegmentWarnings(baseParams({
      roughness_mm: 0.045,
      id_mm: 16,
    }));
    const w = warnings.find(w => w.messageKey === 'warn.high_relative_roughness');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('info');
    expect(w!.category).toBe('friction');
  });

  it('does not warn on low relative roughness', () => {
    // 2" pipe (52.5mm) with 0.015mm → ε/D ≈ 0.000286
    const warnings = generateSegmentWarnings(baseParams());
    expect(warnings.find(w => w.messageKey === 'warn.high_relative_roughness')).toBeUndefined();
  });

  // 6. 3-K法の口径範囲外
  it('warns when pipe is too small for 3-K method', () => {
    // 0.25" pipe (6.35mm) with 3K fittings
    const warnings = generateSegmentWarnings(baseParams({
      id_mm: 6.35,
      fittingDetails: [makeFitting({ method: '3k' })],
    }));
    const w = warnings.find(w => w.messageKey === 'warn.3k_diameter_range');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('warning');
  });

  it('warns when pipe is too large for 3-K method', () => {
    // 30" pipe (762mm) with 3K fittings
    const warnings = generateSegmentWarnings(baseParams({
      id_mm: 762,
      fittingDetails: [makeFitting({ method: '3k' })],
    }));
    const w = warnings.find(w => w.messageKey === 'warn.3k_diameter_range');
    expect(w).toBeDefined();
  });

  it('does not warn on 3-K range when no 3K fittings present', () => {
    const warnings = generateSegmentWarnings(baseParams({
      id_mm: 6.35,
      fittingDetails: [makeFitting({ method: 'fixed_k' })],
    }));
    expect(warnings.find(w => w.messageKey === 'warn.3k_diameter_range')).toBeUndefined();
  });

  // 7. 継手損失が支配的
  it('warns when fittings dominate over straight-pipe losses', () => {
    // fL/D = 0.018 * (50 / 0.0525) ≈ 17.1
    // ΣK = 10 * 2 = 20 > 17.1
    const warnings = generateSegmentWarnings(baseParams({
      fittingDetails: [makeFitting({ k_value: 2, quantity: 10 })],
    }));
    const w = warnings.find(w => w.messageKey === 'warn.fittings_dominant');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('info');
  });

  it('does not warn when straight-pipe losses dominate', () => {
    // fL/D ≈ 17.1, ΣK = 2 * 0.2 = 0.4
    const warnings = generateSegmentWarnings(baseParams({
      fittingDetails: [makeFitting({ k_value: 0.2, quantity: 2 })],
    }));
    expect(warnings.find(w => w.messageKey === 'warn.fittings_dominant')).toBeUndefined();
  });

  // 8. 高揚程
  it('warns on large elevation change (|Δz| > 30m)', () => {
    const warnings = generateSegmentWarnings(baseParams({
      elevation_m: 50,
    }));
    const w = warnings.find(w => w.messageKey === 'warn.large_elevation');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('info');
    expect(w!.category).toBe('elevation');
  });

  it('warns on large negative elevation too', () => {
    const warnings = generateSegmentWarnings(baseParams({
      elevation_m: -35,
    }));
    expect(warnings.find(w => w.messageKey === 'warn.large_elevation')).toBeDefined();
  });

  it('does not warn on moderate elevation', () => {
    const warnings = generateSegmentWarnings(baseParams({
      elevation_m: 15,
    }));
    expect(warnings.find(w => w.messageKey === 'warn.large_elevation')).toBeUndefined();
  });

  // Multiple warnings at once
  it('can return multiple warnings simultaneously', () => {
    const warnings = generateSegmentWarnings(baseParams({
      reynolds: 3000,
      flowRegime: 'transitional',
      velocity_m_s: 0.3,
      elevation_m: 50,
    }));
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    const keys = warnings.map(w => w.messageKey);
    expect(keys).toContain('warn.transitional_flow');
    expect(keys).toContain('warn.low_velocity');
    expect(keys).toContain('warn.large_elevation');
  });
});
