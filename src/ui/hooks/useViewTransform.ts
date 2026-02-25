/**
 * ビュー変換フック (ズーム/パン)
 *
 * 各ビューが独立して持つズーム・パン状態を管理する。
 * ホイールズーム（カーソル中心）と背景ドラッグパンを提供。
 */

import { useState, useCallback, useRef } from 'react';
import { ViewTransform } from '../views/PipeViewRenderer';
import { clientToSvgPoint } from './useSvgCoordinates';

const DEFAULT_TRANSFORM: ViewTransform = { panX: 0, panY: 0, zoom: 1.0 };
const ZOOM_FACTOR = 1.15;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export function useViewTransform() {
  const [transform, setTransform] = useState<ViewTransform>(DEFAULT_TRANSFORM);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const isPanningRef = useRef(false);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>, svgEl: SVGSVGElement | null) => {
    e.preventDefault();
    if (!svgEl) return;

    const svgPt = clientToSvgPoint(svgEl, e.clientX, e.clientY);
    if (!svgPt) return;

    setTransform(prev => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * factor));
      const zoomRatio = newZoom / prev.zoom;

      // Zoom centered on cursor: adjust pan so cursor stays at same world position
      const newPanX = svgPt.x - (svgPt.x - prev.panX) / zoomRatio;
      const newPanY = svgPt.y - (svgPt.y - prev.panY) / zoomRatio;

      return { panX: newPanX, panY: newPanY, zoom: newZoom };
    });
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: transform.panX,
      panY: transform.panY,
    };
  }, [transform.panX, transform.panY]);

  const handlePanMove = useCallback((e: React.MouseEvent, svgEl: SVGSVGElement | null) => {
    if (!isPanningRef.current || !panStartRef.current || !svgEl) return;

    const rect = svgEl.getBoundingClientRect();
    const viewBox = svgEl.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    const dx = (e.clientX - panStartRef.current.clientX) * scaleX;
    const dy = (e.clientY - panStartRef.current.clientY) * scaleY;

    setTransform({
      panX: panStartRef.current.panX + dx,
      panY: panStartRef.current.panY + dy,
      zoom: transform.zoom,
    });
  }, [transform.zoom]);

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
    panStartRef.current = null;
  }, []);

  const resetTransform = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM);
  }, []);

  return {
    transform,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetTransform,
    isPanning: isPanningRef,
  };
}
