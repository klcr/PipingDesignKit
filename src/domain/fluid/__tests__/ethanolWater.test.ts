import { describe, it, expect } from 'vitest';
import { ethanolWaterDensity, ethanolWaterViscosity } from '../ethanolWater';
import ethanolJson from '@data/fluid-properties/ethanol-water.json';

const data = ethanolJson as typeof ethanolJson;
const rk = data.redlich_kister;
const viscTable = data.viscosity_table;

describe('ethanolWaterDensity', () => {
  it('returns ~997 kg/m³ at 0 wt% (pure water), 25°C', () => {
    const rho = ethanolWaterDensity(25, 0, rk);
    // Kell water density at 25°C: ~997.04 kg/m³
    expect(rho).toBeCloseTo(997, 0);
  });

  it('returns ~785 kg/m³ at 100 wt% (pure ethanol), 25°C', () => {
    const rho = ethanolWaterDensity(25, 1.0, rk);
    // pureEthanolDensity fit: ~784.5 kg/m³ at 25°C (literature ~785)
    expect(rho).toBeCloseTo(785, 0);
  });

  it('density decreases monotonically with ethanol content', () => {
    const rho0 = ethanolWaterDensity(25, 0, rk);
    const rho20 = ethanolWaterDensity(25, 0.2, rk);
    const rho50 = ethanolWaterDensity(25, 0.5, rk);
    const rho80 = ethanolWaterDensity(25, 0.8, rk);
    expect(rho0).toBeGreaterThan(rho20);
    expect(rho20).toBeGreaterThan(rho50);
    expect(rho50).toBeGreaterThan(rho80);
  });
});

describe('ethanolWaterViscosity', () => {
  it('returns ~0.891 mPa·s at 0 wt%, 25°C (pure water)', () => {
    const mu = ethanolWaterViscosity(25, 0, viscTable);
    expect(mu * 1e3).toBeCloseTo(0.891, 1);
  });

  it('shows viscosity maximum near 40 wt% at 25°C', () => {
    const mu20 = ethanolWaterViscosity(25, 0.20, viscTable);
    const mu40 = ethanolWaterViscosity(25, 0.40, viscTable);
    const mu60 = ethanolWaterViscosity(25, 0.60, viscTable);
    // Viscosity peaks at ~40 wt%
    expect(mu40).toBeGreaterThan(mu20);
    expect(mu40).toBeGreaterThan(mu60);
  });

  it('returns ~2.2 mPa·s at 40 wt%, 25°C', () => {
    const mu = ethanolWaterViscosity(25, 0.40, viscTable);
    expect(mu * 1e3).toBeCloseTo(2.226, 0);
  });

  it('viscosity decreases with temperature at 30 wt%', () => {
    const mu15 = ethanolWaterViscosity(15, 0.30, viscTable);
    const mu30 = ethanolWaterViscosity(30, 0.30, viscTable);
    const mu50 = ethanolWaterViscosity(50, 0.30, viscTable);
    expect(mu15).toBeGreaterThan(mu30);
    expect(mu30).toBeGreaterThan(mu50);
  });

  it('throws RangeError for temperature outside table', () => {
    expect(() => ethanolWaterViscosity(5, 0.30, viscTable)).toThrow(RangeError);
  });
});
