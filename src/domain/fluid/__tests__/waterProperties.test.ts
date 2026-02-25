import { describe, it, expect } from 'vitest';
import { getWaterProperties, WaterData } from '../waterProperties';
import { linearInterpolate } from '../interpolate';
import waterJson from '../../../../data/fluid-properties/water.json';

const waterData = waterJson as unknown as WaterData;

describe('linearInterpolate', () => {
  const table = [
    { x: 0, y: 0 },
    { x: 10, y: 100 },
    { x: 20, y: 200 },
  ];

  it('should return exact value at table point', () => {
    expect(linearInterpolate(10, table)).toBe(100);
  });

  it('should interpolate between points', () => {
    expect(linearInterpolate(5, table)).toBe(50);
    expect(linearInterpolate(15, table)).toBe(150);
  });

  it('should throw RangeError for out of range', () => {
    expect(() => linearInterpolate(-1, table)).toThrow(RangeError);
    expect(() => linearInterpolate(21, table)).toThrow(RangeError);
  });
});

describe('getWaterProperties', () => {
  it('should return properties at 20°C (exact table point)', () => {
    const props = getWaterProperties(20, waterData);
    expect(props.density).toBeCloseTo(998.2, 1);
    expect(props.viscosity).toBeCloseTo(1.002e-3, 5);
    expect(props.temperature).toBe(20);
  });

  it('should return properties at 100°C', () => {
    const props = getWaterProperties(100, waterData);
    expect(props.density).toBeCloseTo(958.4, 1);
    expect(props.viscosity).toBeCloseTo(2.818e-4, 6);
  });

  it('should interpolate at 25°C (between 20 and 30)', () => {
    const props = getWaterProperties(25, waterData);
    // 25°C is midpoint: density ≈ (998.2 + 995.6) / 2 = 996.9
    expect(props.density).toBeCloseTo(997.0, 0);
    // viscosity ≈ (1.002e-3 + 7.978e-4) / 2 ≈ 8.999e-4
    expect(props.viscosity).toBeCloseTo(8.90e-4, 5);
  });

  it('should throw for temperature below range', () => {
    expect(() => getWaterProperties(-10, waterData)).toThrow(RangeError);
  });

  it('should throw for temperature above range', () => {
    expect(() => getWaterProperties(250, waterData)).toThrow(RangeError);
  });
});
