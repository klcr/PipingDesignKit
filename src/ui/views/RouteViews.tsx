/**
 * 3 ビュー統合レイアウト
 *
 * 平面図 (X-Y)、立面図 (X-Z)、アイソメ図を
 * グリッドレイアウトで同時表示し、ビュー間ハイライト同期を提供する。
 * 確定/キャンセル/Undo/Redo ボタンをヘッダーに配置。
 */

import { useRef } from 'react';
import { useTranslation } from '../i18n/context';
import { useIsMobile } from '../hooks/useBreakpoint';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { ViewSyncProvider } from './ViewSyncContext';
import { PlanView, ViewHandle } from './PlanView';
import { ElevationView } from './ElevationView';
import { IsometricView } from './IsometricView';

interface RouteViewsProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
  onNodeDrag?: (index: number, x: number, y: number) => void;
  onNodeDragElevation?: (index: number, x: number, z: number) => void;
  onSegmentDragPlan?: (segmentIndex: number, deltaX: number, deltaY: number) => void;
  onSegmentDragElevation?: (segmentIndex: number, deltaX: number, deltaZ: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  hasChanges?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function RouteViews({
  nodes, analysis,
  onNodeDrag, onNodeDragElevation, onSegmentDragPlan, onSegmentDragElevation, onDragStart, onDragEnd,
  hasChanges, onConfirm, onCancel,
  canUndo, canRedo, onUndo, onRedo,
}: RouteViewsProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const planRef = useRef<ViewHandle>(null);
  const elevRef = useRef<ViewHandle>(null);
  const isoRef = useRef<ViewHandle>(null);

  if (nodes.length < 2) return null;

  return (
    <div style={{
      marginBottom: '16px',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
    }}>
      {/* Header with title and action buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '0 0 8px',
      }}>
        <h3 style={{ margin: 0, fontSize: '1em', color: '#333' }}>
          {t('view.title')}
        </h3>

        {/* Undo/Redo */}
        {canUndo && (
          <button onClick={onUndo} style={headerBtnStyle} title={t('view.undo')}>
            {'\u21A9'}
          </button>
        )}
        {canRedo && (
          <button onClick={onRedo} style={headerBtnStyle} title={t('view.redo')}>
            {'\u21AA'}
          </button>
        )}

        <span style={{ flex: 1 }} />

        {/* Confirm / Cancel — visible only when changes exist */}
        {hasChanges && (
          <>
            <button onClick={onConfirm} style={confirmBtnStyle}>
              {t('view.confirm')}
            </button>
            <button onClick={onCancel} style={cancelBtnStyle}>
              {t('view.cancel')}
            </button>
          </>
        )}
      </div>

      <ViewSyncProvider>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '8px',
        }}>
          {/* Plan View (top-left) */}
          <ViewPanel
            title={t('view.plan')}
            onReset={() => planRef.current?.resetTransform()}
            resetLabel={t('view.reset_view')}
          >
            <PlanView
              ref={planRef}
              nodes={nodes}
              analysis={analysis}
              onNodeDrag={onNodeDrag}
              onSegmentDrag={onSegmentDragPlan}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </ViewPanel>

          {/* Elevation View (top-right) */}
          <ViewPanel
            title={t('view.elevation')}
            onReset={() => elevRef.current?.resetTransform()}
            resetLabel={t('view.reset_view')}
          >
            <ElevationView
              ref={elevRef}
              nodes={nodes}
              analysis={analysis}
              onNodeDrag={onNodeDragElevation}
              onSegmentDrag={onSegmentDragElevation}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </ViewPanel>

          {/* Isometric View (bottom, spanning both columns) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <ViewPanel
              title={t('view.isometric')}
              onReset={() => isoRef.current?.resetTransform()}
              resetLabel={t('view.reset_view')}
            >
              <IsometricView ref={isoRef} nodes={nodes} analysis={analysis} />
            </ViewPanel>
          </div>
        </div>
      </ViewSyncProvider>
    </div>
  );
}

function ViewPanel({ title, children, onReset, resetLabel }: {
  title: string;
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
}) {
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
        display: 'flex',
        alignItems: 'center',
      }}>
        <span>{title}</span>
        <span style={{ flex: 1 }} />
        {onReset && (
          <button
            onClick={onReset}
            style={resetBtnStyle}
            title={resetLabel}
          >
            {resetLabel}
          </button>
        )}
      </div>
      <div style={{ height: '250px', padding: '4px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Button styles ──

const headerBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '0.9em',
  lineHeight: '1.4',
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #0066cc',
  borderRadius: '4px',
  background: '#0066cc',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.8em',
  fontWeight: 'bold',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  color: '#555',
  cursor: 'pointer',
  fontSize: '0.8em',
};

const resetBtnStyle: React.CSSProperties = {
  padding: '1px 6px',
  border: '1px solid #ccc',
  borderRadius: '3px',
  background: '#fff',
  color: '#888',
  cursor: 'pointer',
  fontSize: '0.75em',
};
