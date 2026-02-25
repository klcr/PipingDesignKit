import { describe, it, expect } from 'vitest';
import {
  parseProjectFile,
  serializeProjectFile,
  ProjectFile,
  PROJECT_FILE_VERSION,
  SingleSegmentProjectData,
  MultiSegmentProjectData,
  RouteProjectData,
} from '../persistence/projectFile';

// ── テストデータ ──

const singleData: SingleSegmentProjectData = {
  temperature_c: 25,
  pipeStandard: 'ansi',
  nominalSize: '3',
  schedule: '40',
  materialId: 'carbon_steel_new',
  flowRate_m3h: 15,
  length_m: 100,
  elevation_m: 5,
  fittings: [
    { fittingId: 'elbow_90_lr_welded', quantity: 4 },
    { fittingId: 'valve_gate_full', quantity: 1 },
  ],
};

const multiData: MultiSegmentProjectData = {
  temperature_c: 30,
  flowRate_m3h: 20,
  segments: [
    {
      pipeStandard: 'ansi',
      nominalSize: '4',
      schedule: '40',
      materialId: 'carbon_steel_new',
      length_m: 50,
      elevation_m: 3,
      fittings: [{ fittingId: 'elbow_90_lr_welded', quantity: 2 }],
    },
    {
      pipeStandard: 'jis-sgp',
      nominalSize: '4',
      schedule: '',
      materialId: 'stainless_steel',
      length_m: 30,
      elevation_m: -1,
      fittings: [],
    },
  ],
};

const routeData: RouteProjectData = {
  temperature_c: 20,
  flowRate_m3h: 10,
  pipeStandard: 'ansi',
  nominalSize: '2',
  schedule: '40',
  materialId: 'carbon_steel_new',
  elbowConnection: 'welded',
  use90LongRadius: true,
  nodes: [
    { id: 'n1', x: 0, y: 0, z: 0, fittings: [] },
    { id: 'n2', x: 10, y: 0, z: 0, fittings: [{ fittingId: 'valve_gate_full', quantity: 1 }] },
    { id: 'n3', x: 10, y: 5, z: 3, fittings: [] },
  ],
};

function makeSingleProject(): ProjectFile {
  return {
    version: PROJECT_FILE_VERSION,
    type: 'single',
    name: 'Test Single',
    createdAt: '2026-02-25T00:00:00.000Z',
    updatedAt: '2026-02-25T00:00:00.000Z',
    data: singleData,
  };
}

function makeMultiProject(): ProjectFile {
  return {
    version: PROJECT_FILE_VERSION,
    type: 'multi',
    name: 'Test Multi',
    createdAt: '2026-02-25T00:00:00.000Z',
    updatedAt: '2026-02-25T00:00:00.000Z',
    data: multiData,
  };
}

function makeRouteProject(): ProjectFile {
  return {
    version: PROJECT_FILE_VERSION,
    type: 'route',
    name: 'Test Route',
    createdAt: '2026-02-25T00:00:00.000Z',
    updatedAt: '2026-02-25T00:00:00.000Z',
    data: routeData,
  };
}

// ── ラウンドトリップテスト ──

describe('projectFile', () => {
  describe('round-trip: serialize → parse', () => {
    it('single segment data survives round-trip', () => {
      const original = makeSingleProject();
      const json = serializeProjectFile(original);
      const parsed = parseProjectFile(json);

      expect(parsed.version).toBe(PROJECT_FILE_VERSION);
      expect(parsed.type).toBe('single');
      expect(parsed.name).toBe('Test Single');

      const data = parsed.data as SingleSegmentProjectData;
      expect(data.temperature_c).toBe(25);
      expect(data.pipeStandard).toBe('ansi');
      expect(data.nominalSize).toBe('3');
      expect(data.schedule).toBe('40');
      expect(data.materialId).toBe('carbon_steel_new');
      expect(data.flowRate_m3h).toBe(15);
      expect(data.length_m).toBe(100);
      expect(data.elevation_m).toBe(5);
      expect(data.fittings).toHaveLength(2);
      expect(data.fittings[0]).toEqual({ fittingId: 'elbow_90_lr_welded', quantity: 4 });
      expect(data.fittings[1]).toEqual({ fittingId: 'valve_gate_full', quantity: 1 });
    });

    it('multi segment data survives round-trip', () => {
      const original = makeMultiProject();
      const json = serializeProjectFile(original);
      const parsed = parseProjectFile(json);

      expect(parsed.type).toBe('multi');
      const data = parsed.data as MultiSegmentProjectData;
      expect(data.temperature_c).toBe(30);
      expect(data.flowRate_m3h).toBe(20);
      expect(data.segments).toHaveLength(2);
      expect(data.segments[0].pipeStandard).toBe('ansi');
      expect(data.segments[0].length_m).toBe(50);
      expect(data.segments[0].fittings).toHaveLength(1);
      expect(data.segments[1].pipeStandard).toBe('jis-sgp');
      expect(data.segments[1].fittings).toHaveLength(0);
    });

    it('route data survives round-trip', () => {
      const original = makeRouteProject();
      const json = serializeProjectFile(original);
      const parsed = parseProjectFile(json);

      expect(parsed.type).toBe('route');
      const data = parsed.data as RouteProjectData;
      expect(data.temperature_c).toBe(20);
      expect(data.flowRate_m3h).toBe(10);
      expect(data.pipeStandard).toBe('ansi');
      expect(data.elbowConnection).toBe('welded');
      expect(data.use90LongRadius).toBe(true);
      expect(data.nodes).toHaveLength(3);
      expect(data.nodes[0]).toEqual({ id: 'n1', x: 0, y: 0, z: 0, fittings: [] });
      expect(data.nodes[1].fittings).toHaveLength(1);
      expect(data.nodes[2]).toEqual({ id: 'n3', x: 10, y: 5, z: 3, fittings: [] });
    });

    it('JSON output is human-readable (pretty-printed)', () => {
      const json = serializeProjectFile(makeSingleProject());
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('validation: invalid inputs', () => {
    it('rejects non-JSON string', () => {
      expect(() => parseProjectFile('not json')).toThrow('Invalid JSON format');
    });

    it('rejects non-object JSON', () => {
      expect(() => parseProjectFile('"hello"')).toThrow('must be a JSON object');
    });

    it('rejects wrong version', () => {
      const json = JSON.stringify({ version: '99.0', type: 'single', name: 'x', createdAt: 'x', updatedAt: 'x', data: {} });
      expect(() => parseProjectFile(json)).toThrow('Unsupported version');
    });

    it('rejects unknown project type', () => {
      const json = JSON.stringify({ version: '1.0', type: 'unknown', name: 'x', createdAt: 'x', updatedAt: 'x', data: {} });
      expect(() => parseProjectFile(json)).toThrow('Unknown project type');
    });

    it('rejects missing name', () => {
      const json = JSON.stringify({ version: '1.0', type: 'single', createdAt: 'x', updatedAt: 'x', data: {} });
      expect(() => parseProjectFile(json)).toThrow('name must be a string');
    });

    it('rejects single segment with missing temperature', () => {
      const base = makeSingleProject();
      const obj = JSON.parse(serializeProjectFile(base));
      delete obj.data.temperature_c;
      expect(() => parseProjectFile(JSON.stringify(obj))).toThrow('temperature_c must be a number');
    });

    it('rejects multi segment with empty segments', () => {
      const base = makeMultiProject();
      const obj = JSON.parse(serializeProjectFile(base));
      obj.data.segments = [];
      expect(() => parseProjectFile(JSON.stringify(obj))).toThrow('must not be empty');
    });

    it('rejects route with fewer than 2 nodes', () => {
      const base = makeRouteProject();
      const obj = JSON.parse(serializeProjectFile(base));
      obj.data.nodes = [obj.data.nodes[0]];
      expect(() => parseProjectFile(JSON.stringify(obj))).toThrow('at least 2 nodes');
    });

    it('rejects route with invalid elbowConnection', () => {
      const base = makeRouteProject();
      const obj = JSON.parse(serializeProjectFile(base));
      obj.data.elbowConnection = 'glued';
      expect(() => parseProjectFile(JSON.stringify(obj))).toThrow('elbowConnection');
    });

    it('rejects fitting with non-numeric quantity', () => {
      const base = makeSingleProject();
      const obj = JSON.parse(serializeProjectFile(base));
      obj.data.fittings[0].quantity = 'two';
      expect(() => parseProjectFile(JSON.stringify(obj))).toThrow('quantity must be a number');
    });
  });
});
