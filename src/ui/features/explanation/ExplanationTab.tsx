/**
 * 計算解説タブ — 圧損計算の全ステップを数式付きで解説
 *
 * 10セクション構成:
 *  1. 流体物性  2. 配管ジオメトリ  3. 流速  4. レイノルズ数
 *  5. 摩擦係数  6. 直管圧損  7. 継手圧損  8. 高低差
 *  9. 合計  10. ポンプ選定
 */

import { useMemo } from 'react';
import { useTranslation } from '../../i18n/context';
import { FormulaBlock } from './FormulaBlock';
import type { ExplanationSnapshot, PumpExplanationSnapshot } from './types';

import { GRAVITY } from '@domain/types';
import { calcFlowArea, calcVelocity, calcReynolds, classifyFlow } from '@domain/pipe/pipeGeometry';
import { churchillFrictionFactor } from '@domain/pipe/frictionFactor';
import { calcStraightPipeLoss, pressureToHead } from '@domain/pipe/straightPipeLoss';
import { calcElevationLoss } from '@domain/system/headLoss';
import { calcNPSHa } from '@domain/system/pumpSelection';
import { darby3kData, entranceExitData } from '@infrastructure/dataLoader';
import { formatNum, formatPa } from '../../components/formatters';

interface ExplanationTabProps {
  snapshot: ExplanationSnapshot | null;
  pumpSnapshot: PumpExplanationSnapshot | null;
}

// ── 数値ヘルパー ──

function fmtSci(n: number, sig = 4): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 0.01 && abs < 100000) return formatNum(n, sig);
  return n.toExponential(sig - 1);
}

function fmtE(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 0.01 && abs < 10000) return formatNum(n, 4);
  const exp = Math.floor(Math.log10(abs));
  const coeff = n / Math.pow(10, exp);
  return `${formatNum(coeff, 3)} \\times 10^{${exp}}`;
}

export function ExplanationTab({ snapshot, pumpSnapshot }: ExplanationTabProps) {
  const { t } = useTranslation();

  // ── 圧損計算の中間値を再計算 ──
  const calc = useMemo(() => {
    if (!snapshot) return null;
    const { pipe, material, fluid, flowRate_m3h, length_m, elevation_m } = snapshot;
    const flowRate_m3s = flowRate_m3h / 3600;
    const id_mm = pipe.id_mm;
    const id_m = id_mm / 1000;
    const area = calcFlowArea(id_mm);
    const velocity = calcVelocity(flowRate_m3s, area);
    const reynolds = calcReynolds(fluid.density, velocity, id_m, fluid.viscosity);
    const flowRegime = classifyFlow(reynolds);
    const relRoughness = material.roughness_mm / id_mm;
    const frictionResult = churchillFrictionFactor(reynolds, material.roughness_mm, id_mm);
    const f = frictionResult.f;
    const dp_friction = calcStraightPipeLoss(f, length_m, id_mm, fluid.density, velocity);
    const head_friction = pressureToHead(dp_friction, fluid.density);
    const dp_elevation = calcElevationLoss(fluid.density, elevation_m);
    const dynamicPressure = fluid.density * velocity * velocity / 2;

    // Churchill の中間値
    const churchill_term1 = Math.pow(8 / reynolds, 12);
    const churchill_innerA = Math.pow(7 / reynolds, 0.9) + 0.27 * relRoughness;
    const churchill_A = Math.pow(2.457 * Math.log(1 / churchill_innerA), 16);
    const churchill_B = Math.pow(37530 / reynolds, 16);

    return {
      flowRate_m3s, id_mm, id_m, area, velocity, reynolds, flowRegime,
      relRoughness, f, frictionMethod: frictionResult.method,
      dp_friction, head_friction, dp_elevation, dynamicPressure,
      churchill_term1, churchill_innerA, churchill_A, churchill_B,
    };
  }, [snapshot]);

  // ── ポンプ計算の中間値 ──
  const pumpCalc = useMemo(() => {
    if (!pumpSnapshot) return null;
    const { designFlow_m3h, staticHead_m, frictionHead_m, density,
            vaporPressure_kPa, atmosphericPressure_kPa,
            suctionStaticHead_m, suctionFrictionLoss_m, speed_rpm } = pumpSnapshot;
    const totalHead = staticHead_m + frictionHead_m;
    const npsha = calcNPSHa({
      atmosphericPressure_kPa, vaporPressure_kPa,
      suctionStaticHead_m, suctionFrictionLoss_m, density,
    });
    const K_resist = frictionHead_m / (designFlow_m3h * designFlow_m3h);
    const flow_m3min = designFlow_m3h / 60;
    const ns = speed_rpm > 0 && flow_m3min > 0 && totalHead > 0
      ? speed_rpm * Math.sqrt(flow_m3min) / Math.pow(totalHead, 0.75)
      : 0;
    const sug = pumpSnapshot.suggestion;
    const eta = sug ? (sug.specificSpeed.typicalEfficiency_pct.min + sug.specificSpeed.typicalEfficiency_pct.max) / 2 / 100 : 0.7;
    const flow_m3s = designFlow_m3h / 3600;
    const power_kW = eta > 0 ? (density * GRAVITY * flow_m3s * totalHead) / (eta * 1000) : 0;
    return { totalHead, npsha, K_resist, ns, eta, power_kW, flow_m3min, flow_m3s };
  }, [pumpSnapshot]);

  if (!snapshot || !calc) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
        <p style={{ fontSize: '1.2em', marginBottom: '8px' }}>
          {t('explain.no_data')}
        </p>
        <p style={{ fontSize: '0.9em' }}>
          {t('explain.no_data_hint')}
        </p>
      </div>
    );
  }

  const s = snapshot;
  const c = calc;

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '4px' }}>{t('explain.title')}</h2>
      <p style={{ color: '#666', marginTop: 0, marginBottom: '20px', fontSize: '0.9em' }}>
        {t('explain.subtitle')}
      </p>

      {/* ── Section 1: 流体物性 ── */}
      <FormulaBlock
        step={1}
        title={t('explain.s1_title')}
        description={t('explain.s1_desc')}
        symbolicTeX={[
          '\\rho \\;\\text{[kg/m³]}\\quad \\mu \\;\\text{[Pa·s]}'
        ]}
        substitutedTeX={[
          `\\rho = ${formatNum(s.fluid.density, 1)} \\;\\text{kg/m³}`,
          `\\mu = ${fmtE(s.fluid.viscosity)} \\;\\text{Pa·s}`,
        ]}
        variables={[
          { symbol: '\\rho', name: t('explain.var_density'), value: `${formatNum(s.fluid.density, 1)} kg/m³`, description: t('explain.var_density_desc') },
          { symbol: '\\mu', name: t('explain.var_viscosity'), value: `${fmtSci(s.fluid.viscosity)} Pa·s`, description: t('explain.var_viscosity_desc') },
          { symbol: 'T', name: t('explain.var_temperature'), value: `${formatNum(s.fluid.temperature, 1)} °C`, description: t('explain.var_temperature_desc') },
        ]}
        reference={s.fluid.reference.source}
      />

      {/* ── Section 2: 配管ジオメトリ ── */}
      <FormulaBlock
        step={2}
        title={t('explain.s2_title')}
        description={t('explain.s2_desc')}
        symbolicTeX="A = \\pi \\left( \\frac{D}{2} \\right)^2"
        substitutedTeX={`A = \\pi \\left( \\frac{${formatNum(c.id_mm, 2)} \\times 10^{-3}}{2} \\right)^2 = ${fmtE(c.area)} \\;\\text{m²}`}
        result={`A = ${fmtSci(c.area)} m²`}
        variables={[
          { symbol: 'D', name: t('explain.var_diameter'), value: `${formatNum(c.id_mm, 2)} mm (${formatNum(c.id_m, 4)} m)`, description: t('explain.var_diameter_desc') },
          { symbol: 'A', name: t('explain.var_area'), value: `${fmtSci(c.area)} m²`, description: t('explain.var_area_desc') },
          { symbol: '\\varepsilon', name: t('explain.var_roughness'), value: `${s.material.roughness_mm} mm`, description: `${s.material.name} — ${s.material.reference.source}` },
        ]}
      />

      {/* ── Section 3: 流速 ── */}
      <FormulaBlock
        step={3}
        title={t('explain.s3_title')}
        description={t('explain.s3_desc')}
        symbolicTeX="V = \\frac{Q}{A}"
        substitutedTeX={`V = \\frac{${fmtE(c.flowRate_m3s)}}{${fmtE(c.area)}} = ${formatNum(c.velocity, 3)} \\;\\text{m/s}`}
        result={`V = ${formatNum(c.velocity, 3)} m/s`}
        note={c.velocity > 3 ? t('explain.velocity_high') : c.velocity < 0.5 ? t('explain.velocity_low') : undefined}
        variables={[
          { symbol: 'Q', name: t('explain.var_flowrate'), value: `${formatNum(s.flowRate_m3h, 2)} m³/h (${fmtSci(c.flowRate_m3s)} m³/s)`, description: t('explain.var_flowrate_desc') },
          { symbol: 'A', name: t('explain.var_area'), value: `${fmtSci(c.area)} m²`, description: t('explain.var_area_ref') },
          { symbol: 'V', name: t('explain.var_velocity'), value: `${formatNum(c.velocity, 3)} m/s`, description: t('explain.var_velocity_desc') },
        ]}
      />

      {/* ── Section 4: レイノルズ数 ── */}
      <FormulaBlock
        step={4}
        title={t('explain.s4_title')}
        description={t('explain.s4_desc')}
        symbolicTeX="Re = \\frac{\\rho V D}{\\mu}"
        substitutedTeX={`Re = \\frac{${formatNum(s.fluid.density, 1)} \\times ${formatNum(c.velocity, 3)} \\times ${formatNum(c.id_m, 5)}}{${fmtE(s.fluid.viscosity)}} = ${formatNum(c.reynolds, 0)}`}
        result={`Re = ${formatNum(c.reynolds, 0)}`}
        note={`${t('explain.flow_regime')}: ${t(`flow.regime.${c.flowRegime}`)} (${
          c.flowRegime === 'laminar' ? 'Re < 2,100' :
          c.flowRegime === 'transitional' ? '2,100 ≤ Re < 4,000' :
          'Re ≥ 4,000'
        })`}
        variables={[
          { symbol: '\\rho', name: t('explain.var_density'), value: `${formatNum(s.fluid.density, 1)} kg/m³`, description: t('explain.var_density_ref') },
          { symbol: 'V', name: t('explain.var_velocity'), value: `${formatNum(c.velocity, 3)} m/s`, description: t('explain.var_velocity_ref') },
          { symbol: 'D', name: t('explain.var_diameter'), value: `${formatNum(c.id_m, 5)} m`, description: t('explain.var_diameter_ref') },
          { symbol: '\\mu', name: t('explain.var_viscosity'), value: `${fmtSci(s.fluid.viscosity)} Pa·s`, description: t('explain.var_viscosity_ref') },
        ]}
      />

      {/* ── Section 5: 摩擦係数 ── */}
      <FormulaBlock
        step={5}
        title={t('explain.s5_title')}
        description={t('explain.s5_desc')}
        symbolicTeX={[
          'f = 8 \\left[ \\left(\\frac{8}{Re}\\right)^{12} + \\left(A + B\\right)^{-3/2} \\right]^{1/12}',
          'A = \\left[ 2.457 \\ln\\frac{1}{\\left(7/Re\\right)^{0.9} + 0.27\\,(\\varepsilon/D)} \\right]^{16}',
          'B = \\left( \\frac{37530}{Re} \\right)^{16}',
        ]}
        substitutedTeX={[
          `\\varepsilon/D = ${formatNum(s.material.roughness_mm, 4)} / ${formatNum(c.id_mm, 2)} = ${fmtSci(c.relRoughness)}`,
          `(7/Re)^{0.9} + 0.27\\,(\\varepsilon/D) = ${fmtE(c.churchill_innerA)}`,
          `A = ${fmtE(c.churchill_A)}`,
          `B = ${fmtE(c.churchill_B)}`,
          `f = ${fmtSci(c.f, 6)}`,
        ]}
        result={`f = ${formatNum(c.f, 6)}`}
        variables={[
          { symbol: 'Re', name: t('explain.var_reynolds'), value: formatNum(c.reynolds, 0), description: t('explain.var_reynolds_ref') },
          { symbol: '\\varepsilon', name: t('explain.var_roughness'), value: `${s.material.roughness_mm} mm`, description: `${s.material.name}` },
          { symbol: 'D', name: t('explain.var_diameter'), value: `${formatNum(c.id_mm, 2)} mm`, description: t('explain.var_diameter_ref') },
          { symbol: 'f', name: t('explain.var_friction_factor'), value: formatNum(c.f, 6), description: t('explain.var_friction_factor_desc') },
        ]}
        reference="Churchill, S.W., 1977"
      />

      {/* ── Section 6: 直管圧損 ── */}
      <FormulaBlock
        step={6}
        title={t('explain.s6_title')}
        description={t('explain.s6_desc')}
        symbolicTeX={[
          '\\Delta P_{\\text{pipe}} = f \\cdot \\frac{L}{D} \\cdot \\frac{\\rho V^2}{2}',
          'h_{\\text{pipe}} = \\frac{\\Delta P_{\\text{pipe}}}{\\rho g}',
        ]}
        substitutedTeX={[
          `\\Delta P_{\\text{pipe}} = ${formatNum(c.f, 6)} \\times \\frac{${formatNum(s.length_m, 1)}}{${formatNum(c.id_m, 5)}} \\times \\frac{${formatNum(s.fluid.density, 1)} \\times ${formatNum(c.velocity, 3)}^2}{2}`,
          `= ${formatPa(c.dp_friction)}`,
          `h_{\\text{pipe}} = \\frac{${formatNum(c.dp_friction, 1)}}{${formatNum(s.fluid.density, 1)} \\times ${formatNum(GRAVITY, 5)}} = ${formatNum(c.head_friction, 3)} \\;\\text{m}`,
        ]}
        result={`${formatPa(c.dp_friction)} (${formatNum(c.head_friction, 3)} m)`}
        variables={[
          { symbol: 'f', name: t('explain.var_friction_factor'), value: formatNum(c.f, 6), description: t('explain.var_friction_factor_ref') },
          { symbol: 'L', name: t('explain.var_length'), value: `${formatNum(s.length_m, 1)} m`, description: t('explain.var_length_desc') },
          { symbol: 'D', name: t('explain.var_diameter'), value: `${formatNum(c.id_m, 5)} m`, description: t('explain.var_diameter_ref') },
          { symbol: '\\rho', name: t('explain.var_density'), value: `${formatNum(s.fluid.density, 1)} kg/m³`, description: t('explain.var_density_ref') },
          { symbol: 'V', name: t('explain.var_velocity'), value: `${formatNum(c.velocity, 3)} m/s`, description: t('explain.var_velocity_ref') },
          { symbol: 'g', name: t('explain.var_gravity'), value: `${GRAVITY} m/s²`, description: t('explain.var_gravity_desc') },
        ]}
        reference="Darcy-Weisbach equation"
      />

      {/* ── Section 7: 継手・バルブ圧損 ── */}
      <FittingSection snapshot={s} calc={c} t={t} />

      {/* ── Section 8: 高低差 ── */}
      <FormulaBlock
        step={8}
        title={t('explain.s8_title')}
        description={t('explain.s8_desc')}
        symbolicTeX="\\Delta P_{\\text{elev}} = \\rho \\, g \\, \\Delta z"
        substitutedTeX={`\\Delta P_{\\text{elev}} = ${formatNum(s.fluid.density, 1)} \\times ${formatNum(GRAVITY, 5)} \\times ${formatNum(s.elevation_m, 2)} = ${formatPa(c.dp_elevation)}`}
        result={`${formatPa(c.dp_elevation)} (${formatNum(s.elevation_m, 2)} m)`}
        variables={[
          { symbol: '\\rho', name: t('explain.var_density'), value: `${formatNum(s.fluid.density, 1)} kg/m³`, description: t('explain.var_density_ref') },
          { symbol: 'g', name: t('explain.var_gravity'), value: `${GRAVITY} m/s²`, description: t('explain.var_gravity_desc') },
          { symbol: '\\Delta z', name: t('explain.var_elevation'), value: `${formatNum(s.elevation_m, 2)} m`, description: t('explain.var_elevation_desc') },
        ]}
      />

      {/* ── Section 9: 合計 ── */}
      <TotalSection snapshot={s} t={t} />

      {/* ── Section 10: ポンプ選定 ── */}
      {pumpSnapshot && pumpCalc ? (
        <PumpSection pump={pumpSnapshot} pc={pumpCalc} t={t} />
      ) : (
        <details style={{ marginBottom: '16px', border: '1px solid #d0d7de', borderRadius: '8px' }}>
          <summary style={{
            padding: '12px 16px', background: '#f6f8fa', cursor: 'pointer',
            fontWeight: 'bold', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{
              background: '#999', color: '#fff', borderRadius: '50%',
              width: '24px', height: '24px', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '0.8em',
            }}>10</span>
            {t('explain.s10_title')}
          </summary>
          <div style={{ padding: '16px', color: '#888', textAlign: 'center' }}>
            {t('explain.s10_no_data')}
          </div>
        </details>
      )}
    </div>
  );
}

// Intermediate calculation values type
interface CalcValues {
  flowRate_m3s: number; id_mm: number; id_m: number; area: number;
  velocity: number; reynolds: number; flowRegime: string;
  relRoughness: number; f: number; frictionMethod: string;
  dp_friction: number; head_friction: number; dp_elevation: number; dynamicPressure: number;
  churchill_term1: number; churchill_innerA: number; churchill_A: number; churchill_B: number;
}

// ── Section 7: 継手圧損（個別継手ごとの解説） ──

function FittingSection({ snapshot, calc, t }: {
  snapshot: ExplanationSnapshot;
  calc: CalcValues;
  t: (key: string) => string;
}) {
  const s = snapshot;
  const c = calc;
  const result = s.result;
  const dp_fittings = result.dp_fittings;
  const head_fittings = result.head_fittings_m;
  const totalK = result.fittingDetails.reduce((sum, fd) => sum + fd.k_value * fd.quantity, 0);

  // Build per-fitting substitution lines
  const fittingLines: string[] = [];
  for (const fd of result.fittingDetails) {
    const darbyEntry = darby3kData.fittings.find(f => f.id === fd.id);
    const entranceEntry = entranceExitData.entrances.find(e => e.id === fd.id);
    const exitEntry = entranceExitData.exits.find(e => e.id === fd.id);

    if (fd.method === '3k' && darbyEntry) {
      const id_inch = c.id_mm / 25.4;
      fittingLines.push(
        `\\text{${fd.description}}: K = \\frac{${darbyEntry.k1}}{${formatNum(c.reynolds, 0)}} + ${darbyEntry.ki}\\left(1 + \\frac{${darbyEntry.kd}}{${formatNum(id_inch, 3)}^{0.3}}\\right) = ${formatNum(fd.k_value, 4)}`
      );
    } else if (fd.method === 'cv') {
      const id_inch = c.id_mm / 25.4;
      const fittingInput = s.fittings.find(fi => fi.fittingId === fd.id);
      const cv = fittingInput?.cvOverride ?? 0;
      fittingLines.push(
        `\\text{Cv=${formatNum(cv, 1)}}: K = \\frac{894 \\times ${formatNum(id_inch, 3)}^4}{${formatNum(cv, 1)}^2} = ${formatNum(fd.k_value, 4)}`
      );
    } else if (fd.method === 'fixed_k') {
      const k = entranceEntry?.k ?? exitEntry?.k ?? fd.k_value;
      fittingLines.push(`\\text{${fd.description}}: K = ${formatNum(k, 4)}`);
    }
  }

  return (
    <FormulaBlock
      step={7}
      title={t('explain.s7_title')}
      description={t('explain.s7_desc')}
      symbolicTeX={[
        '\\Delta P_{\\text{fitting}} = K \\cdot \\frac{\\rho V^2}{2}',
        'h_{\\text{fitting}} = K \\cdot \\frac{V^2}{2g}',
        '\\text{Darby 3-K: } K = \\frac{K_1}{Re} + K_i\\left(1 + \\frac{K_d}{D_{\\text{inch}}^{0.3}}\\right)',
      ]}
      substitutedTeX={[
        ...fittingLines,
        `\\sum K = ${formatNum(totalK, 4)} \\quad (\\times n)`,
        `\\Delta P_{\\text{fittings}} = ${formatNum(totalK, 4)} \\times \\frac{${formatNum(s.fluid.density, 1)} \\times ${formatNum(c.velocity, 3)}^2}{2} = ${formatPa(dp_fittings)}`,
        `h_{\\text{fittings}} = ${formatNum(head_fittings, 3)} \\;\\text{m}`,
      ]}
      result={`${formatPa(dp_fittings)} (${formatNum(head_fittings, 3)} m)`}
      variables={[]}
      reference="Darby, 2001 / Idelchik, 2007 / ISA-75.01"
    />
  );
}

// ── Section 9: 合計 ──

function TotalSection({ snapshot, t }: {
  snapshot: ExplanationSnapshot;
  t: (key: string) => string;
}) {
  const r = snapshot.result;
  return (
    <FormulaBlock
      step={9}
      title={t('explain.s9_title')}
      description={t('explain.s9_desc')}
      symbolicTeX={[
        '\\Delta P_{\\text{total}} = \\Delta P_{\\text{pipe}} + \\Delta P_{\\text{fittings}} + \\Delta P_{\\text{elev}}',
        'h_{\\text{total}} = \\frac{\\Delta P_{\\text{total}}}{\\rho \\, g}',
      ]}
      substitutedTeX={[
        `\\Delta P_{\\text{total}} = ${formatPa(r.dp_friction)} + ${formatPa(r.dp_fittings)} + ${formatPa(r.dp_elevation)}`,
        `= ${formatPa(r.dp_total)}`,
        `h_{\\text{total}} = \\frac{${formatNum(r.dp_total, 1)}}{${formatNum(snapshot.fluid.density, 1)} \\times ${formatNum(GRAVITY, 5)}} = ${formatNum(r.head_total_m, 3)} \\;\\text{m}`,
      ]}
      result={`${formatPa(r.dp_total)} (${formatNum(r.head_total_m, 3)} m)`}
      variables={[
        { symbol: '\\Delta P_{\\text{pipe}}', name: t('results.dp_friction'), value: formatPa(r.dp_friction), description: `${formatNum(r.head_friction_m, 3)} m` },
        { symbol: '\\Delta P_{\\text{fittings}}', name: t('results.dp_fittings'), value: formatPa(r.dp_fittings), description: `${formatNum(r.head_fittings_m, 3)} m` },
        { symbol: '\\Delta P_{\\text{elev}}', name: t('results.dp_elevation'), value: formatPa(r.dp_elevation), description: `${formatNum(r.head_elevation_m, 2)} m` },
      ]}
    />
  );
}

// ── Section 10: ポンプ選定 ──

function PumpSection({ pump, pc, t }: {
  pump: PumpExplanationSnapshot;
  pc: { totalHead: number; npsha: number; K_resist: number; ns: number; eta: number; power_kW: number; flow_m3min: number; flow_m3s: number };
  t: (key: string) => string;
}) {
  const sugType = pump.suggestion?.specificSpeed.pumpType;
  const typeLabel = sugType ? t(`pump.type.${sugType}`) : '—';

  return (
    <FormulaBlock
      step={10}
      title={t('explain.s10_title')}
      description={t('explain.s10_desc')}
      symbolicTeX={[
        'H_{\\text{total}} = H_{\\text{static}} + H_{\\text{friction}}',
        '\\text{NPSHa} = \\frac{P_a - P_v}{\\rho g} + h_s - h_f',
        'H = H_{\\text{static}} + K \\cdot Q^2 \\quad \\text{(Resistance curve)}',
        'N_s = \\frac{N \\sqrt{Q}}{H^{3/4}} \\quad (Q: \\text{m³/min})',
        'P = \\frac{\\rho g Q H}{\\eta \\times 1000} \\;\\text{[kW]}',
      ]}
      substitutedTeX={[
        `H_{\\text{total}} = ${formatNum(pump.staticHead_m, 2)} + ${formatNum(pump.frictionHead_m, 2)} = ${formatNum(pc.totalHead, 2)} \\;\\text{m}`,
        `\\text{NPSHa} = \\frac{(${formatNum(pump.atmosphericPressure_kPa, 3)} - ${formatNum(pump.vaporPressure_kPa, 3)}) \\times 1000}{${formatNum(pump.density, 1)} \\times ${formatNum(GRAVITY, 5)}} + ${formatNum(pump.suctionStaticHead_m, 1)} - ${formatNum(pump.suctionFrictionLoss_m, 1)} = ${formatNum(pc.npsha, 2)} \\;\\text{m}`,
        `K = \\frac{${formatNum(pump.frictionHead_m, 2)}}{${formatNum(pump.designFlow_m3h, 2)}^2} = ${fmtE(pc.K_resist)}`,
        pc.ns > 0 ? `N_s = \\frac{${pump.speed_rpm} \\times \\sqrt{${formatNum(pc.flow_m3min, 4)}}}{${formatNum(pc.totalHead, 2)}^{0.75}} = ${formatNum(pc.ns, 1)}` : 'N_s = \\text{N/A}',
        `P = \\frac{${formatNum(pump.density, 1)} \\times ${formatNum(GRAVITY, 5)} \\times ${fmtE(pc.flow_m3s)} \\times ${formatNum(pc.totalHead, 2)}}{${formatNum(pc.eta, 3)} \\times 1000} = ${formatNum(pc.power_kW, 2)} \\;\\text{kW}`,
      ]}
      result={`TDH = ${formatNum(pc.totalHead, 2)} m / NPSHa = ${formatNum(pc.npsha, 2)} m / P = ${formatNum(pc.power_kW, 2)} kW`}
      note={pc.ns > 0 ? `${t('explain.pump_type')}: ${typeLabel} (Ns = ${formatNum(pc.ns, 1)})` : undefined}
      variables={[
        { symbol: 'H_{\\text{static}}', name: t('pump.static_head'), value: `${formatNum(pump.staticHead_m, 2)} m`, description: t('explain.var_static_head_desc') },
        { symbol: 'H_{\\text{friction}}', name: t('pump.friction_head'), value: `${formatNum(pump.frictionHead_m, 2)} m`, description: t('explain.var_friction_head_desc') },
        { symbol: 'P_a', name: t('pump.atm_pressure'), value: `${formatNum(pump.atmosphericPressure_kPa, 3)} kPa`, description: t('explain.var_atm_desc') },
        { symbol: 'P_v', name: t('explain.var_vapor_pressure'), value: `${formatNum(pump.vaporPressure_kPa, 3)} kPa`, description: t('explain.var_vapor_desc') },
        { symbol: 'h_s', name: t('pump.suction_static_head'), value: `${formatNum(pump.suctionStaticHead_m, 1)} m`, description: t('explain.var_suction_head_desc') },
        { symbol: 'h_f', name: t('pump.suction_friction_loss'), value: `${formatNum(pump.suctionFrictionLoss_m, 1)} m`, description: t('explain.var_suction_loss_desc') },
        { symbol: 'N', name: t('pump.rated_speed'), value: `${pump.speed_rpm} rpm`, description: t('explain.var_speed_desc') },
        { symbol: '\\eta', name: t('explain.var_efficiency'), value: formatNum(pc.eta * 100, 1) + '%', description: t('explain.var_efficiency_desc') },
      ]}
      reference="Pump Handbook, 4th Ed., Karassik et al."
    />
  );
}
