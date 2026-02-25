export type Locale = 'ja' | 'en';

export type TranslationKey = keyof typeof import('./ja').default;

export interface I18nContext {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}
