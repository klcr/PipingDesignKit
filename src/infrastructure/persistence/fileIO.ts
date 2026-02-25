/**
 * ファイル import/export ユーティリティ
 *
 * ブラウザ上での JSON ファイルダウンロード（export）と
 * ファイル選択→読み込み（import）を提供する。
 */

import {
  ProjectFile,
  PROJECT_FILE_VERSION,
  ProjectType,
  SingleSegmentProjectData,
  MultiSegmentProjectData,
  RouteProjectData,
  serializeProjectFile,
  parseProjectFile,
} from './projectFile';

// ── Export (download) ──

/**
 * プロジェクトファイルを JSON としてダウンロードする。
 */
export function downloadProjectFile(project: ProjectFile): void {
  const json = serializeProjectFile(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(project.name) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ファイル名に使えない文字を除去し、安全なファイル名を返す。
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'project';
}

// ── Import (file read) ──

/**
 * ファイル選択ダイアログを開き、選択された JSON ファイルを
 * パース・バリデーションして ProjectFile を返す。
 *
 * ユーザーがキャンセルした場合は null を返す。
 */
export function openProjectFile(): Promise<ProjectFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const project = parseProjectFile(text);
          resolve(project);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

    // ユーザーがキャンセルした場合の検出
    // focus が戻った後もファイルが選択されていなければ null
    input.addEventListener('cancel', () => resolve(null));

    input.click();
  });
}

// ── ヘルパー: ProjectFile 生成 ──

/**
 * 単セグメントの状態から ProjectFile を生成する。
 */
export function createSingleSegmentProject(
  name: string,
  data: SingleSegmentProjectData,
): ProjectFile {
  const now = new Date().toISOString();
  return {
    version: PROJECT_FILE_VERSION,
    type: 'single' as ProjectType,
    name,
    createdAt: now,
    updatedAt: now,
    data,
  };
}

/**
 * マルチセグメントの状態から ProjectFile を生成する。
 */
export function createMultiSegmentProject(
  name: string,
  data: MultiSegmentProjectData,
): ProjectFile {
  const now = new Date().toISOString();
  return {
    version: PROJECT_FILE_VERSION,
    type: 'multi' as ProjectType,
    name,
    createdAt: now,
    updatedAt: now,
    data,
  };
}

/**
 * ルートの状態から ProjectFile を生成する。
 */
export function createRouteProject(
  name: string,
  data: RouteProjectData,
): ProjectFile {
  const now = new Date().toISOString();
  return {
    version: PROJECT_FILE_VERSION,
    type: 'route' as ProjectType,
    name,
    createdAt: now,
    updatedAt: now,
    data,
  };
}
