import { describe, it, expect } from 'vitest';
import {
  laliberteSingleSoluteDensity,
  laliberteSingleSoluteViscosity,
  laliberteWaterViscosity,
  laliberteDensity,
  laliberteViscosity,
} from '../laliberte';

// NaCl coefficients from Laliberté (2009) / chemicals package
const NaCl_density = {
  c0: -0.00324112223655149,
  c1: 0.0636354335906616,
  c2: 1.01371399467365,
  c3: 0.0145951015210159,
  c4: 3317.34854426537,
};

const NaCl_viscosity = {
  v1: 16.221788633396,
  v2: 1.32293086770011,
  v3: 1.48485985010431,
  v4: 0.00746912559657377,
  v5: 30.7802007540575,
  v6: 2.05826852322558,
};

// CaCl₂ coefficients
const CaCl2_density = {
  c0: 0.967814929691928,
  c1: 5.540434135986,
  c2: 1.10374669742622,
  c3: 0.0123340782160061,
  c4: 2589.61875022366,
};

const CaCl2_viscosity = {
  v1: 69.5769240055845,
  v2: 4.17047793905946,
  v3: 3.57817553622189,
  v4: 0.0116677996754397,
  v5: 13897.6652650556,
  v6: 20.8027689840251,
};

describe('laliberteWaterViscosity', () => {
  it('returns ~1.0 mPa·s at 20°C', () => {
    const mu = laliberteWaterViscosity(20);
    expect(mu).toBeCloseTo(1.0, 0);
  });

  it('returns ~0.89 mPa·s at 25°C', () => {
    const mu = laliberteWaterViscosity(25);
    expect(mu).toBeCloseTo(0.89, 1);
  });

  it('decreases with temperature', () => {
    expect(laliberteWaterViscosity(20)).toBeGreaterThan(laliberteWaterViscosity(50));
  });
});

describe('laliberteSingleSoluteDensity — NaCl', () => {
  it('returns pure water density at 0 wt%', () => {
    const rho = laliberteSingleSoluteDensity(20, 0, NaCl_density);
    // Should be close to Kell value for pure water at 20°C
    expect(rho).toBeCloseTo(998.2, 0);
  });

  it('returns ~1069 kg/m³ for 10 wt% NaCl at 25°C', () => {
    const rho = laliberteSingleSoluteDensity(25, 0.10, NaCl_density);
    // Laliberté model: ~1069 kg/m³ (literature ~1071; within model accuracy ~0.2%)
    expect(rho).toBeCloseTo(1069, 0);
  });

  it('returns ~1194 kg/m³ for 26 wt% NaCl at 25°C (saturated)', () => {
    const rho = laliberteSingleSoluteDensity(25, 0.26, NaCl_density);
    // Laliberté model: ~1194 kg/m³ (literature ~1197; within model accuracy ~0.3%)
    expect(rho).toBeCloseTo(1194, 0);
  });

  it('density increases with concentration', () => {
    const rho5 = laliberteSingleSoluteDensity(25, 0.05, NaCl_density);
    const rho15 = laliberteSingleSoluteDensity(25, 0.15, NaCl_density);
    const rho25 = laliberteSingleSoluteDensity(25, 0.25, NaCl_density);
    expect(rho5).toBeLessThan(rho15);
    expect(rho15).toBeLessThan(rho25);
  });
});

describe('laliberteSingleSoluteViscosity — NaCl', () => {
  it('returns ~pure water viscosity at 0 wt%', () => {
    const mu = laliberteSingleSoluteViscosity(25, 0, NaCl_viscosity);
    // Pure water at 25°C ≈ 0.89 mPa·s = 8.9e-4 Pa·s
    expect(mu).toBeCloseTo(0.89e-3, 5);
  });

  it('returns ~1.98 mPa·s at 26 wt% NaCl, 25°C', () => {
    const mu = laliberteSingleSoluteViscosity(25, 0.26, NaCl_viscosity);
    // Literature: ~1.98 mPa·s
    expect(mu * 1e3).toBeCloseTo(1.98, 0);
  });

  it('viscosity increases with concentration', () => {
    const mu5 = laliberteSingleSoluteViscosity(25, 0.05, NaCl_viscosity);
    const mu15 = laliberteSingleSoluteViscosity(25, 0.15, NaCl_viscosity);
    const mu25 = laliberteSingleSoluteViscosity(25, 0.25, NaCl_viscosity);
    expect(mu5).toBeLessThan(mu15);
    expect(mu15).toBeLessThan(mu25);
  });
});

describe('laliberteSingleSoluteDensity — CaCl₂', () => {
  it('returns ~1206 kg/m³ for 25 wt% CaCl₂ at 25°C', () => {
    const rho = laliberteSingleSoluteDensity(25, 0.25, CaCl2_density);
    // Laliberté model: ~1206 kg/m³ (literature ~1218; within ~1%)
    expect(rho).toBeCloseTo(1206, 0);
  });
});

describe('laliberteSingleSoluteViscosity — CaCl₂', () => {
  it('returns ~1.9 mPa·s for 25 wt% CaCl₂ at 25°C', () => {
    const mu = laliberteSingleSoluteViscosity(25, 0.25, CaCl2_viscosity);
    // Laliberté model with extracted coefficients: ~1.91 mPa·s
    expect(mu * 1e3).toBeCloseTo(1.91, 1);
  });
});

describe('multi-solute mixing', () => {
  it('handles two solutes without errors', () => {
    // 5% NaCl + 5% CaCl₂
    const rho = laliberteDensity(25, [0.05, 0.05], [NaCl_density, CaCl2_density]);
    const mu = laliberteViscosity(25, [0.05, 0.05], [NaCl_viscosity, CaCl2_viscosity]);
    expect(rho).toBeGreaterThan(998);  // denser than pure water
    expect(mu).toBeGreaterThan(0.89e-3);  // more viscous than pure water
  });
});
