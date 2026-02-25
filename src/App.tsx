import { useState } from 'react';
import { I18nProvider, useTranslation } from './ui/i18n/context';
import { LanguageSwitcher } from './ui/components/LanguageSwitcher';
import { PipeLossCalculator } from './ui/features/PipeLossCalculator';
import { MultiSegmentCalculator } from './ui/features/MultiSegmentCalculator';
import { RouteEditor } from './ui/features/RouteEditor';

type TabKey = 'single' | 'multi' | 'route';

function AppContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('single');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
          <p style={{ margin: '4px 0 0', color: '#666' }}>{t('app.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <TabButton label={t('tab.single')} active={activeTab === 'single'} onClick={() => setActiveTab('single')} />
        <TabButton label={t('tab.multi')} active={activeTab === 'multi'} onClick={() => setActiveTab('multi')} />
        <TabButton label={t('tab.route')} active={activeTab === 'route'} onClick={() => setActiveTab('route')} />
      </div>

      {activeTab === 'single' && <PipeLossCalculator />}
      {activeTab === 'multi' && <MultiSegmentCalculator />}
      {activeTab === 'route' && <RouteEditor />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 20px',
        border: 'none',
        borderBottom: active ? '2px solid #0066cc' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#0066cc' : '#666',
        fontWeight: active ? 'bold' : 'normal',
        fontSize: '0.95em',
        cursor: 'pointer',
        marginBottom: '-2px',
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  return (
    <I18nProvider defaultLocale="ja">
      <AppContent />
    </I18nProvider>
  );
}
