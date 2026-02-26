import { describe, it, expect } from 'vitest';
import { getFluidProperties, FluidTableData } from '../fluidProperties';

// Minimal seawater-like data for testing
const testFluidData: FluidTableData = {
  referenceId: 'test-ref',
  fluid: 'test_fluid',
  description: 'Test fluid',
  saturation_table: [
    { temp_c: 0,  pressure_kpa: 0.6117, density_kg_m3: 1028.1, viscosity_pa_s: 1.883e-3, specific_heat_j_kgk: 3985 },
    { temp_c: 20, pressure_kpa: 2.339,  density_kg_m3: 1024.8, viscosity_pa_s: 1.050e-3, specific_heat_j_kgk: 3999 },
    { temp_c: 40, pressure_kpa: 7.384,  density_kg_m3: 1017.9, viscosity_pa_s: 6.900e-4, specific_heat_j_kgk: 4003 },
    { temp_c: 60, pressure_kpa: 19.94,  density_kg_m3: 1008.5, viscosity_pa_s: 4.960e-4, specific_heat_j_kgk: 4004 },
    { temp_c: 80, pressure_kpa: 47.39,  density_kg_m3:  996.9, viscosity_pa_s: 3.800e-4, specific_heat_j_kgk: 4009 },
  ],
};

const testRef = { source: 'test-ref' };

describe('getFluidProperties', () => {
  it('returns exact values at table points', () => {
    const props = getFluidProperties(20, testFluidData, testRef);
    expect(props.density).toBe(1024.8);
    expect(props.viscosity).toBe(1.050e-3);
    expect(props.temperature).toBe(20);
    expect(props.pressure).toBe(2.339);
    expect(props.reference.source).toBe('test-ref');
  });

  it('interpolates between table points', () => {
    const props = getFluidProperties(10, testFluidData, testRef);
    // Midpoint between 0°C and 20°C
    expect(props.density).toBeCloseTo((1028.1 + 1024.8) / 2, 1);
    expect(props.viscosity).toBeCloseTo((1.883e-3 + 1.050e-3) / 2, 6);
  });

  it('throws RangeError for temperature below range', () => {
    expect(() => getFluidProperties(-5, testFluidData, testRef)).toThrow(RangeError);
  });

  it('throws RangeError for temperature above range', () => {
    expect(() => getFluidProperties(100, testFluidData, testRef)).toThrow(RangeError);
  });

  it('preserves the reference object', () => {
    const customRef = { source: 'Custom Source', page: 'p.42', equation: 'eq.7' };
    const props = getFluidProperties(20, testFluidData, customRef);
    expect(props.reference).toEqual(customRef);
  });
});
