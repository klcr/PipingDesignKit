/**
 * プロジェクトファイル型定義とバリデーション
 *
 * JSON 形式のプロジェクトファイルの読み書きに使う型。
 * 3 つの計算モード（単セグメント / マルチセグメント / ルート）の
 * UI フォーム状態をシリアライズ可能な形で定義する。
 */

// ── ファイルフォーマットバージョン ──

export const PROJECT_FILE_VERSION = '1.0' as const;

// ── 継手行（共通） ──

export interface FittingRowData {
  readonly fittingId: string;
  readonly quantity: number;
}

// ── 単セグメント ──

export interface SingleSegmentProjectData {
  readonly fluidId?: string;
  readonly temperature_c: number;
  readonly pipeStandard: string;
  readonly nominalSize: string;
  readonly schedule: string;
  readonly materialId: string;
  readonly flowRate_m3h: number;
  readonly length_m: number;
  readonly elevation_m: number;
  readonly fittings: FittingRowData[];
}

// ── マルチセグメント ──

export interface MultiSegmentEntryData {
  readonly pipeStandard: string;
  readonly nominalSize: string;
  readonly schedule: string;
  readonly materialId: string;
  readonly length_m: number;
  readonly elevation_m: number;
  readonly fittings: FittingRowData[];
}

export interface MultiSegmentProjectData {
  readonly fluidId?: string;
  readonly temperature_c: number;
  readonly flowRate_m3h: number;
  readonly segments: MultiSegmentEntryData[];
}

// ── ルート ──

export interface RouteNodeData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly fittings: FittingRowData[];
}

export interface RouteProjectData {
  readonly fluidId?: string;
  readonly temperature_c: number;
  readonly flowRate_m3h: number;
  readonly pipeStandard: string;
  readonly nominalSize: string;
  readonly schedule: string;
  readonly materialId: string;
  readonly elbowConnection: 'welded' | 'threaded';
  readonly use90LongRadius: boolean;
  readonly nodes: RouteNodeData[];
}

// ── プロジェクトファイル（統合型） ──

export type ProjectType = 'single' | 'multi' | 'route';

export interface ProjectFile {
  readonly version: typeof PROJECT_FILE_VERSION;
  readonly type: ProjectType;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly data: SingleSegmentProjectData | MultiSegmentProjectData | RouteProjectData;
}

// ── バリデーション ──

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function validateFittingRows(arr: unknown): FittingRowData[] {
  if (!Array.isArray(arr)) throw new Error('fittings must be an array');
  return arr.map((item, i) => {
    if (!isObject(item)) throw new Error(`fittings[${i}] must be an object`);
    if (!isString(item.fittingId)) throw new Error(`fittings[${i}].fittingId must be a string`);
    if (!isNumber(item.quantity)) throw new Error(`fittings[${i}].quantity must be a number`);
    return { fittingId: item.fittingId, quantity: item.quantity };
  });
}

function validateSingleData(data: unknown): SingleSegmentProjectData {
  if (!isObject(data)) throw new Error('data must be an object');
  if (!isNumber(data.temperature_c)) throw new Error('data.temperature_c must be a number');
  if (!isString(data.pipeStandard)) throw new Error('data.pipeStandard must be a string');
  if (!isString(data.nominalSize)) throw new Error('data.nominalSize must be a string');
  if (!isString(data.schedule)) throw new Error('data.schedule must be a string');
  if (!isString(data.materialId)) throw new Error('data.materialId must be a string');
  if (!isNumber(data.flowRate_m3h)) throw new Error('data.flowRate_m3h must be a number');
  if (!isNumber(data.length_m)) throw new Error('data.length_m must be a number');
  if (!isNumber(data.elevation_m)) throw new Error('data.elevation_m must be a number');
  const fittings = validateFittingRows(data.fittings);
  return {
    temperature_c: data.temperature_c,
    pipeStandard: data.pipeStandard,
    nominalSize: data.nominalSize,
    schedule: data.schedule,
    materialId: data.materialId,
    flowRate_m3h: data.flowRate_m3h,
    length_m: data.length_m,
    elevation_m: data.elevation_m,
    fittings,
  };
}

function validateMultiSegmentEntry(entry: unknown, index: number): MultiSegmentEntryData {
  if (!isObject(entry)) throw new Error(`segments[${index}] must be an object`);
  if (!isString(entry.pipeStandard)) throw new Error(`segments[${index}].pipeStandard must be a string`);
  if (!isString(entry.nominalSize)) throw new Error(`segments[${index}].nominalSize must be a string`);
  if (!isString(entry.schedule)) throw new Error(`segments[${index}].schedule must be a string`);
  if (!isString(entry.materialId)) throw new Error(`segments[${index}].materialId must be a string`);
  if (!isNumber(entry.length_m)) throw new Error(`segments[${index}].length_m must be a number`);
  if (!isNumber(entry.elevation_m)) throw new Error(`segments[${index}].elevation_m must be a number`);
  const fittings = validateFittingRows(entry.fittings);
  return {
    pipeStandard: entry.pipeStandard,
    nominalSize: entry.nominalSize,
    schedule: entry.schedule,
    materialId: entry.materialId,
    length_m: entry.length_m,
    elevation_m: entry.elevation_m,
    fittings,
  };
}

function validateMultiData(data: unknown): MultiSegmentProjectData {
  if (!isObject(data)) throw new Error('data must be an object');
  if (!isNumber(data.temperature_c)) throw new Error('data.temperature_c must be a number');
  if (!isNumber(data.flowRate_m3h)) throw new Error('data.flowRate_m3h must be a number');
  if (!Array.isArray(data.segments)) throw new Error('data.segments must be an array');
  if (data.segments.length === 0) throw new Error('data.segments must not be empty');
  const segments = data.segments.map((s: unknown, i: number) => validateMultiSegmentEntry(s, i));
  return { temperature_c: data.temperature_c, flowRate_m3h: data.flowRate_m3h, segments };
}

function validateRouteNode(node: unknown, index: number): RouteNodeData {
  if (!isObject(node)) throw new Error(`nodes[${index}] must be an object`);
  if (!isString(node.id)) throw new Error(`nodes[${index}].id must be a string`);
  if (!isNumber(node.x)) throw new Error(`nodes[${index}].x must be a number`);
  if (!isNumber(node.y)) throw new Error(`nodes[${index}].y must be a number`);
  if (!isNumber(node.z)) throw new Error(`nodes[${index}].z must be a number`);
  const fittings = validateFittingRows(node.fittings);
  return { id: node.id, x: node.x, y: node.y, z: node.z, fittings };
}

function validateRouteData(data: unknown): RouteProjectData {
  if (!isObject(data)) throw new Error('data must be an object');
  if (!isNumber(data.temperature_c)) throw new Error('data.temperature_c must be a number');
  if (!isNumber(data.flowRate_m3h)) throw new Error('data.flowRate_m3h must be a number');
  if (!isString(data.pipeStandard)) throw new Error('data.pipeStandard must be a string');
  if (!isString(data.nominalSize)) throw new Error('data.nominalSize must be a string');
  if (!isString(data.schedule)) throw new Error('data.schedule must be a string');
  if (!isString(data.materialId)) throw new Error('data.materialId must be a string');
  if (data.elbowConnection !== 'welded' && data.elbowConnection !== 'threaded') {
    throw new Error('data.elbowConnection must be "welded" or "threaded"');
  }
  if (typeof data.use90LongRadius !== 'boolean') {
    throw new Error('data.use90LongRadius must be a boolean');
  }
  if (!Array.isArray(data.nodes)) throw new Error('data.nodes must be an array');
  if (data.nodes.length < 2) throw new Error('data.nodes must have at least 2 nodes');
  const nodes = data.nodes.map((n: unknown, i: number) => validateRouteNode(n, i));
  return {
    temperature_c: data.temperature_c,
    flowRate_m3h: data.flowRate_m3h,
    pipeStandard: data.pipeStandard,
    nominalSize: data.nominalSize,
    schedule: data.schedule,
    materialId: data.materialId,
    elbowConnection: data.elbowConnection,
    use90LongRadius: data.use90LongRadius,
    nodes,
  };
}

/**
 * JSON 文字列をパースしてバリデーション済みの ProjectFile を返す。
 * 不正な入力は Error をスローする。
 */
export function parseProjectFile(jsonString: string): ProjectFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (!isObject(parsed)) throw new Error('Project file must be a JSON object');
  if (parsed.version !== PROJECT_FILE_VERSION) {
    throw new Error(`Unsupported version: ${String(parsed.version)} (expected ${PROJECT_FILE_VERSION})`);
  }
  if (!isString(parsed.name)) throw new Error('name must be a string');
  if (!isString(parsed.createdAt)) throw new Error('createdAt must be a string');
  if (!isString(parsed.updatedAt)) throw new Error('updatedAt must be a string');

  const type = parsed.type;
  if (type !== 'single' && type !== 'multi' && type !== 'route') {
    throw new Error(`Unknown project type: ${String(type)}`);
  }

  let data: SingleSegmentProjectData | MultiSegmentProjectData | RouteProjectData;
  switch (type) {
    case 'single':
      data = validateSingleData(parsed.data);
      break;
    case 'multi':
      data = validateMultiData(parsed.data);
      break;
    case 'route':
      data = validateRouteData(parsed.data);
      break;
  }

  return {
    version: PROJECT_FILE_VERSION,
    type,
    name: parsed.name,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    data,
  };
}

/**
 * ProjectFile を整形 JSON 文字列にシリアライズする。
 */
export function serializeProjectFile(project: ProjectFile): string {
  return JSON.stringify(project, null, 2);
}
