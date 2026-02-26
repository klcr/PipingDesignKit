import { describe, it, expect } from 'vitest';
import { melinderDensity, melinderViscosity } from '../melinderGlycol';
import melinderEgJson from '@data/fluid-properties/melinder-eg-water.json';
import melinderPgJson from '@data/fluid-properties/melinder-pg-water.json';

const eg = melinderEgJson;
const pg = melinderPgJson;

describe('Melinder EG-Water density', () => {
  it('returns ~997 kg/m³ at 0 wt%, 20°C (near pure water)', () => {
    const rho = melinderDensity(0, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.density_coefficients);
    // Melinder polynomial at edge of range: ~997.4 kg/m³
    expect(rho).toBeCloseTo(997, 0);
  });

  it('returns ~1038 kg/m³ at 30 wt%, 20°C (matches ASHRAE eg30 data)', () => {
    const rho = melinderDensity(0.30, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.density_coefficients);
    // Melinder model: ~1038 kg/m³ (ASHRAE: ~1037.2)
    expect(rho).toBeCloseTo(1038, 0);
  });

  it('returns ~1061 kg/m³ at 50 wt%, ~27°C (CoolProp validation value)', () => {
    const rho = melinderDensity(0.50, 26.85, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.density_coefficients);
    // Melinder model: ~1061 kg/m³ (CoolProp: ≈1061.2)
    expect(rho).toBeCloseTo(1061, 0);
  });

  it('density increases with EG concentration at 20°C', () => {
    const rho0 = melinderDensity(0, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.density_coefficients);
    const rho30 = melinderDensity(0.30, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.density_coefficients);
    const rho50 = melinderDensity(0.50, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.density_coefficients);
    expect(rho0).toBeLessThan(rho30);
    expect(rho30).toBeLessThan(rho50);
  });
});

describe('Melinder EG-Water viscosity', () => {
  it('returns ~1e-3 Pa·s at 0 wt%, 20°C (near pure water)', () => {
    const mu = melinderViscosity(0, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    expect(mu).toBeCloseTo(1.0e-3, 4);
  });

  it('returns ~2.17e-3 Pa·s at 30 wt%, 20°C', () => {
    const mu = melinderViscosity(0.30, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    // Melinder model: ~2.17e-3 Pa·s (ASHRAE: ~1.87e-3; Melinder valid near x_ref)
    expect(mu).toBeCloseTo(2.17e-3, 4);
  });

  it('viscosity increases with EG concentration at 25°C', () => {
    const mu0 = melinderViscosity(0, 25, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    const mu30 = melinderViscosity(0.30, 25, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    const mu50 = melinderViscosity(0.50, 25, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    expect(mu0).toBeLessThan(mu30);
    expect(mu30).toBeLessThan(mu50);
  });

  it('viscosity decreases with temperature at 30 wt%', () => {
    const mu0 = melinderViscosity(0.30, 0, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    const mu20 = melinderViscosity(0.30, 20, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    const mu60 = melinderViscosity(0.30, 60, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    expect(mu0).toBeGreaterThan(mu20);
    expect(mu20).toBeGreaterThan(mu60);
  });
});

describe('Melinder PG-Water density', () => {
  it('density increases with PG concentration at 20°C', () => {
    const rho10 = melinderDensity(0.10, 20, pg.x_ref, pg.t_ref_k, pg.n_terms, pg.density_coefficients);
    const rho30 = melinderDensity(0.30, 20, pg.x_ref, pg.t_ref_k, pg.n_terms, pg.density_coefficients);
    const rho50 = melinderDensity(0.50, 20, pg.x_ref, pg.t_ref_k, pg.n_terms, pg.density_coefficients);
    expect(rho10).toBeLessThan(rho30);
    expect(rho30).toBeLessThan(rho50);
  });
});

describe('Melinder PG-Water viscosity', () => {
  it('PG is more viscous than EG at same concentration', () => {
    // At 50 wt%, 25°C: PG ~5 mPa·s vs EG ~3.5 mPa·s
    const muEg = melinderViscosity(0.50, 25, eg.x_ref, eg.t_ref_k, eg.n_terms, eg.viscosity_coefficients);
    const muPg = melinderViscosity(0.50, 25, pg.x_ref, pg.t_ref_k, pg.n_terms, pg.viscosity_coefficients);
    expect(muPg).toBeGreaterThan(muEg);
  });
});
