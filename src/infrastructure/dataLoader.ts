/**
 * データ読み込み一元管理
 *
 * 全 JSON データファイルのインポートと型キャストをこのモジュールに集約する。
 * UI 層や application 層からは直接 data/ を import しない。
 */

import { WaterData } from '@domain/fluid/waterProperties';
import { CraneData, FtData } from '@domain/fittings/fittingLoss';

import waterJson from '@data/fluid-properties/water.json';
import craneJson from '@data/fittings-db/crane-tp410.json';
import ftJson from '@data/fittings-db/ft-values.json';
import roughnessJson from '@data/pipe-specs/surface-roughness.json';
import ansiJson from '@data/pipe-specs/ansi-b36.10m.json';
import jisJson from '@data/pipe-specs/jis-g3452-sgp.json';

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

// ── 型キャスト済みデータエクスポート ──

export const waterData = waterJson as unknown as WaterData;
export const craneData = craneJson as unknown as CraneData;
export const ftData = ftJson as unknown as FtData;
export const roughnessData = roughnessJson as unknown as RoughnessData;
export const ansiData = ansiJson as unknown as AnsiData;
export const jisData = jisJson as unknown as JisData;

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
