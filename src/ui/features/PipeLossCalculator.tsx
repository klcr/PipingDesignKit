import { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useTranslation } from '../i18n/context';
import { localizedName } from '../i18n/localizedName';
import { SegmentResult } from '@domain/types';
import { waterData, craneData, ftData, getAvailableFittings } from '@infrastructure/dataLoader';
import { getAvailableSizes, getAvailableSchedules, resolvePipeSpec, PipeStandardKey } from '@infrastructure/pipeSpecResolver';
import { getAvailableMaterials, resolveMaterial } from '@infrastructure/materialResolver';
import { calcSingleSegment } from '@application/calcSingleSegment';
import { SingleSegmentProjectData } from '@infrastructure/persistence/projectFile';

interface FittingRow {
  fittingId: string;
  quantity: number;
}

export interface PipeLossCalculatorHandle {
  getProjectData(): SingleSegmentProjectData;
}

export interface PipeLossCalculatorProps {
  initialData?: SingleSegmentProjectData;
}

export const PipeLossCalculator = forwardRef<PipeLossCalculatorHandle, PipeLossCalculatorProps>(
  function PipeLossCalculator({ initialData }, ref) {
  const { t, locale } = useTranslation();

  // Fluid
  const [temperature, setTemperature] = useState(initialData?.temperature_c ?? 20);

  // Pipe
  const [pipeStandard, setPipeStandard] = useState<PipeStandardKey>(
    (initialData?.pipeStandard as PipeStandardKey) ?? 'ansi'
  );
  const [nominalSize, setNominalSize] = useState(initialData?.nominalSize ?? '2');
  const [schedule, setSchedule] = useState(initialData?.schedule ?? '40');
  const [materialId, setMaterialId] = useState(initialData?.materialId ?? 'carbon_steel_new');

  // Flow
  const [flowRate, setFlowRate] = useState(initialData?.flowRate_m3h ?? 10);

  // Geometry
  const [pipeLength, setPipeLength] = useState(initialData?.length_m ?? 50);
  const [elevation, setElevation] = useState(initialData?.elevation_m ?? 0);

  // Fittings
  const [fittingRows, setFittingRows] = useState<FittingRow[]>(
    initialData?.fittings.map(f => ({ fittingId: f.fittingId, quantity: f.quantity }))
      ?? [{ fittingId: 'elbow_90_lr_welded', quantity: 2 }]
  );

  // Result
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getProjectData(): SingleSegmentProjectData {
      return {
        temperature_c: temperature,
        pipeStandard,
        nominalSize,
        schedule,
        materialId,
        flowRate_m3h: flowRate,
        length_m: pipeLength,
        elevation_m: elevation,
        fittings: fittingRows.filter(r => r.quantity > 0).map(r => ({ fittingId: r.fittingId, quantity: r.quantity })),
      };
    },
  }));

  const pipeSizes = useMemo(() => getAvailableSizes(pipeStandard), [pipeStandard]);
  const schedules = useMemo(() => getAvailableSchedules(pipeStandard, nominalSize), [pipeStandard, nominalSize]);
  const pipeSpec = useMemo(() => resolvePipeSpec(pipeStandard, nominalSize, schedule), [pipeStandard, nominalSize, schedule]);
  const availableFittings = useMemo(() => getAvailableFittings(), []);
  const materials = useMemo(() => getAvailableMaterials(), []);
  const fittingDescMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of availableFittings) {
      map.set(f.id, localizedName(locale, f.description, f.description_ja));
    }
    return map;
  }, [availableFittings, locale]);

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    try {
      if (!pipeSpec) {
        setError('Pipe specification not found');
        return;
      }

      const material = resolveMaterial(materialId);
      if (!material) {
        setError('Material not found');
        return;
      }

      const fittings = fittingRows
        .filter(r => r.quantity > 0)
        .map(r => ({ fittingId: r.fittingId, quantity: r.quantity }));

      const res = calcSingleSegment(
        { temperature_c: temperature, pipe: pipeSpec, material, flowRate_m3h: flowRate, length_m: pipeLength, elevation_m: elevation, fittings },
        waterData, craneData, ftData
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const addFitting = () => {
    setFittingRows([...fittingRows, { fittingId: 'elbow_90_lr_welded', quantity: 1 }]);
  };

  const removeFitting = (index: number) => {
    setFittingRows(fittingRows.filter((_, i) => i !== index));
  };

  const updateFitting = (index: number, field: keyof FittingRow, value: string | number) => {
    const updated = [...fittingRows];
    updated[index] = { ...updated[index], [field]: value };
    setFittingRows(updated);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left column: inputs */}
        <div>
          {/* Fluid */}
          <Section title={t('fluid.title')}>
            <Field label={t('fluid.type')}>
              <select value="water" style={inputStyle} disabled>
                <option value="water">{t('fluid.water')}</option>
              </select>
            </Field>
            <Field label={t('fluid.temperature')}>
              <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                min={0} max={200} style={inputStyle} /> {t('unit.celsius')}
            </Field>
          </Section>

          {/* Pipe */}
          <Section title={t('pipe.title')}>
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
              <div style={{ fontSize: '0.85em', color: '#555', marginTop: '4px' }}>
                {t('pipe.inner_diameter')}: {pipeSpec.id_mm.toFixed(2)} {t('unit.mm')} | OD: {pipeSpec.od_mm} {t('unit.mm')}
              </div>
            )}
          </Section>

          {/* Flow */}
          <Section title={t('flow.title')}>
            <Field label={t('flow.rate')}>
              <input type="number" value={flowRate} onChange={e => setFlowRate(Number(e.target.value))}
                min={0} step={0.1} style={inputStyle} /> {t('unit.m3h')}
            </Field>
            <Field label={t('pipe.length')}>
              <input type="number" value={pipeLength} onChange={e => setPipeLength(Number(e.target.value))}
                min={0} step={1} style={inputStyle} /> {t('unit.m')}
            </Field>
            <Field label={t('elevation.change')}>
              <input type="number" value={elevation} onChange={e => setElevation(Number(e.target.value))}
                step={0.1} style={inputStyle} /> {t('unit.m')}
            </Field>
          </Section>

          {/* Fittings */}
          <Section title={t('fittings.title')}>
            {fittingRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                <select value={row.fittingId} onChange={e => updateFitting(i, 'fittingId', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}>
                  {availableFittings.map(f => (
                    <option key={f.id} value={f.id}>{localizedName(locale, f.description, f.description_ja)}</option>
                  ))}
                </select>
                <input type="number" value={row.quantity} onChange={e => updateFitting(i, 'quantity', Number(e.target.value))}
                  min={0} style={{ ...inputStyle, width: '60px' }} />
                <button onClick={() => removeFitting(i)} style={{ padding: '4px 8px', cursor: 'pointer' }}>{'\u00D7'}</button>
              </div>
            ))}
            <button onClick={addFitting} style={{ marginTop: '4px', padding: '4px 12px', cursor: 'pointer' }}>
              + {t('fittings.add')}
            </button>
          </Section>

          <button onClick={handleCalculate} style={{
            marginTop: '16px', padding: '10px 24px', fontSize: '1em',
            background: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
            width: '100%',
          }}>
            {t('action.calculate')}
          </button>
        </div>

        {/* Right column: results */}
        <div>
          <Section title={t('results.title')}>
            {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}
            {result && <ResultsView result={result} t={t} fittingDescMap={fittingDescMap} />}
            {!result && !error && (
              <p style={{ color: '#999' }}>{t('action.calculate')}...</p>
            )}
          </Section>
        </div>
      </div>
  );
});

function ResultsView({ result, t, fittingDescMap }: { result: SegmentResult; t: (key: string) => string; fittingDescMap: Map<string, string> }) {
  const formatNum = (n: number, decimals = 2) => n.toFixed(decimals);
  const formatPa = (pa: number) => {
    if (Math.abs(pa) >= 1e6) return `${(pa / 1e6).toFixed(3)} MPa`;
    if (Math.abs(pa) >= 1e3) return `${(pa / 1e3).toFixed(2)} kPa`;
    return `${pa.toFixed(1)} Pa`;
  };

  return (
    <div>
      {/* Flow conditions */}
      <ResultRow label={t('flow.velocity')} value={`${formatNum(result.velocity_m_s, 3)} ${t('unit.ms')}`} />
      <ResultRow label={t('flow.reynolds')} value={formatNum(result.reynolds, 0)} />
      <ResultRow label={t('flow.regime')} value={t(`flow.regime.${result.flowRegime}`)} />
      <ResultRow label={t('results.friction_factor')} value={`f = ${formatNum(result.frictionFactor, 5)}`} />
      <ResultRow label={t('results.friction_factor_method')} value={result.frictionFactorMethod} />

      <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      {/* Pressure breakdown */}
      <h4 style={{ margin: '8px 0' }}>{t('results.breakdown')}</h4>
      <ResultRow label={t('results.dp_friction')} value={formatPa(result.dp_friction)} sub={`${formatNum(result.head_friction_m, 3)} m`} />
      <ResultRow label={t('results.dp_fittings')} value={formatPa(result.dp_fittings)} sub={`${formatNum(result.head_fittings_m, 3)} m`} />
      <ResultRow label={t('results.dp_elevation')} value={formatPa(result.dp_elevation)} sub={`${formatNum(result.head_elevation_m, 2)} m`} />

      <div style={{ borderTop: '2px solid #333', marginTop: '8px', paddingTop: '8px' }}>
        <ResultRow
          label={t('results.dp_total')}
          value={formatPa(result.dp_total)}
          sub={`${formatNum(result.head_total_m, 3)} m`}
          bold
        />
      </div>

      {/* Fitting details */}
      {result.fittingDetails.length > 0 && (
        <>
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #ddd' }} />
          <h4 style={{ margin: '8px 0' }}>{t('fittings.title')}</h4>
          <table style={{ width: '100%', fontSize: '0.85em', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '4px' }}>{t('fittings.type')}</th>
                <th style={{ textAlign: 'right', padding: '4px' }}>N</th>
                <th style={{ textAlign: 'right', padding: '4px' }}>K</th>
                <th style={{ textAlign: 'right', padding: '4px' }}>{'\u0394'}P</th>
              </tr>
            </thead>
            <tbody>
              {result.fittingDetails.map((fd, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px' }}>{fittingDescMap.get(fd.id) ?? fd.description}</td>
                  <td style={{ textAlign: 'right', padding: '4px' }}>{fd.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '4px' }}>{formatNum(fd.k_value, 4)}</td>
                  <td style={{ textAlign: 'right', padding: '4px' }}>{formatPa(fd.dp_pa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* References */}
      <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #ddd' }} />
      <h4 style={{ margin: '8px 0' }}>{t('results.references')}</h4>
      <ul style={{ fontSize: '0.8em', color: '#666', margin: 0, paddingLeft: '20px' }}>
        {[...new Set(result.references.map(r => r.source))].map((src, i) => (
          <li key={i}>{src}</li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '1em', color: '#333' }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <label style={{ width: '120px', fontSize: '0.9em', color: '#555' }}>{label}</label>
      {children}
    </div>
  );
}

function ResultRow({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: bold ? 'bold' : 'normal' }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span>
        {value}
        {sub && <span style={{ fontSize: '0.85em', color: '#888', marginLeft: '8px' }}>({sub})</span>}
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '0.9em',
};
