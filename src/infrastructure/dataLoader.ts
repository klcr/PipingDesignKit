/**
 * データ読み込み一元管理
 *
 * 全 JSON データファイルのインポートと型キャストをこのモジュールに集約する。
 * UI 層や application 層からは直接 data/ を import しない。
 */

import { WaterData } from '@domain/fluid/waterProperties';
import { FluidTableData } from '@domain/fluid/fluidProperties';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';

import waterJson from '@data/fluid-properties/water.json';
import seawaterJson from '@data/fluid-properties/seawater.json';
import eg30Json from '@data/fluid-properties/ethylene-glycol-30.json';
import eg50Json from '@data/fluid-properties/ethylene-glycol-50.json';
import craneJson from '@data/fittings-db/crane-tp410.json';
import ftJson from '@data/fittings-db/ft-values.json';
import roughnessJson from '@data/pipe-specs/surface-roughness.json';
import ansiJson from '@data/pipe-specs/ansi-b36.10m.json';
import jisJson from '@data/pipe-specs/jis-g3452-sgp.json';
import pumpJson from '@data/pump-curves/sample-centrifugal.json';
import pumpTypeJson from '@data/pump-specs/pump-type-classification.json';

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

// ── 流体データレジストリ ──

export type FluidId = 'water' | 'seawater' | 'ethylene_glycol_30' | 'ethylene_glycol_50';

interface FluidEntry {
  readonly id: FluidId;
  readonly name: string;
  readonly name_ja: string;
  readonly data: FluidTableData;
  readonly tempRange: { min: number; max: number };
}

const fluidRegistry: readonly FluidEntry[] = [
  {
    id: 'water',
    name: 'Water',
    name_ja: '水',
    data: waterJson as unknown as FluidTableData,
    tempRange: { min: 0, max: 200 },
  },
  {
    id: 'seawater',
    name: 'Seawater (3.5%)',
    name_ja: '海水 (3.5%)',
    data: seawaterJson as unknown as FluidTableData,
    tempRange: { min: 0, max: 80 },
  },
  {
    id: 'ethylene_glycol_30',
    name: 'Ethylene Glycol 30%',
    name_ja: 'エチレングリコール 30%',
    data: eg30Json as unknown as FluidTableData,
    tempRange: { min: -10, max: 100 },
  },
  {
    id: 'ethylene_glycol_50',
    name: 'Ethylene Glycol 50%',
    name_ja: 'エチレングリコール 50%',
    data: eg50Json as unknown as FluidTableData,
    tempRange: { min: -30, max: 100 },
  },
];

/**
 * 利用可能な流体一覧を返す（UI ドロップダウン用）
 */
export function getAvailableFluids(): readonly FluidEntry[] {
  return fluidRegistry;
}

/**
 * 流体IDから流体データを取得する
 */
export function getFluidData(fluidId: FluidId): FluidTableData {
  const entry = fluidRegistry.find(f => f.id === fluidId);
  if (!entry) throw new Error(`Unknown fluid: ${fluidId}`);
  return entry.data;
}

/**
 * 流体IDから温度範囲を取得する
 */
export function getFluidTempRange(fluidId: FluidId): { min: number; max: number } {
  const entry = fluidRegistry.find(f => f.id === fluidId);
  if (!entry) throw new Error(`Unknown fluid: ${fluidId}`);
  return entry.tempRange;
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
