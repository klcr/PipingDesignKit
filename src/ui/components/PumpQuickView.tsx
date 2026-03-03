/**
 * ポンプ概要パネル — 計算タブ内にインライン表示する折りたたみ式コンポーネント
 *
 * 運転点・効率・NPSH状態・ミニチャートをコンパクトに表示し、
 * ポンプタブへの遷移なしで結果を確認可能にする。
 */

import { useState } from 'react';
import { useTranslation } from '../i18n/context';
import { useIsMobile } from '../hooks/useBreakpoint';
import { ResultRow } from './FormLayout';
import { formatNum } from './formatters';
import type { PumpResultSummary } from '../features/PumpChart';

interface PumpQuickViewProps {
  result: PumpResultSummary;
  currentCalcHead?: { staticHead_m: number; frictionHead_m: number } | null;
  onGoToPumpTab: () => void;
}

export function PumpQuickView({ result, currentCalcHead, onGoToPumpTab }: PumpQuickViewProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(!isMobile);

  // Check if pump analysis is stale (calculator inputs changed since analysis)
  const isStale = currentCalcHead != null && (
    Math.abs(currentCalcHead.staticHead_m - result.staticHead_m) > 0.01 ||
    Math.abs(currentCalcHead.frictionHead_m - result.frictionHead_m) > 0.01
  );

  const op = result.operatingPoint;

  // Collapsed: single-line summary
  const summaryText = op
    ? `Q=${formatNum(op.flow_m3h, 1)} m³/h, H=${formatNum(op.head_m, 1)} m, ${formatNum(op.efficiency_pct, 0)}%`
    : t('pump.no_intersection');

  return (
    <div style={{
      marginTop: '12px',
      border: '1px solid #b3d9f2',
      borderRadius: '8px',
      background: '#f0f7ff',
      overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8em', color: '#666' }}>{expanded ? '\u25BC' : '\u25B6'}</span>
          <span style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#0066cc' }}>
            {t('pump.quick_view')}
          </span>
          {!expanded && (
            <span style={{ fontSize: '0.85em', color: '#555', marginLeft: '4px' }}>
              {summaryText}
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onGoToPumpTab(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.8em', color: '#0066cc', textDecoration: 'underline',
            padding: '2px 4px',
          }}
        >
          {t('pump.open_full_view')}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 12px 10px' }}>
          {/* Stale warning */}
          {isStale && (
            <div style={{
              padding: '4px 8px', marginBottom: '8px',
              background: '#fff3cd', border: '1px solid #ffc107',
              borderRadius: '4px', fontSize: '0.8em', color: '#856404',
            }}>
              {t('pump.analysis_outdated')}
            </div>
          )}

          {/* Key metrics */}
          {op ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: isMobile ? '4px' : '12px',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              {/* Operating point + efficiency */}
              <div style={{ flex: 1, minWidth: '140px' }}>
                <ResultRow label={t('pump.operating_flow')} value={`${formatNum(op.flow_m3h, 1)} m³/h`} />
                <ResultRow label={t('pump.operating_head')} value={`${formatNum(op.head_m, 1)} m`} />
                <ResultRow label={t('pump.operating_efficiency')} value={`${formatNum(op.efficiency_pct, 1)}%`} />
                {result.estimatedPower_kW !== null && (
                  <ResultRow label={t('pump.estimated_power')} value={`~${formatNum(result.estimatedPower_kW, 2)} kW`} />
                )}
              </div>

              {/* NPSH status */}
              <div style={{ flex: 1, minWidth: '140px' }}>
                {result.npsha_m !== null && (
                  <>
                    <ResultRow label="NPSHa" value={`${formatNum(result.npsha_m, 2)} m`} />
                    <ResultRow label="NPSHr" value={`${formatNum(op.npshr_m, 2)} m`} />
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                    }}>
                      <span style={{ color: '#555' }}>NPSH</span>
                      <span style={{
                        fontWeight: 'bold',
                        color: result.npshMargin_m !== null && result.npshMargin_m >= 0 ? '#2e7d32' : '#c00',
                      }}>
                        {result.npshMargin_m !== null && result.npshMargin_m >= 0
                          ? t('pump.npsh_ok')
                          : t('pump.npsh_danger')
                        }
                      </span>
                    </div>
                  </>
                )}
                {result.recommendedType && (
                  <ResultRow
                    label={t('pump.recommended_type')}
                    value={t(`pump.type.${result.recommendedType}`)}
                  />
                )}
              </div>

              {/* Mini chart (desktop only) */}
              {!isMobile && result.miniChartPaths && (
                <div style={{ width: '200px', flexShrink: 0 }}>
                  <PumpMiniChart paths={result.miniChartPaths} hasOperatingPoint={op !== null} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#c00', fontSize: '0.85em', padding: '4px 0' }}>
              {t('pump.no_intersection')}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              {result.warnings.map((w, i) => (
                <div key={i} style={{ color: '#c00', fontSize: '0.8em', padding: '2px 0' }}>
                  {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mini SVG Chart ──

function PumpMiniChart({ paths, hasOperatingPoint }: {
  paths: NonNullable<PumpResultSummary['miniChartPaths']>;
  hasOperatingPoint: boolean;
}) {
  const W = 200;
  const H = 120;
  const PAD = 8;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  // Transform normalized (0-1) coordinates to chart pixel coordinates
  const transformPath = (d: string) =>
    d.replace(/([ML])\s*([\d.]+)\s+([\d.]+)/g, (_match, cmd: string, x: string, y: string) => {
      const px = PAD + parseFloat(x) * chartW;
      const py = PAD + parseFloat(y) * chartH;
      return `${cmd} ${px} ${py}`;
    });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{
        width: '100%',
        border: '1px solid #ddd',
        borderRadius: '6px',
        background: '#fff',
      }}
    >
      {/* Pump H-Q curve */}
      <path d={transformPath(paths.pumpCurvePath)} fill="none" stroke="#0066cc" strokeWidth={2} />
      {/* Resistance curve */}
      <path d={transformPath(paths.resistanceCurvePath)} fill="none" stroke="#cc3300" strokeWidth={1.5} strokeDasharray="4,2" />
      {/* Operating point */}
      {hasOperatingPoint && (
        <circle
          cx={PAD + paths.opPointX * chartW}
          cy={PAD + paths.opPointY * chartH}
          r={4}
          fill="#ff6600"
          stroke="#fff"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
