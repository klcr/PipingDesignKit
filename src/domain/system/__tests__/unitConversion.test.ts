import { describe, it, expect } from 'vitest';
import {
  convertPressure,
  convertFlowRate,
  flowRateToM3s,
  convertLength,
  convertTemperature,
} from '../unitConversion';

describe('convertPressure', () => {
  it('should convert 100 kPa to 1 bar', () => {
    expect(convertPressure(100, 'kPa', 'bar')).toBeCloseTo(1.0, 4);
  });

  it('should convert 100 kPa to 14.504 psi', () => {
    expect(convertPressure(100, 'kPa', 'psi')).toBeCloseTo(14.504, 2);
  });

  it('should convert 1 MPa to 1000 kPa', () => {
    expect(convertPressure(1, 'MPa', 'kPa')).toBeCloseTo(1000, 4);
  });

  it('should convert 1 kgf/cm2 to 98.0665 kPa', () => {
    expect(convertPressure(1, 'kgf/cm2', 'kPa')).toBeCloseTo(98.0665, 2);
  });

  it('should be identity for same units', () => {
    expect(convertPressure(42, 'Pa', 'Pa')).toBeCloseTo(42, 4);
  });
});

describe('convertFlowRate', () => {
  it('should convert 60 L/min to 1 m³/h', () => {
    expect(convertFlowRate(60, 'L/min', 'm3/h')).toBeCloseTo(3.6, 4);
  });

  it('should convert 1 m³/h to 4.403 USgpm', () => {
    expect(convertFlowRate(1, 'm3/h', 'USgpm')).toBeCloseTo(4.403, 2);
  });
});

describe('flowRateToM3s', () => {
  it('should convert 10 m³/h to m³/s', () => {
    expect(flowRateToM3s(10, 'm3/h')).toBeCloseTo(10 / 3600, 8);
  });

  it('should convert 100 L/min to m³/s', () => {
    expect(flowRateToM3s(100, 'L/min')).toBeCloseTo(100 / 60000, 8);
  });
});

describe('convertLength', () => {
  it('should convert 1000 mm to 1 m', () => {
    expect(convertLength(1000, 'mm', 'm')).toBeCloseTo(1.0, 6);
  });

  it('should convert 1 inch to 25.4 mm', () => {
    expect(convertLength(1, 'in', 'mm')).toBeCloseTo(25.4, 4);
  });

  it('should convert 1 foot to 0.3048 m', () => {
    expect(convertLength(1, 'ft', 'm')).toBeCloseTo(0.3048, 4);
  });
});

describe('convertTemperature', () => {
  it('should convert 0°C to 273.15K', () => {
    expect(convertTemperature(0, 'C', 'K')).toBeCloseTo(273.15, 2);
  });

  it('should convert 100°C to 212°F', () => {
    expect(convertTemperature(100, 'C', 'F')).toBeCloseTo(212, 2);
  });

  it('should convert 32°F to 0°C', () => {
    expect(convertTemperature(32, 'F', 'C')).toBeCloseTo(0, 2);
  });

  it('should round-trip C→K→C', () => {
    expect(convertTemperature(convertTemperature(50, 'C', 'K'), 'K', 'C')).toBeCloseTo(50, 6);
  });
});
