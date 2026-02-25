import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Locale, I18nContext } from './types';
import ja from './ja';
import en from './en';

const dictionaries: Record<Locale, Record<string, string>> = { ja, en };

const I18n = createContext<I18nContext | null>(null);

export function I18nProvider({ children, defaultLocale = 'ja' }: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  const t = useCallback(
    (key: string): string => dictionaries[locale][key] ?? key,
    [locale]
  );

  return (
    <I18n.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18n.Provider>
  );
}

export function useTranslation(): I18nContext {
  const ctx = useContext(I18n);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
