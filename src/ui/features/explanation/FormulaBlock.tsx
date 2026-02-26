/**
 * FormulaBlock — KaTeX式表示 + 変数解説テーブルの共通コンポーネント
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface VariableEntry {
  symbol: string;       // KaTeX記号 (e.g. "\\rho")
  name: string;         // 名称 (i18n)
  value: string;        // 値+単位
  description: string;  // 物理的意義
}

export interface FormulaBlockProps {
  /** ステップ番号 */
  step: number;
  /** セクションタイトル */
  title: string;
  /** セクション説明文 */
  description: string;
  /** 記号式 (KaTeX文字列) — 複数可 */
  symbolicTeX: string | string[];
  /** 値代入式 (KaTeX文字列) — 複数可 */
  substitutedTeX: string | string[];
  /** 計算結果テキスト */
  result?: string;
  /** 追加メモ (流動状態判定など) */
  note?: string;
  /** 変数解説テーブル */
  variables: VariableEntry[];
  /** 出典 */
  reference?: string;
  /** 初期状態で開いているか */
  defaultOpen?: boolean;
}

function renderTeX(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false });
  } catch {
    return tex;
  }
}

function TeXBlock({ tex, display }: { tex: string; display?: boolean }) {
  const html = renderTeX(tex, display ?? true);
  return (
    <div
      style={{ overflowX: 'auto', padding: '4px 0' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TeXInline({ tex }: { tex: string }) {
  const html = renderTeX(tex, false);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '16px',
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  overflow: 'hidden',
};

const summaryStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: '#f6f8fa',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '1em',
  color: '#1a1a1a',
  listStyle: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const bodyStyle: React.CSSProperties = {
  padding: '16px',
};

const formulaBoxStyle: React.CSSProperties = {
  background: '#fafbfc',
  border: '1px solid #e1e4e8',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '12px',
  overflowX: 'auto',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75em',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
};

const resultStyle: React.CSSProperties = {
  fontSize: '1.1em',
  fontWeight: 'bold',
  color: '#0066cc',
  padding: '8px 0',
};

const noteStyle: React.CSSProperties = {
  background: '#e8f4fd',
  border: '1px solid #b3d9f2',
  borderRadius: '4px',
  padding: '8px 12px',
  fontSize: '0.9em',
  marginBottom: '12px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.85em',
  marginBottom: '12px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '2px solid #d0d7de',
  background: '#f6f8fa',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
};

const refStyle: React.CSSProperties = {
  fontSize: '0.8em',
  color: '#666',
  borderTop: '1px solid #eee',
  paddingTop: '8px',
  marginTop: '4px',
};

export function FormulaBlock({
  step,
  title,
  description,
  symbolicTeX,
  substitutedTeX,
  result,
  note,
  variables,
  reference,
  defaultOpen = true,
}: FormulaBlockProps) {
  const symbolics = Array.isArray(symbolicTeX) ? symbolicTeX : [symbolicTeX];
  const substituteds = Array.isArray(substitutedTeX) ? substitutedTeX : [substitutedTeX];

  return (
    <details open={defaultOpen || undefined} style={sectionStyle}>
      <summary style={summaryStyle}>
        <span style={{
          background: '#0066cc', color: '#fff', borderRadius: '50%',
          width: '24px', height: '24px', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '0.8em',
          flexShrink: 0,
        }}>
          {step}
        </span>
        {title}
      </summary>

      <div style={bodyStyle}>
        {/* 説明文 */}
        <p style={{ margin: '0 0 12px', color: '#444', fontSize: '0.9em', lineHeight: 1.6 }}>
          {description}
        </p>

        {/* 一般式 */}
        <div style={formulaBoxStyle}>
          <div style={labelStyle}>Formula</div>
          {symbolics.map((tex, i) => (
            <TeXBlock key={i} tex={tex} />
          ))}
        </div>

        {/* 代入式 */}
        <div style={{ ...formulaBoxStyle, background: '#fffcf0', borderColor: '#e8dca8' }}>
          <div style={{ ...labelStyle, color: '#996600' }}>Substitution</div>
          {substituteds.map((tex, i) => (
            <TeXBlock key={i} tex={tex} />
          ))}
          {result && <div style={resultStyle}>{result}</div>}
        </div>

        {/* 追加メモ */}
        {note && <div style={noteStyle}>{note}</div>}

        {/* 変数解説テーブル */}
        {variables.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Symbol</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v, i) => (
                <tr key={i}>
                  <td style={tdStyle}><TeXInline tex={v.symbol} /></td>
                  <td style={tdStyle}>{v.name}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{v.value}</td>
                  <td style={tdStyle}>{v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 出典 */}
        {reference && (
          <div style={refStyle}>
            Reference: {reference}
          </div>
        )}
      </div>
    </details>
  );
}
