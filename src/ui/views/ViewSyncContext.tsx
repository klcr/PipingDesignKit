/**
 * ビュー間ハイライト同期 Context
 *
 * 平面図・立面図・アイソメ図の 3 ビュー間で
 * ホバー/選択/ドラッグ状態を共有するための React Context。
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ViewSyncState {
  hoveredNodeIndex: number | null;
  hoveredSegmentIndex: number | null;
  selectedNodeIndex: number | null;
  selectedSegmentIndex: number | null;
  draggingNodeIndex: number | null;
  isDragging: boolean;
}

interface ViewSyncActions {
  state: ViewSyncState;
  hoverNode(index: number | null): void;
  hoverSegment(index: number | null): void;
  selectNode(index: number | null): void;
  selectSegment(index: number | null): void;
  startDrag(index: number): void;
  endDrag(): void;
  deselectAll(): void;
}

const ViewSyncContext = createContext<ViewSyncActions | null>(null);

export function ViewSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewSyncState>({
    hoveredNodeIndex: null,
    hoveredSegmentIndex: null,
    selectedNodeIndex: null,
    selectedSegmentIndex: null,
    draggingNodeIndex: null,
    isDragging: false,
  });

  const hoverNode = useCallback((index: number | null) => {
    setState(prev => ({ ...prev, hoveredNodeIndex: index }));
  }, []);

  const hoverSegment = useCallback((index: number | null) => {
    setState(prev => ({ ...prev, hoveredSegmentIndex: index }));
  }, []);

  // Clicking the already-selected node keeps it selected (no toggle off).
  // Deselect by clicking another node, a segment, or empty space (deselectAll).
  const selectNode = useCallback((index: number | null) => {
    setState(prev => {
      if (prev.selectedNodeIndex === index) {
        return prev; // keep selected — drag initiated via mousedown
      }
      return {
        ...prev,
        selectedNodeIndex: index,
        selectedSegmentIndex: null,
        draggingNodeIndex: null,
        isDragging: false,
      };
    });
  }, []);

  const selectSegment = useCallback((index: number | null) => {
    setState(prev => ({
      ...prev,
      selectedSegmentIndex: prev.selectedSegmentIndex === index ? null : index,
      selectedNodeIndex: null,
      draggingNodeIndex: null,
      isDragging: false,
    }));
  }, []);

  const startDrag = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      draggingNodeIndex: index,
      isDragging: true,
      selectedNodeIndex: index,
    }));
  }, []);

  const endDrag = useCallback(() => {
    setState(prev => ({
      ...prev,
      draggingNodeIndex: null,
      isDragging: false,
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedNodeIndex: null,
      selectedSegmentIndex: null,
      draggingNodeIndex: null,
      isDragging: false,
    }));
  }, []);

  return (
    <ViewSyncContext.Provider value={{
      state, hoverNode, hoverSegment, selectNode, selectSegment,
      startDrag, endDrag, deselectAll,
    }}>
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
