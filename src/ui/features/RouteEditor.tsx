import { useState, useMemo, useImperativeHandle, useCallback, useEffect, forwardRef } from 'react';
import { useTranslation } from '../i18n/context';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { localizedName } from '../i18n/localizedName';
import { Section, Field, ResultRow, inputStyle, smallBtnStyle } from '../components/FormLayout';
import { formatNum, formatPa } from '../components/formatters';
import { SystemResult, SegmentResult } from '@domain/types';
import { getFluidProperties } from '@domain/fluid/fluidProperties';
import { getSolutionProperties } from '@domain/fluid/aqueousSolution';
import { RouteNode, RouteConversionConfig, ElbowConnectionType, RouteAnalysis } from '@domain/route/types';
import { analyzeRoute } from '@domain/route/routeToSegments';
import {
  waterData, darby3kData, entranceExitData, getAvailableFittings, getAvailableFluids,
  getFluidData, getFluidTempRange, getFluidEntry, getSolutionInput, getFluidRefLabel,
  FluidId, SolutionId,
} from '@infrastructure/dataLoader';
import type { SolutionFluidEntry } from '@infrastructure/dataLoader';
import { getAvailableSizes, getAvailableSchedules, resolvePipeSpec, PipeStandardKey } from '@infrastructure/pipeSpecResolver';
import { getAvailableMaterials, resolveMaterial } from '@infrastructure/materialResolver';
import { calcRoute } from '@application/calcRoute';
import { RouteViews } from '../views/RouteViews';
import { RouteProjectData } from '@infrastructure/persistence/projectFile';
import type { PumpSelectionInput } from './PumpChart';
import type { ExplanationSnapshot } from './explanation/types';
import { useUndoableNodes } from '../hooks/useUndoableNodes';

// ── Node form state ──

interface FittingRow {
  fittingId: string;
  quantity: number;
  customK?: number;
  customCv?: number;
}

interface NodeFormState {
  id: string;
  x: number;
  y: number;
  z: number;
  fittingRows: FittingRow[];
}

let nodeIdCounter = 0;
function createDefaultNode(x = 0, y = 0, z = 0): NodeFormState {
  return { id: `node_${++nodeIdCounter}`, x, y, z, fittingRows: [] };
}

function createNodeFromData(nd: RouteProjectData['nodes'][number]): NodeFormState {
  nodeIdCounter++;
  return {
    id: nd.id,
    x: nd.x,
    y: nd.y,
    z: nd.z,
    fittingRows: nd.fittings.map(f => ({ fittingId: f.fittingId, quantity: f.quantity, customK: f.kOverride, customCv: f.cvOverride })),
  };
}

export interface RouteEditorHandle {
  getProjectData(): RouteProjectData;
}

export interface RouteEditorProps {
  initialData?: RouteProjectData;
  onSendToPump?: (input: PumpSelectionInput) => void;
  onSendToExplanation?: (snapshot: ExplanationSnapshot) => void;
}

export const RouteEditor = forwardRef<RouteEditorHandle, RouteEditorProps>(
  function RouteEditor({ initialData, onSendToPump, onSendToExplanation }, ref) {
  const { t, locale } = useTranslation();
  const isDesktop = useIsDesktop();

  // System-level inputs
  const [fluidId, setFluidId] = useState<FluidId>((initialData?.fluidId as FluidId) ?? 'water');
  const [temperature, setTemperature] = useState(initialData?.temperature_c ?? 20);
  const [concentration, setConcentration] = useState<number>(30);
  const [flowRate, setFlowRate] = useState(initialData?.flowRate_m3h ?? 10);
  const fluids = useMemo(() => getAvailableFluids(), []);
  const tempRange = useMemo(() => getFluidTempRange(fluidId), [fluidId]);
  const fluidEntry = useMemo(() => getFluidEntry(fluidId), [fluidId]);
  const isSolution = fluidEntry.kind === 'solution';
  const solutionEntry = isSolution ? fluidEntry as SolutionFluidEntry : null;

  // Pipe specification (route-wide)
  const [pipeStandard, setPipeStandard] = useState<PipeStandardKey>(
    (initialData?.pipeStandard as PipeStandardKey) ?? 'ansi'
  );
  const [nominalSize, setNominalSize] = useState(initialData?.nominalSize ?? '2');
  const [schedule, setSchedule] = useState(initialData?.schedule ?? '40');
  const [materialId, setMaterialId] = useState(initialData?.materialId ?? 'carbon_steel_new');

  // Elbow settings
  const [elbowConnection, setElbowConnection] = useState<ElbowConnectionType>(
    initialData?.elbowConnection ?? 'welded'
  );
  const [use90LR, setUse90LR] = useState(initialData?.use90LongRadius ?? true);

  // Node array with undo/redo support
  const initialNodes = useMemo(() =>
    initialData?.nodes.map(n => createNodeFromData(n))
      ?? [createDefaultNode(0, 0, 0), createDefaultNode(10, 0, 0)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    nodes, setNodes,
    undo, redo, canUndo, canRedo,
    hasChanges, beginBatch, commitBatch, resetHistory,
  } = useUndoableNodes<NodeFormState[]>(initialNodes);

  // Baseline for confirm/cancel
  const [confirmedNodes, setConfirmedNodes] = useState<NodeFormState[]>(initialNodes);

  // Result
  const [result, setResult] = useState<SystemResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCalcSnapshot, setLastCalcSnapshot] = useState<ExplanationSnapshot | null>(null);

  useImperativeHandle(ref, () => ({
    getProjectData(): RouteProjectData {
      return {
        fluidId,
        temperature_c: temperature,
        flowRate_m3h: flowRate,
        pipeStandard,
        nominalSize,
        schedule,
        materialId,
        elbowConnection,
        use90LongRadius: use90LR,
        nodes: nodes.map(n => ({
          id: n.id,
          x: n.x,
          y: n.y,
          z: n.z,
          fittings: n.fittingRows.filter(r => r.quantity > 0).map(r => ({
            fittingId: r.fittingId,
            quantity: r.quantity,
            ...(r.customK != null ? { kOverride: r.customK } : {}),
            ...(r.customCv != null ? { cvOverride: r.customCv } : {}),
          })),
        })),
      };
    },
  }));

  const availableFittings = useMemo(() => getAvailableFittings(), []);
  const materials = useMemo(() => getAvailableMaterials(), []);
  const fittingDescMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of availableFittings) {
      map.set(f.id, localizedName(locale, f.description, f.description_ja));
    }
    return map;
  }, [availableFittings, locale]);
  const pipeSizes = useMemo(() => getAvailableSizes(pipeStandard), [pipeStandard]);
  const schedules = useMemo(() => getAvailableSchedules(pipeStandard, nominalSize), [pipeStandard, nominalSize]);
  const pipeSpec = useMemo(() => resolvePipeSpec(pipeStandard, nominalSize, schedule), [pipeStandard, nominalSize, schedule]);

  const conversionConfig: RouteConversionConfig = useMemo(
    () => ({ elbowConnection, use90LongRadius: use90LR }),
    [elbowConnection, use90LR]
  );

  // Convert form state to domain RouteNode[]
  const routeNodes: RouteNode[] = useMemo(
    () => nodes.map(n => ({
      id: n.id,
      position: { x: n.x, y: n.y, z: n.z },
      additionalFittings: n.fittingRows
        .filter(r => r.quantity > 0)
        .map(r => ({
          fittingId: r.fittingId,
          quantity: r.quantity,
          ...(r.fittingId === 'custom_k' && r.customK != null ? { kOverride: r.customK } : {}),
          ...(r.fittingId === 'custom_cv' && r.customCv != null ? { cvOverride: r.customCv } : {}),
        })),
    })),
    [nodes]
  );

  // Real-time route analysis
  const analysis: RouteAnalysis | null = useMemo(() => {
    if (routeNodes.length < 2) return null;
    try {
      return analyzeRoute({ nodes: routeNodes }, conversionConfig);
    } catch {
      return null;
    }
  }, [routeNodes, conversionConfig]);

  // Node operations
  const addNode = () => {
    const last = nodes[nodes.length - 1];
    setNodes(prev => [...prev, createDefaultNode(last.x, last.y, last.z)]);
  };

  const removeNode = (index: number) => {
    if (nodes.length <= 2) return;
    setNodes(prev => prev.filter((_, i) => i !== index));
  };

  const updateNode = (index: number, updates: Partial<NodeFormState>) => {
    setNodes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const moveNode = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= nodes.length) return;
    setNodes(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ── Drag / Confirm / Cancel handlers ──

  const handleNodeDrag = useCallback((index: number, x: number, y: number) => {
    setNodes((prev: NodeFormState[]) => {
      const next = [...prev];
      next[index] = { ...next[index], x, y };
      return next;
    });
  }, [setNodes]);

  const handleDragStart = useCallback(() => {
    beginBatch();
  }, [beginBatch]);

  const handleDragEnd = useCallback(() => {
    commitBatch();
  }, [commitBatch]);

  const handleConfirm = useCallback(() => {
    setConfirmedNodes([...nodes]);
    resetHistory(nodes);
  }, [nodes, resetHistory]);

  const handleCancel = useCallback(() => {
    resetHistory(confirmedNodes);
  }, [confirmedNodes, resetHistory]);

  // Ctrl+Z / Ctrl+Y keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    try {
      const pipe = resolvePipeSpec(pipeStandard, nominalSize, schedule);
      if (!pipe) throw new Error('Pipe specification not found');
      const material = resolveMaterial(materialId);
      if (!material) throw new Error('Material not found');

      if (routeNodes.length < 2) throw new Error(t('route.min_nodes'));

      let fluid;
      if (isSolution) {
        const solInput = getSolutionInput(fluidId as SolutionId);
        fluid = getSolutionProperties(temperature, concentration, solutionEntry!.concentrationUnit, solInput);
      } else {
        const fluidData = getFluidData(fluidId);
        fluid = getFluidProperties(temperature, fluidData, { source: fluidData.referenceId });
      }

      const res = calcRoute(
        {
          temperature_c: temperature,
          flowRate_m3h: flowRate,
          route: { nodes: routeNodes },
          pipe,
          material,
          conversionConfig,
          fluid,
        },
        waterData, darby3kData, entranceExitData
      );
      setResult(res);

      // Snapshot from first segment for explanation tab
      if (res.segmentResults.length > 0) {
        const firstSeg = res.segmentResults[0];
        const totalLength = res.segmentResults.reduce((s, r) => s + (r.head_friction_m > 0 ? 1 : 0), 0);
        setLastCalcSnapshot({
          fluid, pipe, material, flowRate_m3h: flowRate,
          length_m: totalLength > 0 ? res.head_friction_total_m / res.segmentResults.length : 10,
          elevation_m: res.head_elevation_total_m,
          fittings: [],
          result: firstSeg,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // ── Shared input sections ──

  const flowConditionsSection = (
    <Section title={t('system.flow_conditions')}>
      <Field label={t('fluid.type')}>
        <select value={fluidId} onChange={e => {
            const newId = e.target.value as FluidId;
            setFluidId(newId);
            const newEntry = getFluidEntry(newId);
            if (newEntry.kind === 'solution') {
              setConcentration((newEntry as SolutionFluidEntry).defaultConcentration);
            }
          }} style={inputStyle}>
          {fluids.map(f => (
            <option key={f.id} value={f.id}>{localizedName(locale, f.name, f.name_ja)} ({getFluidRefLabel(f)})</option>
          ))}
        </select>
      </Field>
      <Field label={t('fluid.temperature')}>
        <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
          min={tempRange.min} max={tempRange.max} style={inputStyle} /> {t('unit.celsius')}
        <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
          ({tempRange.min}~{tempRange.max}{t('unit.celsius')})
        </span>
      </Field>
      {solutionEntry && (
        <Field label={`${t('fluid.concentration')} [${solutionEntry.concentrationUnit}]`}>
          <input type="number" value={concentration} onChange={e => setConcentration(Number(e.target.value))}
            min={solutionEntry.concentrationRange.min}
            max={solutionEntry.concentrationRange.max}
            step={1} style={inputStyle} /> {solutionEntry.concentrationUnit}
          <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '8px' }}>
            ({solutionEntry.concentrationRange.min}~{solutionEntry.concentrationRange.max})
          </span>
        </Field>
      )}
      <Field label={t('flow.rate')}>
        <input type="number" value={flowRate} onChange={e => setFlowRate(Number(e.target.value))}
          min={0} step={0.1} style={inputStyle} /> {t('unit.m3h')}
      </Field>
    </Section>
  );

  const pipeSettingsSection = (
    <Section title={t('route.pipe_settings')}>
      <Field label={t('pipe.standard')}>
        <select value={pipeStandard} onChange={e => { setPipeStandard(e.target.value as PipeStandardKey); setNominalSize('2'); }} style={inputStyle}>
          <option value="ansi">{t('pipe.standard.ansi')}</option>
          <option value="jis-sgp">{t('pipe.standard.jis_sgp')}</option>
        </select>
      </Field>
      <Field label={t('pipe.nominal_size')}>
        <select value={nominalSize} onChange={e => setNominalSize(e.target.value)} style={inputStyle}>
          {pipeSizes.map(s => (
            <option key={s.nps} value={s.nps}>{s.nps} ({s.dn}A)</option>
          ))}
        </select>
      </Field>
      {pipeStandard === 'ansi' && (
        <Field label={t('pipe.schedule')}>
          <select value={schedule} onChange={e => setSchedule(e.target.value)} style={inputStyle}>
            {schedules.map(s => <option key={s} value={s}>Sch {s}</option>)}
          </select>
        </Field>
      )}
      <Field label={t('pipe.material')}>
        <select value={materialId} onChange={e => setMaterialId(e.target.value)} style={inputStyle}>
          {materials.map(m => (
            <option key={m.id} value={m.id}>{localizedName(locale, m.name, m.name_ja)} ({'\u03B5'}={m.roughness_mm}mm)</option>
          ))}
        </select>
      </Field>
      {pipeSpec && (
        <div style={{ fontSize: '0.85em', color: '#555', marginTop: '2px' }}>
          {t('pipe.inner_diameter')}: {pipeSpec.id_mm.toFixed(2)} {t('unit.mm')}
        </div>
      )}
    </Section>
  );

  const nodeTableSection = (
    <Section title={t('route.node_table')}>
      <div className="node-table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={thStyle}>{t('route.node_id')}</th>
              <th style={thStyle}>X (m)</th>
              <th style={thStyle}>Y (m)</th>
              <th style={thStyle}>Z (m)</th>
              <th style={thStyle}>{t('route.additional_fittings')}</th>
              <th style={{ ...thStyle, width: '80px' }}></th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node, i) => (
              <tr key={node.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 'bold', color: '#555' }}>N{i + 1}</span>
                </td>
                <td style={tdStyle}>
                  <input type="number" value={node.x} onChange={e => updateNode(i, { x: Number(e.target.value) })}
                    step={0.1} style={{ ...inputStyle, width: '80px' }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" value={node.y} onChange={e => updateNode(i, { y: Number(e.target.value) })}
                    step={0.1} style={{ ...inputStyle, width: '80px' }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" value={node.z} onChange={e => updateNode(i, { z: Number(e.target.value) })}
                    step={0.1} style={{ ...inputStyle, width: '80px' }} />
                </td>
                <td style={tdStyle}>
                  <NodeFittings
                    fittingRows={node.fittingRows}
                    availableFittings={availableFittings}
                    onChange={fittingRows => updateNode(i, { fittingRows })}
                    t={t}
                    locale={locale}
                  />
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {i > 0 && (
                      <button onClick={() => moveNode(i, -1)} style={smallBtnStyle} title={t('route.move_up')}>{'\u25B2'}</button>
                    )}
                    {i < nodes.length - 1 && (
                      <button onClick={() => moveNode(i, 1)} style={smallBtnStyle} title={t('route.move_down')}>{'\u25BC'}</button>
                    )}
                    {nodes.length > 2 && (
                      <button onClick={() => removeNode(i)} style={{ ...smallBtnStyle, color: '#c00' }} title={t('route.remove_node')}>{'\u2715'}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addNode} style={{
        marginTop: '8px', padding: '8px 16px', cursor: 'pointer', border: '1px solid #0066cc',
        borderRadius: '6px', background: '#fff', color: '#0066cc',
      }}>
        + {t('route.add_node')}
      </button>
    </Section>
  );

  const elbowSettingsSection = (
    <Section title={t('route.elbow_settings')}>
      <Field label={t('route.elbow_connection')}>
        <select value={elbowConnection} onChange={e => setElbowConnection(e.target.value as ElbowConnectionType)} style={inputStyle}>
          <option value="welded">{t('route.elbow_welded')}</option>
          <option value="threaded">{t('route.elbow_threaded')}</option>
        </select>
      </Field>
      <Field label={t('route.elbow_90_type')}>
        <select value={use90LR ? 'lr' : 'std'} onChange={e => setUse90LR(e.target.value === 'lr')} style={inputStyle}>
          <option value="lr">{t('route.elbow_lr')}</option>
          <option value="std">{t('route.elbow_std')}</option>
        </select>
      </Field>
    </Section>
  );

  const routeViewsSection = (
    <div>
      {analysis && routeNodes.length >= 2 && (
        <RouteViews
          nodes={routeNodes}
          analysis={analysis}
          onNodeDrag={handleNodeDrag}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          hasChanges={hasChanges}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      )}
    </div>
  );

  const routeAnalysisSection = (
    <>
      {analysis && <RoutePreview analysis={analysis} t={t} fittingDescMap={fittingDescMap} />}
    </>
  );

  const calculateButton = (
    <button onClick={handleCalculate} style={{
      marginTop: '16px', padding: '10px 24px', fontSize: '1em',
      background: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
      width: '100%',
    }}>
      {t('action.calculate')}
    </button>
  );

  const resultsSection = (
    <>
      {error && <div style={{ color: 'red', marginTop: '12px', padding: '8px' }}>{error}</div>}
      {result && <SystemResultsView result={result} t={t} fittingDescMap={fittingDescMap} />}

      {result && onSendToPump && (
        <button
          onClick={() => {
            onSendToPump({
              designFlow_m3h: flowRate,
              staticHead_m: result.head_elevation_total_m,
              frictionHead_m: result.head_friction_total_m + result.head_fittings_total_m,
              fluidId,
              temperature_c: temperature,
            });
          }}
          style={{
            marginTop: '12px', padding: '8px 20px', fontSize: '0.9em',
            background: '#fff', color: '#0066cc', border: '2px solid #0066cc',
            borderRadius: '6px', cursor: 'pointer', width: '100%',
          }}
        >
          {t('action.send_to_pump')}
        </button>
      )}

      {result && lastCalcSnapshot && onSendToExplanation && (
        <button
          onClick={() => onSendToExplanation(lastCalcSnapshot)}
          style={{
            marginTop: '8px', padding: '8px 20px', fontSize: '0.9em',
            background: '#fff', color: '#2e7d32', border: '2px solid #2e7d32',
            borderRadius: '6px', cursor: 'pointer', width: '100%',
          }}
        >
          {t('action.send_to_explanation')}
        </button>
      )}
    </>
  );

  // ── Desktop: 3-column layout ──
  if (isDesktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: '16px', alignItems: 'start' }}>
        {/* Left column: inputs */}
        <div>
          {flowConditionsSection}
          {pipeSettingsSection}
          {nodeTableSection}
          {elbowSettingsSection}
        </div>

        {/* Center column: route views (sticky) */}
        <div style={{ position: 'sticky', top: '20px' }}>
          {routeViewsSection}
        </div>

        {/* Right column: analysis & results */}
        <div>
          {routeAnalysisSection}
          {calculateButton}
          {resultsSection}
        </div>
      </div>
    );
  }

  // ── Mobile / Tablet: single-column layout ──
  return (
    <div>
      {flowConditionsSection}
      {pipeSettingsSection}
      {elbowSettingsSection}
      {nodeTableSection}
      {routeViewsSection}
      {routeAnalysisSection}
      {calculateButton}
      {resultsSection}
    </div>
  );
});

// ── Node Fittings (inline) ──

function NodeFittings({ fittingRows, availableFittings, onChange, t, locale }: {
  fittingRows: FittingRow[];
  availableFittings: readonly { id: string; description: string; description_ja?: string; refValue: string }[];
  onChange: (rows: FittingRow[]) => void;
  t: (key: string) => string;
  locale: 'ja' | 'en';
}) {
  const addFitting = () => {
    onChange([...fittingRows, { fittingId: 'valve_gate_full', quantity: 1 }]);
  };

  const removeFitting = (fi: number) => {
    onChange(fittingRows.filter((_, i) => i !== fi));
  };

  const updateFitting = (fi: number, field: string, value: string | number) => {
    const updated = [...fittingRows];
    updated[fi] = { ...updated[fi], [field]: value };
    onChange(updated);
  };

  return (
    <div>
      {fittingRows.map((row, fi) => (
        <div key={fi} style={{ display: 'flex', gap: '4px', marginBottom: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={row.fittingId} onChange={e => updateFitting(fi, 'fittingId', e.target.value)}
            style={{ ...inputStyle, flex: 1, fontSize: '0.8em' }}>
            {availableFittings.map(f => (
              <option key={f.id} value={f.id}>{localizedName(locale, f.description, f.description_ja)}{f.refValue ? ` (${f.refValue})` : ''}</option>
            ))}
          </select>
          {row.fittingId === 'custom_k' && (
            <input type="number" value={row.customK ?? ''} onChange={e => updateFitting(fi, 'customK', Number(e.target.value))}
              placeholder="K" min={0} step={0.1} style={{ ...inputStyle, width: '60px', fontSize: '0.8em' }} />
          )}
          {row.fittingId === 'custom_cv' && (
            <input type="number" value={row.customCv ?? ''} onChange={e => updateFitting(fi, 'customCv', Number(e.target.value))}
              placeholder="Cv" min={0.1} step={1} style={{ ...inputStyle, width: '60px', fontSize: '0.8em' }} />
          )}
          <input type="number" value={row.quantity} onChange={e => updateFitting(fi, 'quantity', Number(e.target.value))}
            min={0} style={{ ...inputStyle, width: '40px', fontSize: '0.8em' }} />
          <button onClick={() => removeFitting(fi)} style={{ padding: '2px 4px', cursor: 'pointer', fontSize: '0.7em' }}>{'\u2715'}</button>
        </div>
      ))}
      <button onClick={addFitting} style={{ padding: '2px 8px', cursor: 'pointer', fontSize: '0.75em', color: '#0066cc', background: 'none', border: '1px solid #0066cc', borderRadius: '3px' }}>
        + {t('route.add_fitting')}
      </button>
    </div>
  );
}

// ── Route Preview ──

function RoutePreview({ analysis, t, fittingDescMap }: { analysis: RouteAnalysis; t: (key: string) => string; fittingDescMap: Map<string, string> }) {
  return (
    <Section title={t('route.preview')}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.9em' }}>
        <SummaryItem label={t('route.total_length')} value={`${analysis.totalLength_m.toFixed(2)} m`} />
        <SummaryItem label={t('route.total_elevation')} value={`${analysis.totalElevation_m.toFixed(2)} m`} />
        <SummaryItem label={t('route.elbow_count_90')} value={String(analysis.elbowCount90)} />
        <SummaryItem label={t('route.elbow_count_45')} value={String(analysis.elbowCount45)} />
        {analysis.elbowCount180 > 0 && (
          <SummaryItem label={t('route.elbow_count_180')} value={String(analysis.elbowCount180)} />
        )}
      </div>

      {/* Straight runs table */}
      {analysis.straightRuns.length > 0 && (
        <>
          <h4 style={{ margin: '8px 0 4px', fontSize: '0.9em', color: '#555' }}>{t('route.straight_runs')}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={thStyle}>{t('route.section')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t('route.length')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t('route.elevation')}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.straightRuns.map((run, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>N{run.fromNodeIndex + 1} → N{run.toNodeIndex + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{run.length_m.toFixed(2)} m</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{run.elevation_m.toFixed(2)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Detected elbows table */}
      {analysis.detectedElbows.length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '0.9em', color: '#555' }}>{t('route.detected_elbows')}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={thStyle}>{t('route.node_id')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>{t('route.elbow_angle')}</th>
                <th style={thStyle}>{t('route.elbow_fitting')}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.detectedElbows.map((elbow, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>N{elbow.nodeIndex + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{elbow.angleDeg.toFixed(1)}{'\u00B0'} → {elbow.standardAngle}{'\u00B0'}</td>
                  <td style={tdStyle}>{fittingDescMap.get(elbow.fittingId) ?? elbow.fittingId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {analysis.detectedElbows.length === 0 && (
        <div style={{ fontSize: '0.85em', color: '#888', fontStyle: 'italic' }}>{t('route.no_elbows')}</div>
      )}

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '0.9em', color: '#c00' }}>{t('route.warnings')}</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85em', color: '#c00' }}>
            {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </>
      )}
    </Section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '4px 12px', background: '#f0f4f8', borderRadius: '4px' }}>
      <div style={{ fontSize: '0.75em', color: '#888' }}>{label}</div>
      <div style={{ fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

// ── System Results View (shared with MultiSegmentCalculator pattern) ──

function SystemResultsView({ result, t, fittingDescMap }: { result: SystemResult; t: (key: string) => string; fittingDescMap: Map<string, string> }) {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());

  const toggleSegment = (index: number) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Section title={t('system.summary')}>
        <ResultRow label={t('system.dp_friction_total')} value={formatPa(result.dp_friction_total)} sub={`${formatNum(result.head_friction_total_m, 3)} m`} />
        <ResultRow label={t('system.dp_fittings_total')} value={formatPa(result.dp_fittings_total)} sub={`${formatNum(result.head_fittings_total_m, 3)} m`} />
        <ResultRow label={t('system.dp_elevation_total')} value={formatPa(result.dp_elevation_total)} sub={`${formatNum(result.head_elevation_total_m, 2)} m`} />
        <div style={{ borderTop: '2px solid #333', marginTop: '8px', paddingTop: '8px' }}>
          <ResultRow label={t('system.dp_total')} value={formatPa(result.dp_total)} sub={`${formatNum(result.head_total_m, 3)} m`} bold />
        </div>
      </Section>

      <Section title={t('system.per_segment')}>
        {result.segmentResults.map((segResult, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <div
              onClick={() => toggleSegment(i)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', background: '#f5f5f5', borderRadius: '4px', cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '0.9em' }}>
                {t('segment.title')} {i + 1}
              </span>
              <span style={{ fontSize: '0.9em' }}>
                {formatPa(segResult.dp_total)} ({formatNum(segResult.head_total_m, 3)} m)
                <span style={{ marginLeft: '8px', color: '#999' }}>
                  {expandedSegments.has(i) ? '\u25B2' : '\u25BC'}
                </span>
              </span>
            </div>
            {expandedSegments.has(i) && (
              <div style={{ padding: '8px 12px', border: '1px solid #eee', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                <SegmentResultDetail result={segResult} t={t} fittingDescMap={fittingDescMap} />
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title={t('results.references')}>
        <ul style={{ fontSize: '0.8em', color: '#666', margin: 0, paddingLeft: '20px' }}>
          {[...new Set(result.references.map(r => r.source))].map((src, i) => (
            <li key={i}>{src}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function SegmentResultDetail({ result, t, fittingDescMap }: { result: SegmentResult; t: (key: string) => string; fittingDescMap: Map<string, string> }) {
  return (
    <div>
      <ResultRow label={t('flow.velocity')} value={`${formatNum(result.velocity_m_s, 3)} ${t('unit.ms')}`} />
      <ResultRow label={t('flow.reynolds')} value={formatNum(result.reynolds, 0)} />
      <ResultRow label={t('flow.regime')} value={t(`flow.regime.${result.flowRegime}`)} />
      <ResultRow label={t('results.friction_factor')} value={`f = ${formatNum(result.frictionFactor, 5)}`} />

      <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <ResultRow label={t('results.dp_friction')} value={formatPa(result.dp_friction)} sub={`${formatNum(result.head_friction_m, 3)} m`} />
      <ResultRow label={t('results.dp_fittings')} value={formatPa(result.dp_fittings)} sub={`${formatNum(result.head_fittings_m, 3)} m`} />
      <ResultRow label={t('results.dp_elevation')} value={formatPa(result.dp_elevation)} sub={`${formatNum(result.head_elevation_m, 2)} m`} />

      <div style={{ borderTop: '1px solid #999', marginTop: '4px', paddingTop: '4px' }}>
        <ResultRow label={t('results.dp_total')} value={formatPa(result.dp_total)} sub={`${formatNum(result.head_total_m, 3)} m`} bold />
      </div>

      {result.fittingDetails.length > 0 && (
        <table style={{ width: '100%', fontSize: '0.8em', borderCollapse: 'collapse', marginTop: '8px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ textAlign: 'left', padding: '3px' }}>{t('fittings.type')}</th>
              <th style={{ textAlign: 'right', padding: '3px' }}>N</th>
              <th style={{ textAlign: 'right', padding: '3px' }}>K</th>
              <th style={{ textAlign: 'right', padding: '3px' }}>{'\u0394'}P</th>
            </tr>
          </thead>
          <tbody>
            {result.fittingDetails.map((fd, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '3px' }}>{fd.id.startsWith('custom_') ? fd.description : (fittingDescMap.get(fd.id) ?? fd.description)}</td>
                <td style={{ textAlign: 'right', padding: '3px' }}>{fd.quantity}</td>
                <td style={{ textAlign: 'right', padding: '3px' }}>{formatNum(fd.k_value, 4)}</td>
                <td style={{ textAlign: 'right', padding: '3px' }}>{formatPa(fd.dp_pa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Route-specific styles ──

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  fontSize: '0.85em',
  color: '#555',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  verticalAlign: 'top',
};
