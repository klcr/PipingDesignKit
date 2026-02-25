/**
 * 材質解決 — 材質 ID → PipeMaterial
 *
 * surface-roughness.json から材質を検索し、
 * PipeMaterial ドメイン型に変換する。
 */

import { PipeMaterial } from '@domain/types';
import { roughnessData } from './dataLoader';

/**
 * 利用可能な材質一覧を返す（UI ドロップダウン用）
 */
export function getAvailableMaterials(): readonly { id: string; name: string; roughness_mm: number }[] {
  return roughnessData.materials.map(m => ({
    id: m.id,
    name: m.name,
    roughness_mm: m.roughness_mm,
  }));
}

/**
 * 材質 ID → PipeMaterial 解決
 */
export function resolveMaterial(materialId: string): PipeMaterial | null {
  const mat = roughnessData.materials.find(m => m.id === materialId);
  if (!mat) return null;
  return {
    id: mat.id,
    name: mat.name,
    roughness_mm: mat.roughness_mm,
    reference: { source: 'Crane TP-410' },
  };
}
