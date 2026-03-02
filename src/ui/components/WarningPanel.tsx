/**
 * 計算警告パネル — エッジケースの注意事項を表示する
 *
 * severity 別に色分け:
 *   caution (赤) — 計算が無効になりうる条件
 *   warning (黄) — 精度が低下する条件
 *   info    (青) — 認識しておくべき条件
 */

import type { CalcWarning, WarningSeverity } from '@domain/types';

const severityConfig: Record<WarningSeverity, { bg: string; border: string; icon: string }> = {
  caution: { bg: '#fef2f2', border: '#f87171', icon: '\u26D4' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '\u26A0\uFE0F' },
  info:    { bg: '#eff6ff', border: '#60a5fa', icon: '\u2139\uFE0F' },
};

const severityOrder: WarningSeverity[] = ['caution', 'warning', 'info'];

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

export function WarningPanel({
  warnings,
  t,
}: {
  warnings: readonly CalcWarning[];
  t: (key: string) => string;
}) {
  if (warnings.length === 0) return null;

  const sorted = [...warnings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  return (
    <div style={{ marginTop: '12px', marginBottom: '12px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '0.95em', color: '#555' }}>
        {t('warn.title')}
      </h4>
      {sorted.map((w, i) => {
        const cfg = severityConfig[w.severity];
        return (
          <div
            key={i}
            style={{
              padding: '8px 12px',
              marginBottom: '6px',
              background: cfg.bg,
              borderLeft: `4px solid ${cfg.border}`,
              borderRadius: '4px',
              fontSize: '0.85em',
              lineHeight: '1.5',
            }}
          >
            <span style={{ marginRight: '6px' }}>{cfg.icon}</span>
            {interpolate(t(w.messageKey), w.messageParams)}
          </div>
        );
      })}
    </div>
  );
}
