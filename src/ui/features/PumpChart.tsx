import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../i18n/context';
import { useIsMobile, useIsDesktop } from '../hooks/useBreakpoint';
import { localizedName } from '../i18n/localizedName';
import { Section, Field, ResultRow, inputStyle } from '../components/FormLayout';
import { formatNum } from '../components/formatters';
import { getFluidProperties } from '@domain/fluid/fluidProperties';
import { calcResistanceCurve, findOperatingPoint, calcNPSHa, ResistanceCurvePoint, OperatingPoint } from '@domain/system/pumpSelection';
import { calcPumpSuggestion, PumpSuggestion } from '@domain/system/pumpRequirements';
import { PumpCurveData, samplePumpData, getAvailableFluids, getFluidData, getFluidTempRange, FluidId, pumpTypeClassifications } from '@infrastructure/dataLoader';

// ── 圧損計算からの受け渡しデータ型 ──

export interface PumpSelectionInput {
  designFlow_m3h: number;
  staticHead_m: number;
  frictionHead_m: number;
  fluidId: FluidId;
  temperature_c: number;
}

// ── 回転数プリセット ──

const SPEED_PRESETS = [
  { value: 2900, label: '2900 rpm (50Hz 2P)' },
  { value: 1450, label: '1450 rpm (50Hz 4P)' },
  { value: 3500, label: '3500 rpm (60Hz 2P)' },
  { value: 1750, label: '1750 rpm (60Hz 4P)' },
] as const;

interface PumpChartProps {
  initialInput?: PumpSelectionInput | null;
  onInputConsumed?: () => void;
}

export function PumpChart({ initialInput, onInputConsumed }: PumpChartProps) {
  const { t, locale } = useTranslation();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  // Fluid
  const [fluidId, setFluidId] = useState<FluidId>('water');
  const [temperature, setTemperature] = useState(20);
  const fluids = useMemo(() => getAvailableFluids(), []);
  const tempRange = useMemo(() => getFluidTempRange(fluidId), [fluidId]);

  // System parameters
  const [designFlow, setDesignFlow] = useState(15);
  const [staticHead, setStaticHead] = useState(5);
  const [frictionHead, setFrictionHead] = useState(10);

  // NPSHa parameters
  const [suctionStaticHead, setSuctionStaticHead] = useState(3);
  const [suctionFrictionLoss, setSuctionFrictionLoss] = useState(1);
  const [atmPressure, setAtmPressure] = useState(101.325);

  // Speed selector
  const [speedMode, setSpeedMode] = useState<'preset' | 'custom'>('preset');
  const [presetSpeed, setPresetSpeed] = useState(2900);
  const [customSpeed, setCustomSpeed] = useState(2900);
  const assumedSpeed = speedMode === 'preset' ? presetSpeed : customSpeed;

  // Data received banner
  const [showDataBanner, setShowDataBanner] = useState(false);

  // Apply external input from pressure loss calculation
  useEffect(() => {
    if (!initialInput) return;

    setFluidId(initialInput.fluidId);
    setTemperature(initialInput.temperature_c);
    setDesignFlow(initialInput.designFlow_m3h);
    setStaticHead(initialInput.staticHead_m);
    setFrictionHead(initialInput.frictionHead_m);
    setShowDataBanner(true);

    onInputConsumed?.();
  }, [initialInput, onInputConsumed]);

  const pumpData: PumpCurveData = samplePumpData;

  // Compute
  const fluidData = useMemo(() => getFluidData(fluidId), [fluidId]);
  const fluidProps = useMemo(() => {
    try {
      return getFluidProperties(temperature, fluidData, { source: fluidData.referenceId });
    } catch {
      return null;
    }
  }, [temperature, fluidData]);

  const resistanceCurve = useMemo(
    () => calcResistanceCurve(staticHead, frictionHead, designFlow, 30, 1.5),
    [staticHead, frictionHead, designFlow]
  );

  const operatingPoint = useMemo(
    () => findOperatingPoint(pumpData.performance_curve, resistanceCurve),
    [pumpData.performance_curve, resistanceCurve]
  );

  const npsha = useMemo(() => {
    if (!fluidProps) return null;
    return calcNPSHa({
      atmosphericPressure_kPa: atmPressure,
      vaporPressure_kPa: fluidProps.pressure,
      suctionStaticHead_m: suctionStaticHead,
      suctionFrictionLoss_m: suctionFrictionLoss,
      density: fluidProps.density,
    });
  }, [fluidProps, atmPressure, suctionStaticHead, suctionFrictionLoss]);

  // Pump suggestion
  const totalHead = staticHead + frictionHead;
  const pumpSuggestion = useMemo((): PumpSuggestion | null => {
    if (designFlow <= 0 || totalHead <= 0 || assumedSpeed <= 0) return null;
    try {
      return calcPumpSuggestion(
        {
          designFlow_m3h: designFlow,
          totalHead_m: totalHead,
          speed_rpm: assumedSpeed,
          npsha_m: npsha ?? undefined,
          density_kg_m3: fluidProps?.density,
        },
        pumpTypeClassifications
      );
    } catch {
      return null;
    }
  }, [designFlow, totalHead, assumedSpeed, npsha, fluidProps]);

  // Warnings
  const warnings: string[] = [];
  if (operatingPoint && operatingPoint.efficiency_pct < 50) {
    warnings.push(t('pump.warning_low_efficiency'));
  }
  if (operatingPoint && npsha !== null && npsha < operatingPoint.npshr_m) {
    warnings.push(t('pump.warning_npsh'));
  }

  return (
    <div>
      {/* Data received banner */}
      {showDataBanner && (
        <div style={{
          padding: '8px 12px', background: '#e8f4fd', border: '1px solid #b3d9f2',
          borderRadius: '6px', marginBottom: '12px', fontSize: '0.85em',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{t('pump.data_received_from')}</span>
          <button
            onClick={() => setShowDataBanner(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1em', color: '#666' }}
          >
            {'\u00D7'}
          </button>
        </div>
      )}

      {/* Pump info */}
      <Section title={t('pump.title')}>
        <ResultRow label={t('pump.model')} value={pumpData.model} />
        <ResultRow label={t('pump.manufacturer')} value={pumpData.manufacturer} />
        <div style={{ fontSize: '0.85em', color: '#555', marginTop: '4px' }}>
          {localizedName(locale, pumpData.description, pumpData.description_ja)}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '16px' }}>
        <div>
          {/* Fluid */}
          <Section title={t('fluid.title')}>
            <Field label={t('fluid.type')}>
              <select value={fluidId} onChange={e => setFluidId(e.target.value as FluidId)} style={inputStyle}>
                {fluids.map(f => (
                  <option key={f.id} value={f.id}>{localizedName(locale, f.name, f.name_ja)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fluid.temperature')}>
              <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                min={tempRange.min} max={tempRange.max} style={inputStyle} /> {t('unit.celsius')}
            </Field>
          </Section>

          {/* System */}
          <Section title={t('pump.system_head')}>
            <Field label={t('pump.input_flow')}>
              <input type="number" value={designFlow} onChange={e => setDesignFlow(Number(e.target.value))}
                min={0} step={0.5} style={inputStyle} /> {t('unit.m3h')}
            </Field>
            <Field label={t('pump.static_head')}>
              <input type="number" value={staticHead} onChange={e => setStaticHead(Number(e.target.value))}
                step={0.5} style={inputStyle} /> {t('unit.m')}
            </Field>
            <Field label={t('pump.friction_head')}>
              <input type="number" value={frictionHead} onChange={e => setFrictionHead(Number(e.target.value))}
                min={0} step={0.5} style={inputStyle} /> {t('unit.m')}
            </Field>
          </Section>

          {/* NPSHa */}
          <Section title={t('pump.npsha_settings')}>
            <Field label={t('pump.suction_static_head')}>
              <input type="number" value={suctionStaticHead} onChange={e => setSuctionStaticHead(Number(e.target.value))}
                step={0.5} style={inputStyle} /> {t('unit.m')}
            </Field>
            <Field label={t('pump.suction_friction_loss')}>
              <input type="number" value={suctionFrictionLoss} onChange={e => setSuctionFrictionLoss(Number(e.target.value))}
                min={0} step={0.1} style={inputStyle} /> {t('unit.m')}
            </Field>
            <Field label={t('pump.atm_pressure')}>
              <input type="number" value={atmPressure} onChange={e => setAtmPressure(Number(e.target.value))}
                step={0.1} style={inputStyle} /> {t('unit.kpa')}
            </Field>
          </Section>
        </div>

        <div>
          {/* Operating Point Results */}
          <Section title={t('pump.operating_point')}>
            {operatingPoint ? (
              <>
                <ResultRow label={t('pump.operating_flow')} value={`${formatNum(operatingPoint.flow_m3h, 2)} ${t('unit.m3h')}`} />
                <ResultRow label={t('pump.operating_head')} value={`${formatNum(operatingPoint.head_m, 2)} ${t('unit.m')}`} />
                <ResultRow label={t('pump.operating_efficiency')} value={`${formatNum(operatingPoint.efficiency_pct, 1)} ${t('unit.pct')}`} />
                <ResultRow label={t('pump.npshr')} value={`${formatNum(operatingPoint.npshr_m, 2)} ${t('unit.m')}`} />
                {npsha !== null && (
                  <>
                    <ResultRow label={t('pump.npsha')} value={`${formatNum(npsha, 2)} ${t('unit.m')}`} />
                    <ResultRow label={t('pump.npsh_margin')} value={`${formatNum(npsha - operatingPoint.npshr_m, 2)} ${t('unit.m')}`} />
                  </>
                )}
              </>
            ) : (
              <div style={{ color: '#c00', fontSize: '0.9em' }}>{t('pump.no_intersection')}</div>
            )}

            {warnings.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                {warnings.map((w, i) => (
                  <div key={i} style={{ color: '#c00', fontSize: '0.85em', padding: '4px 0' }}>
                    {w}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Pump Suggestion */}
          <Section title={t('pump.suggestion_title')}>
            <Field label={t('pump.assumed_speed')}>
              <select
                value={speedMode === 'preset' ? String(presetSpeed) : 'custom'}
                onChange={e => {
                  if (e.target.value === 'custom') {
                    setSpeedMode('custom');
                  } else {
                    setSpeedMode('preset');
                    setPresetSpeed(Number(e.target.value));
                  }
                }}
                style={inputStyle}
              >
                {SPEED_PRESETS.map(p => (
                  <option key={p.value} value={String(p.value)}>{p.label}</option>
                ))}
                <option value="custom">{t('pump.custom_speed')}</option>
              </select>
              {speedMode === 'custom' && (
                <input
                  type="number"
                  value={customSpeed}
                  onChange={e => setCustomSpeed(Number(e.target.value))}
                  min={100}
                  step={50}
                  style={{ ...inputStyle, width: '80px', marginLeft: '6px' }}
                />
              )}
              {speedMode === 'custom' && <span style={{ marginLeft: '4px' }}>{t('unit.rpm')}</span>}
            </Field>

            {pumpSuggestion ? (
              <>
                <h4 style={{ margin: '12px 0 6px', fontSize: '0.9em', color: '#333' }}>{t('pump.design_point')}</h4>
                <ResultRow label={t('pump.required_flow')} value={`${formatNum(designFlow, 1)} ${t('unit.m3h')}`} />
                <ResultRow label={t('pump.required_head')} value={`${formatNum(totalHead, 1)} ${t('unit.m')}`} />

                <h4 style={{ margin: '12px 0 6px', fontSize: '0.9em', color: '#333' }}>{t('pump.specific_speed')}</h4>
                <ResultRow label="Ns" value={formatNum(pumpSuggestion.specificSpeed.ns, 0)} />
                <ResultRow
                  label={t('pump.recommended_type')}
                  value={t(`pump.type.${pumpSuggestion.specificSpeed.pumpType}`)}
                />

                <h4 style={{ margin: '12px 0 6px', fontSize: '0.9em', color: '#333' }}>{t('pump.bep_range')}</h4>
                <ResultRow
                  label={t('pump.bep_range')}
                  value={`${formatNum(pumpSuggestion.bep.bepFlowRange.min_m3h, 1)} ~ ${formatNum(pumpSuggestion.bep.bepFlowRange.max_m3h, 1)} ${t('unit.m3h')}`}
                />
                <ResultRow
                  label={t('pump.recommended_operating_range')}
                  value={`${formatNum(pumpSuggestion.bep.operatingRange.min_m3h, 1)} ~ ${formatNum(pumpSuggestion.bep.operatingRange.max_m3h, 1)} ${t('unit.m3h')}`}
                />

                {pumpSuggestion.maxNpshr_m !== null && (
                  <ResultRow
                    label={t('pump.max_npshr_allowed')}
                    value={`< ${formatNum(pumpSuggestion.maxNpshr_m, 2)} ${t('unit.m')}`}
                  />
                )}

                <ResultRow
                  label={t('pump.estimated_power')}
                  value={`~${formatNum(pumpSuggestion.estimatedPower_kW, 2)} ${t('pump.unit.kw')}`}
                />

                <div style={{ marginTop: '12px', fontSize: '0.8em', color: '#888' }}>
                  {t('pump.suggestion_note')}
                </div>
              </>
            ) : (
              <div style={{ color: '#999', fontSize: '0.85em' }}>
                {t('pump.design_point')}: {t('pump.input_flow')} &gt; 0, {t('pump.required_head')} &gt; 0
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* SVG Chart */}
      <Section title={t('pump.chart_title')}>
        <PumpPerformanceChart
          pumpCurve={pumpData.performance_curve}
          resistanceCurve={resistanceCurve}
          operatingPoint={operatingPoint}
          t={t}
          isDesktop={isDesktop}
        />
      </Section>
    </div>
  );
}

// ── SVG Chart ──

interface ChartProps {
  pumpCurve: readonly { flow_m3h: number; head_m: number; efficiency_pct: number; npshr_m: number }[];
  resistanceCurve: ResistanceCurvePoint[];
  operatingPoint: OperatingPoint | null;
  t: (key: string) => string;
}

function PumpPerformanceChart({ pumpCurve, resistanceCurve, operatingPoint, t, isDesktop }: ChartProps & { isDesktop?: boolean }) {
  const W = 600;
  const H = 400;
  const PAD = { top: 30, right: 80, bottom: 50, left: 60 };

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Axis ranges
  const allFlows = [...pumpCurve.map(p => p.flow_m3h), ...resistanceCurve.map(p => p.flow_m3h)];
  const allHeads = [...pumpCurve.map(p => p.head_m), ...resistanceCurve.map(p => p.head_m)];

  const maxFlow = Math.ceil(Math.max(...allFlows) / 5) * 5;
  const maxHead = Math.ceil(Math.max(...allHeads) / 5) * 5;

  const scaleX = (flow: number) => PAD.left + (flow / maxFlow) * chartW;
  const scaleY = (head: number) => PAD.top + chartH - (head / maxHead) * chartH;

  // Pump curve path
  const pumpPath = pumpCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.flow_m3h)} ${scaleY(p.head_m)}`)
    .join(' ');

  // Resistance curve path
  const resistancePath = resistanceCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.flow_m3h)} ${scaleY(p.head_m)}`)
    .join(' ');

  // Efficiency curve (scaled to right axis)
  const maxEff = 100;
  const scaleYEff = (eff: number) => PAD.top + chartH - (eff / maxEff) * chartH;
  const effPath = pumpCurve
    .filter(p => p.efficiency_pct > 0)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.flow_m3h)} ${scaleYEff(p.efficiency_pct)}`)
    .join(' ');

  // Grid lines
  const xTicks: number[] = [];
  for (let q = 0; q <= maxFlow; q += Math.max(1, Math.ceil(maxFlow / 6))) {
    xTicks.push(q);
  }
  const yTicks: number[] = [];
  for (let h = 0; h <= maxHead; h += Math.max(1, Math.ceil(maxHead / 6))) {
    yTicks.push(h);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: isDesktop ? undefined : '700px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}
    >
      {/* Grid */}
      {xTicks.map(q => (
        <line key={`gx${q}`} x1={scaleX(q)} y1={PAD.top} x2={scaleX(q)} y2={PAD.top + chartH}
          stroke="#eee" strokeWidth={1} />
      ))}
      {yTicks.map(h => (
        <line key={`gy${h}`} x1={PAD.left} y1={scaleY(h)} x2={PAD.left + chartW} y2={scaleY(h)}
          stroke="#eee" strokeWidth={1} />
      ))}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="#333" strokeWidth={1.5} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH}
        stroke="#333" strokeWidth={1.5} />

      {/* X axis labels */}
      {xTicks.map(q => (
        <text key={`lx${q}`} x={scaleX(q)} y={PAD.top + chartH + 18}
          textAnchor="middle" fontSize={11} fill="#555">{q}</text>
      ))}
      <text x={PAD.left + chartW / 2} y={H - 8}
        textAnchor="middle" fontSize={12} fill="#333">Q (m{'\u00B3'}/h)</text>

      {/* Y axis labels (left - head) */}
      {yTicks.map(h => (
        <text key={`ly${h}`} x={PAD.left - 8} y={scaleY(h) + 4}
          textAnchor="end" fontSize={11} fill="#555">{h}</text>
      ))}
      <text x={16} y={PAD.top + chartH / 2}
        textAnchor="middle" fontSize={12} fill="#333"
        transform={`rotate(-90, 16, ${PAD.top + chartH / 2})`}>H (m)</text>

      {/* Y axis labels (right - efficiency) */}
      <line x1={PAD.left + chartW} y1={PAD.top} x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="#999" strokeWidth={0.5} />
      {[0, 25, 50, 75, 100].map(e => (
        <text key={`le${e}`} x={PAD.left + chartW + 8} y={scaleYEff(e) + 4}
          textAnchor="start" fontSize={10} fill="#888">{e}%</text>
      ))}

      {/* Pump H-Q curve */}
      <path d={pumpPath} fill="none" stroke="#0066cc" strokeWidth={2.5} />

      {/* Resistance curve */}
      <path d={resistancePath} fill="none" stroke="#cc3300" strokeWidth={2} strokeDasharray="6,3" />

      {/* Efficiency curve */}
      {effPath && <path d={effPath} fill="none" stroke="#00aa44" strokeWidth={1.5} strokeDasharray="3,3" />}

      {/* Operating point */}
      {operatingPoint && (
        <>
          {/* Cross hair */}
          <line x1={scaleX(operatingPoint.flow_m3h)} y1={PAD.top}
            x2={scaleX(operatingPoint.flow_m3h)} y2={PAD.top + chartH}
            stroke="#666" strokeWidth={0.5} strokeDasharray="4,4" />
          <line x1={PAD.left} y1={scaleY(operatingPoint.head_m)}
            x2={PAD.left + chartW} y2={scaleY(operatingPoint.head_m)}
            stroke="#666" strokeWidth={0.5} strokeDasharray="4,4" />
          {/* Point */}
          <circle cx={scaleX(operatingPoint.flow_m3h)} cy={scaleY(operatingPoint.head_m)}
            r={6} fill="#ff6600" stroke="#fff" strokeWidth={2} />
          <text x={scaleX(operatingPoint.flow_m3h) + 10} y={scaleY(operatingPoint.head_m) - 10}
            fontSize={11} fill="#ff6600" fontWeight="bold">
            {formatNum(operatingPoint.flow_m3h, 1)} m{'\u00B3'}/h, {formatNum(operatingPoint.head_m, 1)} m
          </text>
        </>
      )}

      {/* Legend */}
      <g transform={`translate(${PAD.left + 10}, ${PAD.top + 8})`}>
        <line x1={0} y1={0} x2={20} y2={0} stroke="#0066cc" strokeWidth={2.5} />
        <text x={24} y={4} fontSize={10} fill="#333">{t('pump.curve_hq')}</text>

        <line x1={0} y1={16} x2={20} y2={16} stroke="#cc3300" strokeWidth={2} strokeDasharray="6,3" />
        <text x={24} y={20} fontSize={10} fill="#333">{t('pump.curve_resistance')}</text>

        <line x1={0} y1={32} x2={20} y2={32} stroke="#00aa44" strokeWidth={1.5} strokeDasharray="3,3" />
        <text x={24} y={36} fontSize={10} fill="#333">{t('pump.curve_efficiency')}</text>
      </g>
    </svg>
  );
}
