import { describe, it, expect } from 'vitest';
import { kellWaterDensity } from '../kellWaterDensity';

describe('kellWaterDensity', () => {
  it('returns ~999.97 kg/m³ at 4°C (maximum density)', () => {
    const rho = kellWaterDensity(4);
    expect(rho).toBeCloseTo(999.97, 1);
  });

  it('returns ~998.2 kg/m³ at 20°C', () => {
    const rho = kellWaterDensity(20);
    expect(rho).toBeCloseTo(998.2, 0);
  });

  it('returns ~958.4 kg/m³ at 100°C', () => {
    const rho = kellWaterDensity(100);
    expect(rho).toBeCloseTo(958.4, 0);
  });

  it('returns ~999.84 kg/m³ at 0°C', () => {
    const rho = kellWaterDensity(0);
    expect(rho).toBeCloseTo(999.84, 0);
  });

  it('monotonically decreases above 4°C', () => {
    const rho20 = kellWaterDensity(20);
    const rho50 = kellWaterDensity(50);
    const rho100 = kellWaterDensity(100);
    expect(rho20).toBeGreaterThan(rho50);
    expect(rho50).toBeGreaterThan(rho100);
  });
});
