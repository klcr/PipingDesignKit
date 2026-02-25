/**
 * 配管スペック解決 — NPS + Schedule → PipeSpec
 *
 * ANSI B36.10M と JIS G3452 の配管データから
 * ユーザー選択を PipeSpec ドメイン型に変換する。
 */

import { PipeSpec } from '@domain/types';
import { ansiData, jisData } from './dataLoader';

export type PipeStandardKey = 'ansi' | 'jis-sgp';

export interface PipeSizeOption {
  readonly nps: string;
  readonly dn: number;
}

/**
 * 配管規格から利用可能なサイズ一覧を返す
 */
export function getAvailableSizes(standard: PipeStandardKey): PipeSizeOption[] {
  if (standard === 'ansi') {
    return ansiData.sizes.map(s => ({ nps: s.nps, dn: s.dn }));
  }
  return jisData.sizes.map(s => ({ nps: s.nps, dn: s.dn }));
}

/**
 * ANSI の場合: NPS に対する利用可能スケジュール一覧を返す
 * JIS の場合は空配列を返す（スケジュール概念なし）
 */
export function getAvailableSchedules(standard: PipeStandardKey, nps: string): string[] {
  if (standard !== 'ansi') return [];
  const size = ansiData.sizes.find(s => s.nps === nps);
  return size?.schedules.map(s => s.schedule) ?? [];
}

/**
 * NPS + Schedule → PipeSpec 解決
 * JIS の場合は schedule 不要
 */
export function resolvePipeSpec(
  standard: PipeStandardKey,
  nps: string,
  schedule?: string
): PipeSpec | null {
  if (standard === 'ansi') {
    const size = ansiData.sizes.find(s => s.nps === nps);
    if (!size) return null;
    const sch = size.schedules.find(s => s.schedule === schedule);
    if (!sch) return null;
    return {
      standard: 'ASME B36.10M',
      nps: size.nps,
      dn: size.dn,
      od_mm: size.od_mm,
      wall_mm: sch.wall_mm,
      id_mm: sch.id_mm,
      schedule: sch.schedule,
    };
  }

  const size = jisData.sizes.find(s => s.nps === nps);
  if (!size) return null;
  return {
    standard: 'JIS G 3452 SGP',
    nps: size.nps,
    dn: size.dn,
    od_mm: size.od_mm,
    wall_mm: size.wall_mm,
    id_mm: size.id_mm,
  };
}
