/**
 * Undo/Redo 対応ノード状態管理フック
 *
 * スナップショット方式で最大30手の Undo/Redo を実装。
 * ドラッグ操作中はバッチモードで中間更新を履歴に積まず、
 * ドラッグ完了時に1操作として記録する。
 */

import { useReducer, useCallback } from 'react';

const MAX_HISTORY = 30;

interface UndoableState<T> {
  past: T[];
  present: T;
  future: T[];
  isBatching: boolean;
  batchStart: T | null;
}

type Action<T> =
  | { type: 'SET'; payload: T | ((prev: T) => T) }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; payload: T }
  | { type: 'BEGIN_BATCH' }
  | { type: 'COMMIT_BATCH' };

function undoableReducer<T>(state: UndoableState<T>, action: Action<T>): UndoableState<T> {
  switch (action.type) {
    case 'SET': {
      const next = typeof action.payload === 'function'
        ? (action.payload as (prev: T) => T)(state.present)
        : action.payload;
      if (state.isBatching) {
        // During batch (drag), update present without pushing to history
        return { ...state, present: next };
      }
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: [],
        isBatching: false,
        batchStart: null,
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
        isBatching: false,
        batchStart: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: state.future.slice(1),
        isBatching: false,
        batchStart: null,
      };
    }
    case 'RESET':
      return {
        past: [],
        present: action.payload,
        future: [],
        isBatching: false,
        batchStart: null,
      };
    case 'BEGIN_BATCH':
      return {
        ...state,
        isBatching: true,
        batchStart: state.present,
      };
    case 'COMMIT_BATCH': {
      if (!state.isBatching || state.batchStart === null) {
        return { ...state, isBatching: false, batchStart: null };
      }
      return {
        past: [...state.past, state.batchStart].slice(-MAX_HISTORY),
        present: state.present,
        future: [],
        isBatching: false,
        batchStart: null,
      };
    }
  }
}

export function useUndoableNodes<T>(initialValue: T) {
  const [state, dispatch] = useReducer(undoableReducer<T>, {
    past: [],
    present: initialValue,
    future: [],
    isBatching: false,
    batchStart: null,
  });

  const setNodes = useCallback((payload: T | ((prev: T) => T)) => {
    dispatch({ type: 'SET', payload });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const resetHistory = useCallback((value: T) => {
    dispatch({ type: 'RESET', payload: value });
  }, []);

  const beginBatch = useCallback(() => dispatch({ type: 'BEGIN_BATCH' }), []);
  const commitBatch = useCallback(() => dispatch({ type: 'COMMIT_BATCH' }), []);

  return {
    nodes: state.present,
    setNodes,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    hasChanges: state.past.length > 0 || state.isBatching,
    beginBatch,
    commitBatch,
    resetHistory,
  };
}
