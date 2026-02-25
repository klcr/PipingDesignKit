import { describe, it, expect } from 'vitest';
import { getAvailableSizes, getAvailableSchedules, resolvePipeSpec } from '../pipeSpecResolver';

describe('getAvailableSizes', () => {
  it('should return all ANSI sizes', () => {
    const sizes = getAvailableSizes('ansi');
    expect(sizes.length).toBe(19);
    expect(sizes[0]).toEqual({ nps: '1/2', dn: 15 });
  });

  it('should return all JIS sizes', () => {
    const sizes = getAvailableSizes('jis-sgp');
    expect(sizes.length).toBe(22);
    expect(sizes[0]).toEqual({ nps: '1/8', dn: 6 });
  });
});

describe('getAvailableSchedules', () => {
  it('should return schedules for ANSI 2"', () => {
    const schedules = getAvailableSchedules('ansi', '2');
    expect(schedules).toContain('40');
    expect(schedules).toContain('80');
    expect(schedules.length).toBeGreaterThan(0);
  });

  it('should return empty array for JIS (no schedule concept)', () => {
    const schedules = getAvailableSchedules('jis-sgp', '2');
    expect(schedules).toEqual([]);
  });

  it('should return empty array for nonexistent NPS', () => {
    const schedules = getAvailableSchedules('ansi', 'nonexistent');
    expect(schedules).toEqual([]);
  });
});

describe('resolvePipeSpec', () => {
  it('should resolve ANSI 2" Sch40', () => {
    const spec = resolvePipeSpec('ansi', '2', '40');
    expect(spec).not.toBeNull();
    expect(spec!.standard).toBe('ASME B36.10M');
    expect(spec!.nps).toBe('2');
    expect(spec!.dn).toBe(50);
    expect(spec!.id_mm).toBe(52.50);
    expect(spec!.schedule).toBe('40');
  });

  it('should resolve JIS 2" (no schedule)', () => {
    const spec = resolvePipeSpec('jis-sgp', '2');
    expect(spec).not.toBeNull();
    expect(spec!.standard).toBe('JIS G 3452 SGP');
    expect(spec!.nps).toBe('2');
    expect(spec!.schedule).toBeUndefined();
  });

  it('should return null for nonexistent NPS', () => {
    const spec = resolvePipeSpec('ansi', 'nonexistent', '40');
    expect(spec).toBeNull();
  });

  it('should return null for nonexistent schedule', () => {
    const spec = resolvePipeSpec('ansi', '2', 'nonexistent');
    expect(spec).toBeNull();
  });
});
