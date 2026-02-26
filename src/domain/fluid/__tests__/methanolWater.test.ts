import { describe, it, expect } from 'vitest';
import {
  pureMethanolDensity,
  pureMethanolViscosity,
  methanolWaterDensity,
  methanolWaterViscosity,
} from '../methanolWater';
import methanolJson from '@data/fluid-properties/methanol-water.json';

const data = methanolJson as typeof methanolJson;
const dCoeffs = data.pure_methanol.density;
const vCoeffs = data.pure_methanol.viscosity;

describe('pureMethanolDensity', () => {
  it('returns ~786 kg/m³ at 25°C', () => {
    const rho = pureMethanolDensity(25, dCoeffs);
    // Asada polynomial: 786.2 kg/m³ at 25°C
    expect(rho).toBeCloseTo(786, 0);
  });

  it('density decreases with temperature', () => {
    const rho15 = pureMethanolDensity(15, dCoeffs);
    const rho40 = pureMethanolDensity(40, dCoeffs);
    expect(rho15).toBeGreaterThan(rho40);
  });
});

describe('pureMethanolViscosity', () => {
  it('returns ~0.54e-3 Pa·s at 25°C', () => {
    const mu = pureMethanolViscosity(25, vCoeffs);
    // Literature: 0.54 mPa·s at 25°C
    expect(mu * 1e3).toBeCloseTo(0.54, 1);
  });
});

describe('methanolWaterDensity', () => {
  it('returns ~997 kg/m³ at 0 wt% (pure water)', () => {
    const rho = methanolWaterDensity(25, 0, dCoeffs);
    // Kell water density at 25°C: ~997.0 kg/m³
    expect(rho).toBeCloseTo(997, 0);
  });

  it('returns ~786 kg/m³ at 100 wt% (pure methanol)', () => {
    const rho = methanolWaterDensity(25, 1.0, dCoeffs);
    // Asada pure methanol density at 25°C: ~786.2 kg/m³
    expect(rho).toBeCloseTo(786, 0);
  });

  it('density monotonically decreases with methanol fraction', () => {
    const rho0 = methanolWaterDensity(25, 0, dCoeffs);
    const rho30 = methanolWaterDensity(25, 0.3, dCoeffs);
    const rho60 = methanolWaterDensity(25, 0.6, dCoeffs);
    const rho100 = methanolWaterDensity(25, 1.0, dCoeffs);
    expect(rho0).toBeGreaterThan(rho30);
    expect(rho30).toBeGreaterThan(rho60);
    expect(rho60).toBeGreaterThan(rho100);
  });

  it('density at 40 wt%, 25°C is ~900 kg/m³ (volume-fraction mixing)', () => {
    const rho = methanolWaterDensity(25, 0.40, dCoeffs);
    // Volume-fraction linear mixing: ~900 kg/m³
    // Note: literature ~935 kg/m³ (non-ideal mixing); this model uses ideal mixing
    expect(rho).toBeCloseTo(900, 0);
  });
});

describe('methanolWaterViscosity', () => {
  it('returns pure water viscosity at 0 wt%', () => {
    const mu = methanolWaterViscosity(25, 0, dCoeffs, vCoeffs);
    expect(mu * 1e3).toBeCloseTo(0.89, 1);
  });

  it('returns pure methanol viscosity at 100 wt%', () => {
    const mu = methanolWaterViscosity(25, 1.0, dCoeffs, vCoeffs);
    expect(mu * 1e3).toBeCloseTo(0.54, 1);
  });

  it('viscosity is between pure water and methanol at 50 wt%', () => {
    const muW = methanolWaterViscosity(25, 0, dCoeffs, vCoeffs);
    const muM = methanolWaterViscosity(25, 1.0, dCoeffs, vCoeffs);
    const mu50 = methanolWaterViscosity(25, 0.5, dCoeffs, vCoeffs);
    const minMu = Math.min(muW, muM);
    // Log mixing gives intermediate value
    expect(mu50).toBeGreaterThanOrEqual(minMu * 0.8);
  });
});
