import { useState, useRef, useCallback, useEffect } from 'react';
import { I18nProvider, useTranslation } from './ui/i18n/context';
import { useBreakpoint } from './ui/hooks/useBreakpoint';
import { LanguageSwitcher } from './ui/components/LanguageSwitcher';
import { PipeLossCalculator, PipeLossCalculatorHandle } from './ui/features/PipeLossCalculator';
import { MultiSegmentCalculator, MultiSegmentCalculatorHandle } from './ui/features/MultiSegmentCalculator';
import { RouteEditor, RouteEditorHandle } from './ui/features/RouteEditor';
import { PumpChart, PumpSelectionInput, PumpResultSummary, SourceTab } from './ui/features/PumpChart';
import { ExplanationTab } from './ui/features/explanation/ExplanationTab';
import type { ExplanationSnapshot, PumpExplanationSnapshot } from './ui/features/explanation/types';
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
  downloadProjectListFile,
  openProjectListFile,
} from './infrastructure/persistence/fileIO';

type TabKey = 'single' | 'multi' | 'route' | 'pump' | 'explain';

const STORAGE_KEY = 'pipingDesignKit_projectList';

const containerMaxWidth: Record<string, string> = {
  mobile: '100%',
  tablet: '900px',
  desktop: '1100px',
  wide: '1400px',
};

function loadProjectListFromStorage(): ProjectFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function AppContent() {
  const { t } = useTranslation();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const [activeTab, setActiveTab] = useState<TabKey>('single');

  // Tab locking: when a calculation is performed, lock other calc tabs
  const [lockedTab, setLockedTab] = useState<TabKey | null>(null);
  const calcTabs: TabKey[] = ['single', 'multi', 'route'];
  const isTabDisabled = (tab: TabKey) =>
    lockedTab !== null && calcTabs.includes(tab) && tab !== lockedTab;

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

  // Pump selection input from pressure loss calculation
  const [pumpInput, setPumpInput] = useState<PumpSelectionInput | null>(null);

  // Pump result summary (for quick view in calculator tabs)
  const [pumpResult, setPumpResult] = useState<PumpResultSummary | null>(null);

  // Explanation tab snapshots
  const [explanationSnapshot, setExplanationSnapshot] = useState<ExplanationSnapshot | null>(null);
  const [pumpExplanation, setPumpExplanation] = useState<PumpExplanationSnapshot | null>(null);

  // Project list (persisted to localStorage)
  const [projectList, setProjectList] = useState<ProjectFile[]>(loadProjectListFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectList));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [projectList]);

  const handleSendToPump = useCallback((input: PumpSelectionInput) => {
    setPumpInput(input);
    setActiveTab('pump');
  }, []);

  const handleSendToExplanation = useCallback((snapshot: ExplanationSnapshot) => {
    setExplanationSnapshot(snapshot);
    setActiveTab('explain');
  }, []);

  const handleSendPumpToExplanation = useCallback((snapshot: PumpExplanationSnapshot) => {
    setPumpExplanation(snapshot);
    setActiveTab('explain');
  }, []);

  const handlePumpResultUpdate = useCallback((result: PumpResultSummary) => {
    setPumpResult(result);
  }, []);

  const handleGoToSourceTab = useCallback((tab: SourceTab) => {
    setActiveTab(tab);
  }, []);

  const handleGoToPumpTab = useCallback(() => {
    setActiveTab('pump');
  }, []);

  // Lock tab when a calculation is performed
  const handleCalculated = useCallback((tab: TabKey) => {
    setLockedTab(tab);
  }, []);

  // Reset: clear results lock + pump data (input values are preserved by each calculator)
  const handleReset = useCallback(() => {
    setLockedTab(null);
    setPumpResult(null);
    setPumpInput(null);
  }, []);

  // Silent pump update: update pump input without switching tabs
  const handleUpdatePumpSilently = useCallback((input: PumpSelectionInput) => {
    setPumpInput(input);
  }, []);

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

  // ── Project list handlers ──

  const handleRegisterToList = () => {
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

    setProjectList(prev => [...prev, project]);
  };

  const handleLoadFromList = useCallback((project: ProjectFile) => {
    setLoadedProject(project);
    setActiveTab(project.type as TabKey);
    setProjectName(project.name);
    setMountKey(prev => prev + 1);
  }, []);

  const handleRemoveFromList = useCallback((index: number) => {
    setProjectList(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleBulkExport = () => {
    if (projectList.length === 0) return;
    downloadProjectListFile(projectList, 'project_list');
  };

  const handleBulkImport = async () => {
    setImportError(null);
    try {
      const listFile = await openProjectListFile();
      if (!listFile) return;
      setProjectList(prev => [...prev, ...listFile.projects]);
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
    <div style={{ display: 'flex', maxWidth: isMobile ? '100%' : '1600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Left panel: Project List */}
      {!isMobile && (
        <ProjectListPanel
          projects={projectList}
          onLoad={handleLoadFromList}
          onRemove={handleRemoveFromList}
          onBulkExport={handleBulkExport}
          onBulkImport={handleBulkImport}
          t={t}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: containerMaxWidth[bp], padding: isMobile ? '12px' : '20px' }}>
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
          <button onClick={handleRegisterToList} style={toolbarBtnRegisterStyle}>
            {t('projectList.register')}
          </button>
        </div>

        {importError && (
          <div style={{ color: '#c00', fontSize: '0.85em', marginBottom: '8px', padding: '6px 12px', background: '#fff0f0', borderRadius: '4px' }}>
            {t('project.import_error')}: {importError}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0', marginBottom: '20px', borderBottom: '2px solid #ddd', alignItems: 'center' }}>
          <TabButton label={t('tab.single')} active={activeTab === 'single'} onClick={() => setActiveTab('single')} compact={isMobile} disabled={isTabDisabled('single')} />
          <TabButton label={t('tab.multi')} active={activeTab === 'multi'} onClick={() => setActiveTab('multi')} compact={isMobile} disabled={isTabDisabled('multi')} />
          <TabButton label={t('tab.route')} active={activeTab === 'route'} onClick={() => setActiveTab('route')} compact={isMobile} disabled={isTabDisabled('route')} />
          <TabButton label={t('tab.pump')} active={activeTab === 'pump'} onClick={() => setActiveTab('pump')} compact={isMobile} />
          <TabButton label={t('tab.explain')} active={activeTab === 'explain'} onClick={() => setActiveTab('explain')} compact={isMobile} />
          {lockedTab && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75em', color: '#888' }}>{t('tab.locked_hint')}</span>
              <button
                onClick={handleReset}
                style={{
                  padding: '4px 12px', border: '1px solid #c00', borderRadius: '4px',
                  background: '#fff', color: '#c00', fontSize: '0.8em', cursor: 'pointer',
                  marginBottom: '-2px', whiteSpace: 'nowrap',
                }}
              >
                {t('action.reset')}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: activeTab === 'single' ? 'block' : 'none' }}>
          <PipeLossCalculator key={`single-${mountKey}`} ref={singleRef} initialData={singleInitial} onSendToPump={handleSendToPump} onSendToExplanation={handleSendToExplanation} pumpResult={pumpResult} onGoToPumpTab={handleGoToPumpTab} onCalculated={() => handleCalculated('single')} onReset={handleReset} onUpdatePumpSilently={handleUpdatePumpSilently} />
        </div>
        <div style={{ display: activeTab === 'multi' ? 'block' : 'none' }}>
          <MultiSegmentCalculator key={`multi-${mountKey}`} ref={multiRef} initialData={multiInitial} onSendToPump={handleSendToPump} onSendToExplanation={handleSendToExplanation} pumpResult={pumpResult} onGoToPumpTab={handleGoToPumpTab} onCalculated={() => handleCalculated('multi')} onReset={handleReset} onUpdatePumpSilently={handleUpdatePumpSilently} />
        </div>
        <div style={{ display: activeTab === 'route' ? 'block' : 'none' }}>
          <RouteEditor key={`route-${mountKey}`} ref={routeRef} initialData={routeInitial} onSendToPump={handleSendToPump} onSendToExplanation={handleSendToExplanation} pumpResult={pumpResult} onGoToPumpTab={handleGoToPumpTab} onCalculated={() => handleCalculated('route')} onReset={handleReset} onUpdatePumpSilently={handleUpdatePumpSilently} />
        </div>
        <div style={{ display: activeTab === 'pump' ? 'block' : 'none' }}>
          <PumpChart initialInput={pumpInput} onInputConsumed={() => setPumpInput(null)} onSendPumpToExplanation={handleSendPumpToExplanation} onPumpResultUpdate={handlePumpResultUpdate} onGoToSourceTab={handleGoToSourceTab} />
        </div>
        <div style={{ display: activeTab === 'explain' ? 'block' : 'none' }}>
          <ExplanationTab snapshot={explanationSnapshot} pumpSnapshot={pumpExplanation} />
        </div>
      </div>
    </div>
  );
}

// ── Project List Panel ──

const typeLabel: Record<string, string> = {
  single: 'Single',
  multi: 'Multi',
  route: 'Route',
};

function ProjectListPanel({ projects, onLoad, onRemove, onBulkExport, onBulkImport, t }: {
  projects: ProjectFile[];
  onLoad: (project: ProjectFile) => void;
  onRemove: (index: number) => void;
  onBulkExport: () => void;
  onBulkImport: () => void;
  t: (key: string) => string;
}) {
  return (
    <div style={{
      width: '240px', minWidth: '240px',
      borderRight: '1px solid #e0e0e0',
      padding: '12px',
      overflowY: 'auto',
      maxHeight: '100vh',
      position: 'sticky', top: 0,
      background: '#fafbfc',
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#333' }}>{t('projectList.title')}</h3>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button onClick={onBulkExport} style={panelBtnStyle} disabled={projects.length === 0}>
          {t('projectList.bulkExport')}
        </button>
        <button onClick={onBulkImport} style={panelBtnStyle}>
          {t('projectList.bulkImport')}
        </button>
      </div>

      {projects.length === 0 && (
        <div style={{ color: '#999', fontSize: '0.85em', fontStyle: 'italic', padding: '8px 0' }}>
          {t('projectList.empty')}
        </div>
      )}

      {projects.map((project, i) => (
        <div
          key={`${project.name}-${project.createdAt}-${i}`}
          style={{
            padding: '6px 8px', marginBottom: '4px',
            border: '1px solid #ddd', borderRadius: '4px',
            fontSize: '0.85em', cursor: 'pointer',
            background: '#fff',
          }}
          onClick={() => onLoad(project)}
        >
          <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ color: '#888', fontSize: '0.75em' }}>
              {typeLabel[project.type] ?? project.type}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              style={{ fontSize: '0.7em', color: '#c00', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
            >
              {t('projectList.remove')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabButton({ label, active, onClick, compact, disabled }: { label: string; active: boolean; onClick: () => void; compact?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: compact ? '6px 12px' : '8px 20px',
        border: 'none',
        borderBottom: active ? '2px solid #0066cc' : '2px solid transparent',
        background: 'transparent',
        color: disabled ? '#bbb' : active ? '#0066cc' : '#666',
        fontWeight: active ? 'bold' : 'normal',
        fontSize: compact ? '0.85em' : '0.95em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginBottom: '-2px',
        opacity: disabled ? 0.5 : 1,
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

const toolbarBtnRegisterStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #2e7d32',
  borderRadius: '4px',
  background: '#2e7d32',
  color: '#fff',
  fontSize: '0.85em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const panelBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #ccc',
  borderRadius: '3px',
  background: '#fff',
  color: '#555',
  cursor: 'pointer',
  fontSize: '0.75em',
  flex: 1,
};

export default function App() {
  return (
    <I18nProvider defaultLocale="ja">
      <AppContent />
    </I18nProvider>
  );
}
