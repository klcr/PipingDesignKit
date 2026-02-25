/**
 * 3 ビュー統合レイアウト
 *
 * 平面図 (X-Y)、立面図 (X-Z)、アイソメ図を
 * グリッドレイアウトで同時表示し、ビュー間ハイライト同期を提供する。
 */

import { useTranslation } from '../i18n/context';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { ViewSyncProvider } from './ViewSyncContext';
import { PlanView } from './PlanView';
import { ElevationView } from './ElevationView';
import { IsometricView } from './IsometricView';

interface RouteViewsProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
}

export function RouteViews({ nodes, analysis }: RouteViewsProps) {
  const { t } = useTranslation();

  if (nodes.length < 2) return null;

  return (
    <div style={{
      marginBottom: '16px',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '1em', color: '#333' }}>
        {t('view.title')}
      </h3>

      <ViewSyncProvider>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}>
          {/* Plan View (top-left) */}
          <ViewPanel title={t('view.plan')}>
            <PlanView nodes={nodes} analysis={analysis} />
          </ViewPanel>

          {/* Elevation View (top-right) */}
          <ViewPanel title={t('view.elevation')}>
            <ElevationView nodes={nodes} analysis={analysis} />
          </ViewPanel>

          {/* Isometric View (bottom, spanning both columns) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <ViewPanel title={t('view.isometric')}>
              <IsometricView nodes={nodes} analysis={analysis} />
            </ViewPanel>
          </div>
        </div>
      </ViewSyncProvider>
    </div>
  );
}

function ViewPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '4px 8px',
        background: '#f0f4f8',
        fontSize: '0.8em',
        fontWeight: 'bold',
        color: '#555',
        borderBottom: '1px solid #e0e0e0',
      }}>
        {title}
      </div>
      <div style={{ height: '250px', padding: '4px' }}>
        {children}
      </div>
    </div>
  );
}
