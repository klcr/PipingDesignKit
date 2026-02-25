import { Locale } from './types';

/**
 * データ駆動の多言語名を選択するヘルパー
 * JSON データの name/name_ja や description/description_ja を locale に応じて返す
 */
export function localizedName(locale: Locale, name: string, name_ja?: string): string {
  return locale === 'ja' && name_ja ? name_ja : name;
}
