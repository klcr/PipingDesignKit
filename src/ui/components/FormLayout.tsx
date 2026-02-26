/**
 * 共通フォームレイアウトコンポーネント
 *
 * Section, Field, ResultRow を一元化。
 * PipeLossCalculator / MultiSegmentCalculator / RouteEditor で共通利用。
 */

import type React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';

/** セクション — 枠線付きグループ */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '1em', color: '#333' }}>{title}</h3>
      {children}
    </div>
  );
}

/** フィールド — ラベル + 入力のレスポンシブレイアウト */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? '2px' : '8px',
      marginBottom: '6px',
    }}>
      <label style={{ width: isMobile ? 'auto' : '120px', fontSize: '0.9em', color: '#555' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

/** 結果行 — ラベル・値・サブテキストの水平レイアウト */
export function ResultRow({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
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

/** 共通入力スタイル */
export const inputStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '0.9em',
};

/** 共通小ボタンスタイル */
export const smallBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '0.8em',
};
