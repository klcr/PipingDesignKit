import { useState, useRef } from 'react';
import { I18nProvider, useTranslation } from './ui/i18n/context';
import { LanguageSwitcher } from './ui/components/LanguageSwitcher';
import { PipeLossCalculator, PipeLossCalculatorHandle } from './ui/features/PipeLossCalculator';
import { MultiSegmentCalculator, MultiSegmentCalculatorHandle } from './ui/features/MultiSegmentCalculator';
import { RouteEditor, RouteEditorHandle } from './ui/features/RouteEditor';
import { PumpChart } from './ui/features/PumpChart';
import {
  ProjectFile,
  SingleSegmentProjectData,
  MultiSegmentProjectData,
  RouteProjectData,
} from './infrastructure/persistence/projectFile';
import {
  downloadProjectFile,
  openProjectFile,
  createSingleSegmentProject,
  createMultiSegmentProject,
  createRouteProject,
} from './infrastructure/persistence/fileIO';

type TabKey = 'single' | 'multi' | 'route' | 'pump';

function AppContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('single');

  // Refs for extracting state from child components
  const singleRef = useRef<PipeLossCalculatorHandle>(null);
  const multiRef = useRef<MultiSegmentCalculatorHandle>(null);
  const routeRef = useRef<RouteEditorHandle>(null);

  // Loaded project data (for passing initial state after import)
  const [loadedProject, setLoadedProject] = useState<ProjectFile | null>(null);
  // Key to force re-mount on import
  const [mountKey, setMountKey] = useState(0);
  // Import error
  const [importError, setImportError] = useState<string | null>(null);
  // Project name
  const [projectName, setProjectName] = useState('');

  const handleExport = () => {
    setImportError(null);
    const name = projectName.trim() || t('project.default_name');

    let project: ProjectFile;
    if (activeTab === 'single' && singleRef.current) {
      project = createSingleSegmentProject(name, singleRef.current.getProjectData());
    } else if (activeTab === 'multi' && multiRef.current) {
      project = createMultiSegmentProject(name, multiRef.current.getProjectData());
    } else if (activeTab === 'route' && routeRef.current) {
      project = createRouteProject(name, routeRef.current.getProjectData());
    } else {
      return;
    }

    downloadProjectFile(project);
  };

  const handleImport = async () => {
    setImportError(null);
    try {
      const project = await openProjectFile();
      if (!project) return; // user cancelled

      setLoadedProject(project);
      setActiveTab(project.type as TabKey);
      setProjectName(project.name);
      setMountKey(prev => prev + 1);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  // Determine initial data for each tab based on loaded project
  const singleInitial = loadedProject?.type === 'single'
    ? loadedProject.data as SingleSegmentProjectData : undefined;
  const multiInitial = loadedProject?.type === 'multi'
    ? loadedProject.data as MultiSegmentProjectData : undefined;
  const routeInitial = loadedProject?.type === 'route'
    ? loadedProject.data as RouteProjectData : undefined;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
          <p style={{ margin: '4px 0 0', color: '#666' }}>{t('app.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Project toolbar */}
      <div style={{
        display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px',
        padding: '8px 12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder={t('project.name_placeholder')}
          style={{
            padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px',
            fontSize: '0.9em', flex: '1 1 150px', minWidth: '120px',
          }}
        />
        <button onClick={handleExport} style={toolbarBtnStyle}>
          {t('project.export')}
        </button>
        <button onClick={handleImport} style={toolbarBtnStyle}>
          {t('project.import')}
        </button>
      </div>

      {importError && (
        <div style={{ color: '#c00', fontSize: '0.85em', marginBottom: '8px', padding: '6px 12px', background: '#fff0f0', borderRadius: '4px' }}>
          {t('project.import_error')}: {importError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <TabButton label={t('tab.single')} active={activeTab === 'single'} onClick={() => setActiveTab('single')} />
        <TabButton label={t('tab.multi')} active={activeTab === 'multi'} onClick={() => setActiveTab('multi')} />
        <TabButton label={t('tab.route')} active={activeTab === 'route'} onClick={() => setActiveTab('route')} />
        <TabButton label={t('tab.pump')} active={activeTab === 'pump'} onClick={() => setActiveTab('pump')} />
      </div>

      {activeTab === 'single' && <PipeLossCalculator key={`single-${mountKey}`} ref={singleRef} initialData={singleInitial} />}
      {activeTab === 'multi' && <MultiSegmentCalculator key={`multi-${mountKey}`} ref={multiRef} initialData={multiInitial} />}
      {activeTab === 'route' && <RouteEditor key={`route-${mountKey}`} ref={routeRef} initialData={routeInitial} />}
      {activeTab === 'pump' && <PumpChart />}
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

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #0066cc',
  borderRadius: '4px',
  background: '#fff',
  color: '#0066cc',
  fontSize: '0.85em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function App() {
  return (
    <I18nProvider defaultLocale="ja">
      <AppContent />
    </I18nProvider>
  );
}
