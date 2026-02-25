/**
 * ビュー間ハイライト同期 Context
 *
 * 平面図・立面図・アイソメ図の 3 ビュー間で
 * ホバー/選択状態を共有するための React Context。
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ViewSyncState {
  hoveredNodeIndex: number | null;
  hoveredSegmentIndex: number | null;
  selectedNodeIndex: number | null;
  selectedSegmentIndex: number | null;
}

interface ViewSyncActions {
  state: ViewSyncState;
  hoverNode(index: number | null): void;
  hoverSegment(index: number | null): void;
  selectNode(index: number | null): void;
  selectSegment(index: number | null): void;
}

const ViewSyncContext = createContext<ViewSyncActions | null>(null);

export function ViewSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewSyncState>({
    hoveredNodeIndex: null,
    hoveredSegmentIndex: null,
    selectedNodeIndex: null,
    selectedSegmentIndex: null,
  });

  const hoverNode = useCallback((index: number | null) => {
    setState(prev => ({ ...prev, hoveredNodeIndex: index }));
  }, []);

  const hoverSegment = useCallback((index: number | null) => {
    setState(prev => ({ ...prev, hoveredSegmentIndex: index }));
  }, []);

  const selectNode = useCallback((index: number | null) => {
    setState(prev => ({
      ...prev,
      selectedNodeIndex: prev.selectedNodeIndex === index ? null : index,
      selectedSegmentIndex: null,
    }));
  }, []);

  const selectSegment = useCallback((index: number | null) => {
    setState(prev => ({
      ...prev,
      selectedSegmentIndex: prev.selectedSegmentIndex === index ? null : index,
      selectedNodeIndex: null,
    }));
  }, []);

  return (
    <ViewSyncContext.Provider value={{ state, hoverNode, hoverSegment, selectNode, selectSegment }}>
      {children}
    </ViewSyncContext.Provider>
  );
}

export function useViewSync(): ViewSyncActions {
  const ctx = useContext(ViewSyncContext);
  if (!ctx) {
    throw new Error('useViewSync must be used within a ViewSyncProvider');
  }
  return ctx;
}
