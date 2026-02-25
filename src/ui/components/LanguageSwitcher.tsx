import { useTranslation } from '../i18n/context';
import { Locale } from '../i18n/types';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  const handleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button
        onClick={() => handleChange('ja')}
        style={{
          padding: '4px 8px',
          fontWeight: locale === 'ja' ? 'bold' : 'normal',
          background: locale === 'ja' ? '#0066cc' : '#e0e0e0',
          color: locale === 'ja' ? '#fff' : '#333',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        日本語
      </button>
      <button
        onClick={() => handleChange('en')}
        style={{
          padding: '4px 8px',
          fontWeight: locale === 'en' ? 'bold' : 'normal',
          background: locale === 'en' ? '#0066cc' : '#e0e0e0',
          color: locale === 'en' ? '#fff' : '#333',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        English
      </button>
    </div>
  );
}
