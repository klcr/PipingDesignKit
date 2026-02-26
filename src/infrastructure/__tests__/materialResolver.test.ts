import { describe, it, expect } from 'vitest';
import { getAvailableMaterials, resolveMaterial } from '../materialResolver';

describe('getAvailableMaterials', () => {
  it('should return all 16 materials', () => {
    const materials = getAvailableMaterials();
    expect(materials.length).toBe(16);
  });

  it('should include carbon steel with name_ja', () => {
    const materials = getAvailableMaterials();
    const cs = materials.find(m => m.id === 'carbon_steel_new');
    expect(cs).toBeDefined();
    expect(cs!.roughness_mm).toBe(0.046);
    expect(cs!.name).toBe('Carbon steel (new, clean)');
    expect(cs!.name_ja).toBe('炭素鋼（新品）');
  });
});

describe('resolveMaterial', () => {
  it('should resolve carbon_steel_new to PipeMaterial', () => {
    const mat = resolveMaterial('carbon_steel_new');
    expect(mat).not.toBeNull();
    expect(mat!.id).toBe('carbon_steel_new');
    expect(mat!.roughness_mm).toBe(0.046);
    expect(mat!.reference.source).toBe('Moody, 1944');
  });

  it('should return null for nonexistent material', () => {
    const mat = resolveMaterial('nonexistent');
    expect(mat).toBeNull();
  });
});
