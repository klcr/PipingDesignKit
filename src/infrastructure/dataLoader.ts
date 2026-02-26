/**
 * データ読み込み一元管理
 *
 * 全 JSON データファイルのインポートと型キャストをこのモジュールに集約する。
 * UI 層や application 層からは直接 data/ を import しない。
 */

import { WaterData } from '@domain/fluid/waterProperties';
import { FluidTableData } from '@domain/fluid/fluidProperties';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';
import type {
  ConcentrationUnit,
  SolutionMethod,
  LaliberteData,
  MelinderData,
  SucroseData,
  MethanolWaterData,
  EthanolWaterData,
} from '@domain/fluid/solutionTypes';
import type { SolutionInput } from '@domain/fluid/aqueousSolution';

import waterJson from '@data/fluid-properties/water.json';
import seawaterJson from '@data/fluid-properties/seawater.json';
import craneJson from '@data/fittings-db/crane-tp410.json';
import ftJson from '@data/fittings-db/ft-values.json';
import roughnessJson from '@data/pipe-specs/surface-roughness.json';
import ansiJson from '@data/pipe-specs/ansi-b36.10m.json';
import jisJson from '@data/pipe-specs/jis-g3452-sgp.json';
import pumpJson from '@data/pump-curves/sample-centrifugal.json';
import pumpTypeJson from '@data/pump-specs/pump-type-classification.json';

// 水溶液データ
import laliberteJson from '@data/fluid-properties/laliberte-coefficients.json';
import melinderEgJson from '@data/fluid-properties/melinder-eg-water.json';
import melinderPgJson from '@data/fluid-properties/melinder-pg-water.json';
import sucroseJson from '@data/fluid-properties/sucrose-water.json';
import methanolJson from '@data/fluid-properties/methanol-water.json';
import ethanolJson from '@data/fluid-properties/ethanol-water.json';

// ── データ形状型（JSON スキーマに対応） ──

export interface AnsiSchedule {
  readonly schedule: string;
  readonly wall_mm: number;
  readonly id_mm: number;
}

export interface AnsiSize {
  readonly nps: string;
  readonly dn: number;
  readonly od_mm: number;
  readonly schedules: readonly AnsiSchedule[];
}

export interface AnsiData {
  readonly standard: string;
  readonly referenceId: string;
  readonly sizes: readonly AnsiSize[];
}

export interface JisSize {
  readonly nps: string;
  readonly dn: number;
  readonly od_mm: number;
  readonly wall_mm: number;
  readonly id_mm: number;
}

export interface JisData {
  readonly standard: string;
  readonly grade: string;
  readonly referenceId: string;
  readonly sizes: readonly JisSize[];
}

export interface RoughnessMaterial {
  readonly id: string;
  readonly name: string;
  readonly name_ja: string;
  readonly roughness_mm: number;
  readonly roughness_in: number;
}

export interface RoughnessData {
  readonly referenceId: string;
  readonly materials: readonly RoughnessMaterial[];
}

// ── ポンプカーブ型 ──

export interface PumpCurvePoint {
  readonly flow_m3h: number;
  readonly head_m: number;
  readonly efficiency_pct: number;
  readonly npshr_m: number;
}

export interface PumpCurveData {
  readonly referenceId: string;
  readonly pumpId: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly description: string;
  readonly description_ja?: string;
  readonly rated_speed_rpm: number;
  readonly suction_nps: string;
  readonly discharge_nps: string;
  readonly performance_curve: readonly PumpCurvePoint[];
}

// ── 型キャスト済みデータエクスポート ──

export const waterData = waterJson as unknown as WaterData;
export const craneData = craneJson as unknown as CraneData;
export const ftData = ftJson as unknown as FtData;
export const roughnessData = roughnessJson as unknown as RoughnessData;
export const ansiData = ansiJson as unknown as AnsiData;
export const jisData = jisJson as unknown as JisData;
export const samplePumpData = pumpJson as unknown as PumpCurveData;

// ── ポンプタイプ分類データ ──

import type { PumpTypeClassification } from '@domain/system/pumpRequirements';

interface PumpTypeClassificationData {
  readonly referenceId: string;
  readonly classifications: readonly PumpTypeClassification[];
  readonly reference: { readonly source: string; readonly page: string };
}

const pumpTypeData = pumpTypeJson as unknown as PumpTypeClassificationData;
export const pumpTypeClassifications = pumpTypeData.classifications;

// ── 水溶液データの型キャスト ──

export const laliberteData = laliberteJson as unknown as LaliberteData;
const melinderEgData = melinderEgJson as unknown as MelinderData;
const melinderPgData = melinderPgJson as unknown as MelinderData;
const sucroseData = sucroseJson as unknown as SucroseData;
const methanolData = methanolJson as unknown as MethanolWaterData;
const ethanolData = ethanolJson as unknown as EthanolWaterData;

// ── 流体データレジストリ（統合版） ──

/** 単純流体（温度のみ）のID */
export type SimpleFluidId = 'water' | 'seawater';

/** 水溶液（温度＋濃度）のID */
export type SolutionId =
  | 'eg_water'          // エチレングリコール–水
  | 'pg_water'          // プロピレングリコール–水
  | 'nacl'              // 塩化ナトリウム
  | 'cacl2'             // 塩化カルシウム
  | 'naoh'              // 水酸化ナトリウム
  | 'koh'               // 水酸化カリウム
  | 'hcl'               // 塩酸
  | 'h2so4'             // 硫酸
  | 'h3po4'             // リン酸
  | 'sucrose'           // スクロース
  | 'methanol_water'    // メタノール–水
  | 'ethanol_water'     // エタノール–水
  | 'k2co3'             // 炭酸カリウム
  | 'na2co3'            // 炭酸ナトリウム
  | 'mgcl2'             // 塩化マグネシウム
  | 'kcl'               // 塩化カリウム
  ;

/** 全流体ID */
export type FluidId = SimpleFluidId | SolutionId;

/** 流体エントリ基本型 */
interface FluidEntryBase {
  readonly id: FluidId;
  readonly name: string;
  readonly name_ja: string;
  readonly tempRange: { min: number; max: number };
}

/** 単純流体エントリ（テーブル補間方式） */
export interface SimpleFluidEntry extends FluidEntryBase {
  readonly kind: 'simple';
  readonly data: FluidTableData;
}

/** 水溶液エントリ（濃度可変） */
export interface SolutionFluidEntry extends FluidEntryBase {
  readonly kind: 'solution';
  readonly method: SolutionMethod;
  readonly concentrationUnit: ConcentrationUnit;
  readonly concentrationRange: { readonly min: number; readonly max: number };
  readonly defaultConcentration: number;
}

export type FluidEntry = SimpleFluidEntry | SolutionFluidEntry;

// ── Laliberté ヘルパー: 溶質formulaからSolutionInputを構築 ──

function makeLaliberteSolutionInput(formula: string): SolutionInput {
  const solute = laliberteData.solutes[formula];
  if (!solute) throw new Error(`Unknown Laliberté solute: ${formula}`);
  return {
    method: 'laliberte',
    solute,
    reference: {
      source: laliberteData.reference.source,
      equation: `Laliberté model — ${formula}`,
    },
  };
}

/** Laliberté溶質のformulaマッピング */
const laliberteFormulaMap: Record<string, string> = {
  nacl: 'NaCl',
  cacl2: 'CaCl2',
  naoh: 'NaOH',
  koh: 'KOH',
  hcl: 'HCl',
  h2so4: 'H2SO4',
  h3po4: 'H3PO4',
  k2co3: 'K2CO3',
  na2co3: 'Na2CO3',
  mgcl2: 'MgCl2',
  kcl: 'KCl',
};

// ── 統合レジストリ ──

const fluidRegistry: readonly FluidEntry[] = [
  // 単純流体
  {
    kind: 'simple',
    id: 'water',
    name: 'Water',
    name_ja: '水',
    data: waterJson as unknown as FluidTableData,
    tempRange: { min: 0, max: 200 },
  },
  {
    kind: 'simple',
    id: 'seawater',
    name: 'Seawater (3.5%)',
    name_ja: '海水 (3.5%)',
    data: seawaterJson as unknown as FluidTableData,
    tempRange: { min: 0, max: 80 },
  },
  // グリコール水溶液 (Melinder)
  {
    kind: 'solution',
    id: 'eg_water',
    name: 'Ethylene Glycol - Water',
    name_ja: 'エチレングリコール水溶液',
    method: 'melinder',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 60 },
    defaultConcentration: 30,
    tempRange: { min: -30, max: 100 },
  },
  {
    kind: 'solution',
    id: 'pg_water',
    name: 'Propylene Glycol - Water',
    name_ja: 'プロピレングリコール水溶液',
    method: 'melinder',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 5, max: 60 },
    defaultConcentration: 30,
    tempRange: { min: -50, max: 100 },
  },
  // 電解質水溶液 (Laliberté)
  {
    kind: 'solution',
    id: 'nacl',
    name: 'NaCl (Brine)',
    name_ja: '塩化ナトリウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 26 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'cacl2',
    name: 'CaCl₂ (Brine)',
    name_ja: '塩化カルシウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 30 },
    defaultConcentration: 15,
    tempRange: { min: -40, max: 100 },
  },
  {
    kind: 'solution',
    id: 'naoh',
    name: 'NaOH (Caustic Soda)',
    name_ja: '水酸化ナトリウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 50 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'koh',
    name: 'KOH (Potassium Hydroxide)',
    name_ja: '水酸化カリウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 50 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'hcl',
    name: 'HCl (Hydrochloric Acid)',
    name_ja: '塩酸',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 37 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 60 },
  },
  {
    kind: 'solution',
    id: 'h2so4',
    name: 'H₂SO₄ (Sulfuric Acid)',
    name_ja: '硫酸',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 80 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'h3po4',
    name: 'H₃PO₄ (Phosphoric Acid)',
    name_ja: 'リン酸',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 60 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'k2co3',
    name: 'K₂CO₃ (Potassium Carbonate)',
    name_ja: '炭酸カリウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 50 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'na2co3',
    name: 'Na₂CO₃ (Sodium Carbonate)',
    name_ja: '炭酸ナトリウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 30 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'mgcl2',
    name: 'MgCl₂ (Magnesium Chloride)',
    name_ja: '塩化マグネシウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 30 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  {
    kind: 'solution',
    id: 'kcl',
    name: 'KCl (Potassium Chloride)',
    name_ja: '塩化カリウム水溶液',
    method: 'laliberte',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 26 },
    defaultConcentration: 10,
    tempRange: { min: 0, max: 100 },
  },
  // スクロース
  {
    kind: 'solution',
    id: 'sucrose',
    name: 'Sucrose - Water',
    name_ja: 'スクロース（砂糖）水溶液',
    method: 'genotelle',
    concentrationUnit: 'Brix',
    concentrationRange: { min: 0, max: 75 },
    defaultConcentration: 30,
    tempRange: { min: 0, max: 80 },
  },
  // アルコール系
  {
    kind: 'solution',
    id: 'methanol_water',
    name: 'Methanol - Water',
    name_ja: 'メタノール水溶液',
    method: 'asada',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 100 },
    defaultConcentration: 30,
    tempRange: { min: 15, max: 55 },
  },
  {
    kind: 'solution',
    id: 'ethanol_water',
    name: 'Ethanol - Water',
    name_ja: 'エタノール水溶液',
    method: 'ethanol_rk',
    concentrationUnit: 'wt%',
    concentrationRange: { min: 0, max: 100 },
    defaultConcentration: 30,
    tempRange: { min: 15, max: 50 },
  },
];

/**
 * 利用可能な流体一覧を返す（UI ドロップダウン用）
 */
export function getAvailableFluids(): readonly FluidEntry[] {
  return fluidRegistry;
}

/**
 * 流体IDからエントリを取得する
 */
export function getFluidEntry(fluidId: FluidId): FluidEntry {
  const entry = fluidRegistry.find(f => f.id === fluidId);
  if (!entry) throw new Error(`Unknown fluid: ${fluidId}`);
  return entry;
}

/**
 * 流体IDから流体データを取得する（単純流体用・後方互換）
 */
export function getFluidData(fluidId: FluidId): FluidTableData {
  const entry = getFluidEntry(fluidId);
  if (entry.kind !== 'simple') {
    throw new Error(`Fluid ${fluidId} is a solution — use getSolutionInput() instead`);
  }
  return entry.data;
}

/**
 * 流体IDから温度範囲を取得する
 */
export function getFluidTempRange(fluidId: FluidId): { min: number; max: number } {
  return getFluidEntry(fluidId).tempRange;
}

/**
 * 水溶液の SolutionInput を構築する
 */
export function getSolutionInput(fluidId: SolutionId): SolutionInput {
  const entry = getFluidEntry(fluidId);
  if (entry.kind !== 'solution') {
    throw new Error(`Fluid ${fluidId} is not a solution`);
  }

  switch (entry.method) {
    case 'laliberte': {
      const formula = laliberteFormulaMap[fluidId];
      if (!formula) throw new Error(`No Laliberté formula for: ${fluidId}`);
      return makeLaliberteSolutionInput(formula);
    }
    case 'melinder':
      return {
        method: 'melinder',
        data: fluidId === 'eg_water' ? melinderEgData : melinderPgData,
      };
    case 'genotelle':
      return { method: 'genotelle', data: sucroseData };
    case 'asada':
      return { method: 'asada', data: methanolData };
    case 'ethanol_rk':
      return { method: 'ethanol_rk', data: ethanolData };
    default:
      throw new Error(`Unknown method: ${entry.method}`);
  }
}

// ── 継手セレクタ用ヘルパー ──

/**
 * 利用可能な継手一覧を返す（UI ドロップダウン用）
 */
export function getAvailableFittings(): { id: string; description: string; description_ja?: string }[] {
  const items: { id: string; description: string; description_ja?: string }[] = [];
  for (const f of craneData.fittings) items.push({ id: f.id, description: f.description, description_ja: f.description_ja });
  for (const e of craneData.entrances) items.push({ id: e.id, description: e.description, description_ja: e.description_ja });
  for (const x of craneData.exits) items.push({ id: x.id, description: x.description, description_ja: x.description_ja });
  return items;
}
