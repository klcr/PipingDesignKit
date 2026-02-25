import { describe, it, expect } from 'vitest';
import {
  projectPlan,
  projectElevation,
  projectIsometric,
  projectPoint,
  calcBoundingBox,
  calcViewBox,
} from '../PipeViewRenderer';

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

describe('projectPlan', () => {
  it('projects X-Y plane with Y inverted for SVG', () => {
    const result = projectPlan({ x: 5, y: 3, z: 7 });
    expect(result.x).toBe(5);
    expect(result.y).toBe(-3);
  });

  it('handles origin', () => {
    const result = projectPlan({ x: 0, y: 0, z: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it('ignores Z coordinate', () => {
    const a = projectPlan({ x: 1, y: 2, z: 0 });
    const b = projectPlan({ x: 1, y: 2, z: 100 });
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});

describe('projectElevation', () => {
  it('projects X-Z plane with Z inverted for SVG', () => {
    const result = projectElevation({ x: 5, y: 3, z: 7 });
    expect(result.x).toBe(5);
    expect(result.y).toBe(-7);
  });

  it('handles origin', () => {
    const result = projectElevation({ x: 0, y: 0, z: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it('ignores Y coordinate', () => {
    const a = projectElevation({ x: 1, y: 0, z: 2 });
    const b = projectElevation({ x: 1, y: 100, z: 2 });
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });
});

describe('projectIsometric', () => {
  it('applies 30-degree isometric projection', () => {
    const p = { x: 5, y: 3, z: 7 };
    const result = projectIsometric(p);
    expect(result.x).toBeCloseTo((5 - 3) * COS30, 10);
    expect(result.y).toBeCloseTo(-((5 + 3) * SIN30 + 7), 10);
  });

  it('handles origin', () => {
    const result = projectIsometric({ x: 0, y: 0, z: 0 });
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it('pure X movement produces expected offset', () => {
    const result = projectIsometric({ x: 10, y: 0, z: 0 });
    expect(result.x).toBeCloseTo(10 * COS30, 10);
    expect(result.y).toBeCloseTo(-(10 * SIN30), 10);
  });

  it('pure Z movement goes straight up in SVG', () => {
    const result = projectIsometric({ x: 0, y: 0, z: 5 });
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(-5, 10);
  });
});

describe('projectPoint', () => {
  const p = { x: 5, y: 3, z: 7 };

  it('dispatches to plan', () => {
    expect(projectPoint(p, 'plan')).toEqual(projectPlan(p));
  });

  it('dispatches to elevation', () => {
    expect(projectPoint(p, 'elevation')).toEqual(projectElevation(p));
  });

  it('dispatches to isometric', () => {
    const result = projectPoint(p, 'isometric');
    const expected = projectIsometric(p);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
  });
});

describe('calcBoundingBox', () => {
  it('calculates bounding box of multiple points', () => {
    const points = [
      { x: 1, y: -3 },
      { x: 5, y: 2 },
      { x: -2, y: 0 },
    ];
    const bbox = calcBoundingBox(points);
    expect(bbox.minX).toBe(-2);
    expect(bbox.minY).toBe(-3);
    expect(bbox.maxX).toBe(5);
    expect(bbox.maxY).toBe(2);
  });

  it('handles single point', () => {
    const bbox = calcBoundingBox([{ x: 3, y: 4 }]);
    expect(bbox.minX).toBe(3);
    expect(bbox.maxX).toBe(3);
    expect(bbox.minY).toBe(4);
    expect(bbox.maxY).toBe(4);
  });

  it('throws on empty array', () => {
    expect(() => calcBoundingBox([])).toThrow();
  });
});

describe('calcViewBox', () => {
  it('generates padded square viewBox string', () => {
    const bbox = { minX: 0, minY: -10, maxX: 10, maxY: 0 };
    const vb = calcViewBox(bbox, 1);
    const parts = vb.split(' ').map(Number);
    expect(parts).toHaveLength(4);
    // Size = max(10, 10) = 10, with padding 1 → half = 6
    // center = (5, -5)
    expect(parts[0]).toBeCloseTo(5 - 6, 5); // -1
    expect(parts[1]).toBeCloseTo(-5 - 6, 5); // -11
    expect(parts[2]).toBeCloseTo(12, 5);
    expect(parts[3]).toBeCloseTo(12, 5);
  });

  it('handles single-point bbox with minimum size guarantee', () => {
    const bbox = { minX: 5, minY: 5, maxX: 5, maxY: 5 };
    const vb = calcViewBox(bbox, 0.5);
    const parts = vb.split(' ').map(Number);
    // size = max(0, 0, 1) = 1, half = 0.5 + 0.5 = 1
    expect(parts[2]).toBeCloseTo(2, 5);
    expect(parts[3]).toBeCloseTo(2, 5);
  });

  it('normalizes non-square bbox to square', () => {
    const bbox = { minX: 0, minY: 0, maxX: 20, maxY: 5 };
    const vb = calcViewBox(bbox, 0);
    const parts = vb.split(' ').map(Number);
    // size = max(20, 5) = 20
    expect(parts[2]).toBeCloseTo(20, 5);
    expect(parts[3]).toBeCloseTo(20, 5);
  });
});
