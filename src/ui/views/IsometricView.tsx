/**
 * アイソメ図 (Isometric View) — 30° 等角投影
 *
 * 配管ルートの 3D 空間を等角投影で表示する SVG コンポーネント。
 * 原点に X, Y, Z 軸ガイドを表示して空間認識を補助。
 */

import { useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from '../i18n/context';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { projectIsometric, calcBoundingBox, calcViewBox, applyTransform, Point2D } from './PipeViewRenderer';
import { useViewSync } from './ViewSyncContext';
import { useViewTransform } from '../hooks/useViewTransform';
import { ViewHandle } from './PlanView';
import {
  PADDING, PIPE_STROKE, NODE_RADIUS, FONT_SIZE, DIM_FONT_SIZE,
  COLOR_PIPE, COLOR_PIPE_HOVER, COLOR_PIPE_SELECTED,
  COLOR_NODE, COLOR_NODE_HOVER, COLOR_NODE_SELECTED,
  COLOR_ELBOW, COLOR_DIM,
} from './viewConstants';

interface IsometricViewProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
}

const AXIS_LENGTH = 2;
const COLOR_AXIS_X = '#cc4444';
const COLOR_AXIS_Y = '#44aa44';
const COLOR_AXIS_Z = '#4444cc';

export const IsometricView = forwardRef<ViewHandle, IsometricViewProps>(
  function IsometricView({ nodes, analysis }, ref) {
  const { t } = useTranslation();
  const { state, hoverNode, hoverSegment, selectNode, selectSegment, deselectAll } = useViewSync();
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, handlePanStart, handlePanMove, handlePanEnd, resetTransform } = useViewTransform(svgRef);

  useImperativeHandle(ref, () => ({ resetTransform }), [resetTransform]);

  const projected = useMemo(
    () => nodes.map(n => projectIsometric(n.position)),
    [nodes]
  );

  const baseViewBox = useMemo(() => {
    if (projected.length === 0) return '0 0 10 10';
    const origin = projectIsometric({ x: 0, y: 0, z: 0 });
    const axisX = projectIsometric({ x: AXIS_LENGTH, y: 0, z: 0 });
    const axisY = projectIsometric({ x: 0, y: AXIS_LENGTH, z: 0 });
    const axisZ = projectIsometric({ x: 0, y: 0, z: AXIS_LENGTH });
    const allPoints = [...projected, origin, axisX, axisY, axisZ];
    const bbox = calcBoundingBox(allPoints);
    return calcViewBox(bbox, PADDING);
  }, [projected]);

  const viewBox = useMemo(
    () => applyTransform(baseViewBox, transform),
    [baseViewBox, transform]
  );

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      deselectAll();
      handlePanStart(e);
    }
  }, [deselectAll, handlePanStart]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handlePanMove(e, svgRef.current);
  }, [handlePanMove]);

  if (nodes.length < 2) return null;

  // Axis guide endpoints
  const origin = projectIsometric({ x: 0, y: 0, z: 0 });
  const axisX = projectIsometric({ x: AXIS_LENGTH, y: 0, z: 0 });
  const axisY = projectIsometric({ x: 0, y: AXIS_LENGTH, z: 0 });
  const axisZ = projectIsometric({ x: 0, y: 0, z: AXIS_LENGTH });
  const isDragging = state.isDragging;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      style={{ width: '100%', height: '100%', background: '#fafafa' }}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
    >
      {/* Axis guides */}
      <g opacity={0.5}>
        <line x1={origin.x} y1={origin.y} x2={axisX.x} y2={axisX.y}
          stroke={COLOR_AXIS_X} strokeWidth={PIPE_STROKE * 0.6} />
        <text x={axisX.x + 0.2} y={axisX.y}
          fontSize={DIM_FONT_SIZE} fill={COLOR_AXIS_X} style={{ pointerEvents: 'none' }}>X</text>

        <line x1={origin.x} y1={origin.y} x2={axisY.x} y2={axisY.y}
          stroke={COLOR_AXIS_Y} strokeWidth={PIPE_STROKE * 0.6} />
        <text x={axisY.x - 0.4} y={axisY.y}
          fontSize={DIM_FONT_SIZE} fill={COLOR_AXIS_Y} style={{ pointerEvents: 'none' }}>Y</text>

        <line x1={origin.x} y1={origin.y} x2={axisZ.x} y2={axisZ.y}
          stroke={COLOR_AXIS_Z} strokeWidth={PIPE_STROKE * 0.6} />
        <text x={axisZ.x + 0.2} y={axisZ.y}
          fontSize={DIM_FONT_SIZE} fill={COLOR_AXIS_Z} style={{ pointerEvents: 'none' }}>Z</text>
      </g>

      {/* Pipe segments */}
      {analysis.straightRuns.map((run, i) => {
        const from = projected[run.fromNodeIndex];
        const to = projected[run.toNodeIndex];
        const isHovered = state.hoveredSegmentIndex === i;
        const isSelected = state.selectedSegmentIndex === i;
        const color = isSelected ? COLOR_PIPE_SELECTED : isHovered ? COLOR_PIPE_HOVER : COLOR_PIPE;
        const strokeWidth = isSelected ? PIPE_STROKE * 2.5 : isHovered ? PIPE_STROKE * 1.8 : PIPE_STROKE;

        return (
          <g key={`seg-${i}`}>
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => !isDragging && hoverSegment(i)}
              onMouseLeave={() => !isDragging && hoverSegment(null)}
              onClick={(e) => { if (!isDragging) { e.stopPropagation(); selectSegment(i); } }}
            />
            <DimensionLabel from={from} to={to} length={run.length_m} />
          </g>
        );
      })}

      {/* Elbow markers */}
      {analysis.detectedElbows.map((elbow, i) => {
        const pos = projected[elbow.nodeIndex];
        return (
          <text
            key={`elbow-${i}`}
            x={pos.x}
            y={pos.y - NODE_RADIUS - 0.2}
            textAnchor="middle"
            fontSize={DIM_FONT_SIZE}
            fill={COLOR_ELBOW}
          >
            {elbow.standardAngle}&deg;
          </text>
        );
      })}

      {/* Node markers */}
      {projected.map((pos, i) => {
        const isHovered = state.hoveredNodeIndex === i;
        const isSelected = state.selectedNodeIndex === i;
        const isBeingDragged = state.draggingNodeIndex === i;
        const color = isSelected ? COLOR_NODE_SELECTED : isHovered ? COLOR_NODE_HOVER : COLOR_NODE;
        const radius = isSelected ? NODE_RADIUS * 1.5 : isHovered ? NODE_RADIUS * 1.3 : NODE_RADIUS;

        return (
          <g key={`node-${i}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => !isDragging && hoverNode(i)}
            onMouseLeave={() => !isDragging && hoverNode(null)}
            onClick={(e) => { if (!isDragging) { e.stopPropagation(); selectNode(i); } }}
          >
            <circle
              cx={pos.x} cy={pos.y} r={radius}
              fill="white" stroke={color} strokeWidth={PIPE_STROKE * 0.8}
              strokeDasharray={isBeingDragged ? `${PIPE_STROKE * 2} ${PIPE_STROKE}` : undefined}
            />
            <text
              x={pos.x} y={pos.y + FONT_SIZE * 0.35}
              textAnchor="middle"
              fontSize={FONT_SIZE}
              fill={color}
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {t('view.node_label')}{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

function DimensionLabel({ from, to, length }: { from: Point2D; to: Point2D; length: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return null;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = 0.5;

  return (
    <text
      x={mx + nx * offset}
      y={my + ny * offset}
      textAnchor="middle"
      fontSize={DIM_FONT_SIZE}
      fill={COLOR_DIM}
      style={{ pointerEvents: 'none' }}
    >
      {length.toFixed(1)}m
    </text>
  );
}
