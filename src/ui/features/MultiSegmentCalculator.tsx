import { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from '../i18n/context';
import { useIsDesktop } from '../hooks/useBreakpoint';
import { localizedName } from '../i18n/localizedName';
import { Section, Field, ResultRow, inputStyle, smallBtnStyle } from '../components/FormLayout';
import { formatNum, formatPa } from '../components/formatters';
import { SystemResult, SegmentResult } from '@domain/types';
import { getFluidProperties } from '@domain/fluid/fluidProperties';
import { getSolutionProperties } from '@domain/fluid/aqueousSolution';
import {
  waterData, darby3kData, entranceExitData, getAvailableFittings, getAvailableFluids,
  getFluidData, getFluidTempRange, getFluidEntry, getSolutionInput, getFluidRefLabel,
  FluidId, SolutionId,
} from '@infrastructure/dataLoader';
import type { SolutionFluidEntry } from '@infrastructure/dataLoader';
import { getAvailableSizes, getAvailableSchedules, resolvePipeSpec, PipeStandardKey } from '@infrastructure/pipeSpecResolver';
import { getAvailableMaterials, resolveMaterial } from '@infrastructure/materialResolver';
import { calcMultiSegment } from '@application/calcMultiSegment';
import { SegmentDefinition } from '@application/types';
import { MultiSegmentProjectData } from '@infrastructure/persistence/projectFile';
import type { PumpSelectionInput } from './PumpChart';
import type { ExplanationSnapshot } from './explanation/types';

interface FittingRow {
  fittingId: string;
  quantity: number;
  customK?: number;
  customCv?: number;
}

interface SegmentFormState {
  id: string;
  pipeStandard: PipeStandardKey;
  nominalSize: string;
  schedule: string;
  materialId: string;
  pipeLength: number;
  elevation: number;
  fittingRows: FittingRow[];
  collapsed: boolean;
}

let segmentIdCounter = 0;
function createDefaultSegment(): SegmentFormState {
  return {
    id: String(++segmentIdCounter),
    pipeStandard: 'ansi',
    nominalSize: '2',
    schedule: '40',
    materialId: 'carbon_steel_new',
    pipeLength: 10,
    elevation: 0,
    fittingRows: [],
    collapsed: false,
  };
}

function createSegmentFromData(entry: MultiSegmentProjectData['segments'][number]): SegmentFormState {
  return {
    id: String(++segmentIdCounter),
    pipeStandard: entry.pipeStandard as PipeStandardKey,
    nominalSize: entry.nominalSize,
    schedule: entry.schedule,
    materialId: entry.materialId,
    pipeLength: entry.length_m,
    elevation: entry.elevation_m,
    fittingRows: entry.fittings.map(f => ({ fittingId: f.fittingId, quantity: f.quantity, customK: f.kOverride, customCv: f.cvOverride })),
    collapsed: false,
  };
}

export interface MultiSegmentCalculatorHandle {
  getProjectData(): MultiSegmentProjectData;
}

export interface MultiSegmentCalculatorProps {
  initialData?: MultiSegmentProjectData;
  onSendToPump?: (input: PumpSelectionInput) => void;
  onSendToExplanation?: (snapshot: ExplanationSnapshot) => void;
}

export const MultiSegmentCalculator = forwardRef<MultiSegmentCalculatorHandle, MultiSegmentCalculatorProps>(
  function MultiSegmentCalculator({ initialData, onSendToPump, onSendToExplanation }, ref) {
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

  // Segment array
  const [segments, setSegments] = useState<SegmentFormState[]>(
    initialData?.segments.map(s => createSegmentFromData(s))
      ?? [createDefaultSegment()]
  );

  // Result
  const [result, setResult] = useState<SystemResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCalcSnapshot, setLastCalcSnapshot] = useState<ExplanationSnapshot | null>(null);

  useImperativeHandle(ref, () => ({
    getProjectData(): MultiSegmentProjectData {
      return {
        fluidId,
        temperature_c: temperature,
        flowRate_m3h: flowRate,
        segments: segments.map(seg => ({
          pipeStandard: seg.pipeStandard,
          nominalSize: seg.nominalSize,
          schedule: seg.schedule,
          materialId: seg.materialId,
          length_m: seg.pipeLength,
          elevation_m: seg.elevation,
          fittings: seg.fittingRows.filter(r => r.quantity > 0).map(r => ({
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

  const addSegment = () => {
    setSegments(prev => [...prev, createDefaultSegment()]);
  };

  const removeSegment = (index: number) => {
    if (segments.length <= 1) return;
    setSegments(prev => prev.filter((_, i) => i !== index));
  };

  const moveSegment = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= segments.length) return;
    setSegments(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateSegment = (index: number, updates: Partial<SegmentFormState>) => {
    setSegments(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    try {
      const segmentDefs: SegmentDefinition[] = segments.map((seg, i) => {
        const pipeSpec = resolvePipeSpec(seg.pipeStandard, seg.nominalSize, seg.schedule);
        if (!pipeSpec) throw new Error(`Segment ${i + 1}: Pipe specification not found`);

        const material = resolveMaterial(seg.materialId);
        if (!material) throw new Error(`Segment ${i + 1}: Material not found`);

        const fittings = seg.fittingRows
          .filter(r => r.quantity > 0)
          .map(r => ({
            fittingId: r.fittingId,
            quantity: r.quantity,
            ...(r.fittingId === 'custom_k' && r.customK != null ? { kOverride: r.customK } : {}),
            ...(r.fittingId === 'custom_cv' && r.customCv != null ? { cvOverride: r.customCv } : {}),
          }));

        return {
          pipe: pipeSpec,
          material,
          length_m: seg.pipeLength,
          elevation_m: seg.elevation,
          fittings,
        };
      });

      let fluid;
      if (isSolution) {
        const solInput = getSolutionInput(fluidId as SolutionId);
        fluid = getSolutionProperties(temperature, concentration, solutionEntry!.concentrationUnit, solInput);
      } else {
        const fluidData = getFluidData(fluidId);
        fluid = getFluidProperties(temperature, fluidData, { source: fluidData.referenceId });
      }

      const res = calcMultiSegment(
        { temperature_c: temperature, flowRate_m3h: flowRate, segments: segmentDefs, fluid },
        waterData, darby3kData, entranceExitData
      );
      setResult(res);

      // Snapshot from first segment for explanation tab
      if (segmentDefs.length > 0 && res.segmentResults.length > 0) {
        const seg = segmentDefs[0];
        setLastCalcSnapshot({
          fluid, pipe: seg.pipe, material: seg.material,
          flowRate_m3h: flowRate, length_m: seg.length_m, elevation_m: seg.elevation_m,
          fittings: seg.fittings, result: res.segmentResults[0],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const inputArea = (
    <>
      {/* System-level inputs */}
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

      {/* Segment list */}
      {segments.map((seg, i) => (
        <SegmentEditor
          key={seg.id}
          index={i}
          segment={seg}
          onUpdate={updates => updateSegment(i, updates)}
          onRemove={() => removeSegment(i)}
          onMoveUp={() => moveSegment(i, -1)}
          onMoveDown={() => moveSegment(i, 1)}
          isFirst={i === 0}
          isLast={i === segments.length - 1}
          canRemove={segments.length > 1}
          availableFittings={availableFittings}
          materials={materials}
          t={t}
          locale={locale}
        />
      ))}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button onClick={addSegment} style={{
          padding: '8px 16px', cursor: 'pointer', border: '1px solid #0066cc',
          borderRadius: '6px', background: '#fff', color: '#0066cc',
        }}>
          + {t('segment.add')}
        </button>
      </div>

      <button onClick={handleCalculate} style={{
        marginTop: '16px', padding: '10px 24px', fontSize: '1em',
        background: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
        width: '100%',
      }}>
        {t('action.calculate')}
      </button>
    </>
  );

  const resultsArea = (
    <>
      {error && <div style={{ color: 'red', marginTop: isDesktop ? '0' : '12px', padding: '8px' }}>{error}</div>}
      {result && <SystemResultsView result={result} t={t} fittingDescMap={fittingDescMap} />}
      {!result && !error && isDesktop && (
        <Section title={t('system.summary')}>
          <p style={{ color: '#999', fontSize: '0.9em' }}>{t('action.calculate')}...</p>
        </Section>
      )}

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

  if (isDesktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
        <div>{inputArea}</div>
        <div style={{ position: 'sticky', top: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
          {resultsArea}
        </div>
      </div>
    );
  }

  return (
    <div>
      {inputArea}
      {resultsArea}
    </div>
  );
});

// ── Segment Editor ──

interface SegmentEditorProps {
  index: number;
  segment: SegmentFormState;
  onUpdate: (updates: Partial<SegmentFormState>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  availableFittings: readonly { id: string; description: string; description_ja?: string; refValue: string }[];
  materials: readonly { id: string; name: string; name_ja: string; roughness_mm: number }[];
  t: (key: string) => string;
  locale: 'ja' | 'en';
}

function SegmentEditor({ index, segment, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast, canRemove, availableFittings, materials, t, locale }: SegmentEditorProps) {
  const pipeSizes = useMemo(() => getAvailableSizes(segment.pipeStandard), [segment.pipeStandard]);
  const schedules = useMemo(() => getAvailableSchedules(segment.pipeStandard, segment.nominalSize), [segment.pipeStandard, segment.nominalSize]);
  const pipeSpec = useMemo(() => resolvePipeSpec(segment.pipeStandard, segment.nominalSize, segment.schedule), [segment.pipeStandard, segment.nominalSize, segment.schedule]);

  const addFitting = () => {
    onUpdate({ fittingRows: [...segment.fittingRows, { fittingId: 'elbow_90_lr_welded', quantity: 1 }] });
  };

  const removeFitting = (fi: number) => {
    onUpdate({ fittingRows: segment.fittingRows.filter((_, i) => i !== fi) });
  };

  const updateFitting = (fi: number, field: string, value: string | number) => {
    const updated = [...segment.fittingRows];
    updated[fi] = { ...updated[fi], [field]: value };
    onUpdate({ fittingRows: updated });
  };

  return (
    <div style={{ marginBottom: '12px', border: '1px solid #bbb', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', background: '#f0f4f8', borderBottom: segment.collapsed ? 'none' : '1px solid #ddd',
        cursor: 'pointer',
      }}
        onClick={() => onUpdate({ collapsed: !segment.collapsed })}
      >
        <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>
          {t('segment.title')} {index + 1}
          {pipeSpec && <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '12px' }}>
            {pipeSpec.nps}" {segment.pipeStandard === 'ansi' ? `Sch ${segment.schedule}` : 'SGP'} | {segment.pipeLength}m
          </span>}
        </span>
        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
          {!isFirst && (
            <button onClick={onMoveUp} style={smallBtnStyle} title={t('segment.move_up')}>&#9650;</button>
          )}
          {!isLast && (
            <button onClick={onMoveDown} style={smallBtnStyle} title={t('segment.move_down')}>&#9660;</button>
          )}
          {canRemove && (
            <button onClick={onRemove} style={{ ...smallBtnStyle, color: '#c00' }} title={t('segment.remove')}>&#10005;</button>
          )}
          <button onClick={() => onUpdate({ collapsed: !segment.collapsed })} style={smallBtnStyle}>
            {segment.collapsed ? '&#9660;' : '&#9650;'}
          </button>
        </div>
      </div>

      {/* Body */}
      {!segment.collapsed && (
        <div style={{ padding: '12px' }}>
          {/* Pipe */}
          <Field label={t('pipe.standard')}>
            <select value={segment.pipeStandard} onChange={e => onUpdate({ pipeStandard: e.target.value as PipeStandardKey, nominalSize: '2' })} style={inputStyle}>
              <option value="ansi">{t('pipe.standard.ansi')}</option>
              <option value="jis-sgp">{t('pipe.standard.jis_sgp')}</option>
            </select>
          </Field>
          <Field label={t('pipe.nominal_size')}>
            <select value={segment.nominalSize} onChange={e => onUpdate({ nominalSize: e.target.value })} style={inputStyle}>
              {pipeSizes.map(s => (
                <option key={s.nps} value={s.nps}>{s.nps} ({s.dn}A)</option>
              ))}
            </select>
          </Field>
          {segment.pipeStandard === 'ansi' && (
            <Field label={t('pipe.schedule')}>
              <select value={segment.schedule} onChange={e => onUpdate({ schedule: e.target.value })} style={inputStyle}>
                {schedules.map(s => <option key={s} value={s}>Sch {s}</option>)}
              </select>
            </Field>
          )}
          <Field label={t('pipe.material')}>
            <select value={segment.materialId} onChange={e => onUpdate({ materialId: e.target.value })} style={inputStyle}>
              {materials.map(m => (
                <option key={m.id} value={m.id}>{localizedName(locale, m.name, m.name_ja)} ({'\u03B5'}={m.roughness_mm}mm)</option>
              ))}
            </select>
          </Field>
          {pipeSpec && (
            <div style={{ fontSize: '0.85em', color: '#555', marginTop: '2px', marginBottom: '8px' }}>
              {t('pipe.inner_diameter')}: {pipeSpec.id_mm.toFixed(2)} {t('unit.mm')}
            </div>
          )}

          {/* Geometry */}
          <Field label={t('pipe.length')}>
            <input type="number" value={segment.pipeLength} onChange={e => onUpdate({ pipeLength: Number(e.target.value) })}
              min={0} step={1} style={inputStyle} /> {t('unit.m')}
          </Field>
          <Field label={t('elevation.change')}>
            <input type="number" value={segment.elevation} onChange={e => onUpdate({ elevation: Number(e.target.value) })}
              step={0.1} style={inputStyle} /> {t('unit.m')}
          </Field>

          {/* Fittings */}
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#555' }}>{t('fittings.title')}</span>
            {segment.fittingRows.map((row, fi) => (
              <div key={fi} style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={row.fittingId} onChange={e => updateFitting(fi, 'fittingId', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}>
                  {availableFittings.map(f => (
                    <option key={f.id} value={f.id}>{localizedName(locale, f.description, f.description_ja)}{f.refValue ? ` (${f.refValue})` : ''}</option>
                  ))}
                </select>
                {row.fittingId === 'custom_k' && (
                  <input type="number" value={row.customK ?? ''} onChange={e => updateFitting(fi, 'customK', Number(e.target.value))}
                    placeholder="K" min={0} step={0.1} style={{ ...inputStyle, width: '80px' }} />
                )}
                {row.fittingId === 'custom_cv' && (
                  <input type="number" value={row.customCv ?? ''} onChange={e => updateFitting(fi, 'customCv', Number(e.target.value))}
                    placeholder="Cv" min={0.1} step={1} style={{ ...inputStyle, width: '80px' }} />
                )}
                <input type="number" value={row.quantity} onChange={e => updateFitting(fi, 'quantity', Number(e.target.value))}
                  min={0} style={{ ...inputStyle, width: '60px' }} />
                <button onClick={() => removeFitting(fi)} style={{ padding: '4px 8px', cursor: 'pointer' }}>&#10005;</button>
              </div>
            ))}
            <button onClick={addFitting} style={{ marginTop: '4px', padding: '4px 12px', cursor: 'pointer' }}>
              + {t('fittings.add')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Results View ──

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
      {/* System Summary */}
      <Section title={t('system.summary')}>
        <ResultRow label={t('system.dp_friction_total')} value={formatPa(result.dp_friction_total)} sub={`${formatNum(result.head_friction_total_m, 3)} m`} />
        <ResultRow label={t('system.dp_fittings_total')} value={formatPa(result.dp_fittings_total)} sub={`${formatNum(result.head_fittings_total_m, 3)} m`} />
        <ResultRow label={t('system.dp_elevation_total')} value={formatPa(result.dp_elevation_total)} sub={`${formatNum(result.head_elevation_total_m, 2)} m`} />
        <div style={{ borderTop: '2px solid #333', marginTop: '8px', paddingTop: '8px' }}>
          <ResultRow label={t('system.dp_total')} value={formatPa(result.dp_total)} sub={`${formatNum(result.head_total_m, 3)} m`} bold />
        </div>
      </Section>

      {/* Per-segment results */}
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

      {/* References */}
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

