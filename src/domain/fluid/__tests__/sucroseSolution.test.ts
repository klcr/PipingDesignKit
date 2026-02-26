import { describe, it, expect } from 'vitest';
import { sucroseDensity20C, sucroseDensity, sucroseViscosity } from '../sucroseSolution';
import sucroseJson from '@data/fluid-properties/sucrose-water.json';

const data = sucroseJson as typeof sucroseJson;
const densityCoeffs = data.density_20c_coefficients;
const viscTable = data.viscosity_table;

describe('sucroseDensity20C', () => {
  it('returns ~998 kg/m³ at 0 Brix (pure water)', () => {
    const rho = sucroseDensity20C(0, densityCoeffs);
    expect(rho).toBeCloseTo(998, 0);
  });

  it('returns ~1129 kg/m³ at 30 Brix, 20°C', () => {
    const rho = sucroseDensity20C(30, densityCoeffs);
    // ICUMSA: 30 Brix ≈ 1129.5 kg/m³; polynomial fit: 1129.4
    expect(rho).toBeCloseTo(1129, 0);
  });

  it('returns ~1304 kg/m³ at 60 Brix, 20°C', () => {
    const rho = sucroseDensity20C(60, densityCoeffs);
    // ICUMSA: 60 Brix ≈ 1303.9 kg/m³
    expect(rho).toBeCloseTo(1304, 0);
  });

  it('density monotonically increases with Brix', () => {
    const rho0 = sucroseDensity20C(0, densityCoeffs);
    const rho30 = sucroseDensity20C(30, densityCoeffs);
    const rho60 = sucroseDensity20C(60, densityCoeffs);
    const rho75 = sucroseDensity20C(75, densityCoeffs);
    expect(rho0).toBeLessThan(rho30);
    expect(rho30).toBeLessThan(rho60);
    expect(rho60).toBeLessThan(rho75);
  });
});

describe('sucroseDensity (temperature-corrected)', () => {
  it('density at 20°C equals density20C', () => {
    const rho20 = sucroseDensity20C(30, densityCoeffs);
    const rhoCorr = sucroseDensity(20, 30, densityCoeffs);
    expect(rhoCorr).toBeCloseTo(rho20, 0);
  });

  it('density decreases with temperature', () => {
    const rho20 = sucroseDensity(20, 30, densityCoeffs);
    const rho40 = sucroseDensity(40, 30, densityCoeffs);
    expect(rho20).toBeGreaterThan(rho40);
  });
});

describe('sucroseViscosity', () => {
  it('returns ~1 mPa·s at 0 Brix, 25°C (near pure water)', () => {
    const mu = sucroseViscosity(25, 0, viscTable);
    expect(mu * 1e3).toBeCloseTo(0.891, 1);
  });

  it('returns ~40 mPa·s at 60 Brix, 25°C', () => {
    const mu = sucroseViscosity(25, 60, viscTable);
    // Perry's: ~40.4 mPa·s at 60 Brix, 25°C
    expect(mu * 1e3).toBeCloseTo(40.4, 0);
  });

  it('viscosity increases dramatically with concentration', () => {
    const mu20 = sucroseViscosity(25, 20, viscTable);
    const mu40 = sucroseViscosity(25, 40, viscTable);
    const mu60 = sucroseViscosity(25, 60, viscTable);
    expect(mu20).toBeLessThan(mu40);
    expect(mu40).toBeLessThan(mu60);
    // At least 10× increase from 20 to 60 Brix
    expect(mu60 / mu20).toBeGreaterThan(10);
  });

  it('viscosity decreases with temperature', () => {
    const mu25 = sucroseViscosity(25, 40, viscTable);
    const mu40 = sucroseViscosity(40, 40, viscTable);
    const mu60 = sucroseViscosity(60, 40, viscTable);
    expect(mu25).toBeGreaterThan(mu40);
    expect(mu40).toBeGreaterThan(mu60);
  });
});
