/**
 * 平面図 (Plan View) — X-Y 投影
 *
 * 配管ルートを上面から見た 2D SVG 表示。
 * Z 座標（高さ）は無視される。
 * 選択済みノードのドラッグ移動に対応（Shift で軸拘束）。
 */

import { useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from '../i18n/context';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { projectPlan, inversePlan, calcBoundingBox, calcViewBox, applyTransform, Point2D } from './PipeViewRenderer';
import { useViewSync } from './ViewSyncContext';
import { useViewTransform } from '../hooks/useViewTransform';
import { clientToSvgPoint } from '../hooks/useSvgCoordinates';
import {
  PADDING, PIPE_STROKE, NODE_RADIUS, FONT_SIZE, DIM_FONT_SIZE,
  COLOR_PIPE, COLOR_PIPE_HOVER, COLOR_PIPE_SELECTED,
  COLOR_NODE, COLOR_NODE_HOVER, COLOR_NODE_SELECTED,
  COLOR_ELBOW, COLOR_DIM,
} from './viewConstants';

export interface ViewHandle {
  resetTransform: () => void;
}

interface PlanViewProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
  onNodeDrag?: (index: number, x: number, y: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const DRAG_THRESHOLD = 3; // pixels
const COLOR_NODE_DRAGGING = '#cc3300';

export const PlanView = forwardRef<ViewHandle, PlanViewProps>(
  function PlanView({ nodes, analysis, onNodeDrag, onDragStart, onDragEnd }, ref) {
  const { t } = useTranslation();
  const { state, hoverNode, hoverSegment, selectNode, selectSegment, startDrag, endDrag, deselectAll } = useViewSync();
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, handlePanStart, handlePanMove, handlePanEnd, resetTransform } = useViewTransform(svgRef);
  const dragRef = useRef<{
    index: number;
    startClientX: number;
    startClientY: number;
    started: boolean;
    startWorldX: number;
    startWorldY: number;
  } | null>(null);

  useImperativeHandle(ref, () => ({ resetTransform }), [resetTransform]);

  const projected = useMemo(
    () => nodes.map(n => projectPlan(n.position)),
    [nodes]
  );

  const baseViewBox = useMemo(() => {
    if (projected.length === 0) return '0 0 10 10';
    const bbox = calcBoundingBox(projected);
    return calcViewBox(bbox, PADDING);
  }, [projected]);

  const viewBox = useMemo(
    () => applyTransform(baseViewBox, transform),
    [baseViewBox, transform]
  );

  // ── Node drag handlers (Plan View only) ──

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, i: number) => {
    if (state.selectedNodeIndex !== i) return;
    if (!onNodeDrag) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      index: i,
      startClientX: e.clientX,
      startClientY: e.clientY,
      started: false,
      startWorldX: nodes[i].position.x,
      startWorldY: nodes[i].position.y,
    };
  }, [state.selectedNodeIndex, onNodeDrag, nodes]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Node drag
    if (dragRef.current && svgRef.current && onNodeDrag) {
      const dx = e.clientX - dragRef.current.startClientX;
      const dy = e.clientY - dragRef.current.startClientY;

      if (!dragRef.current.started) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        dragRef.current.started = true;
        startDrag(dragRef.current.index);
        onDragStart?.();
      }

      const svgPt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
      if (!svgPt) return;
      const world = inversePlan(svgPt);

      let newX = Math.round(world.x * 10) / 10;
      let newY = Math.round(world.y * 10) / 10;

      // Shift key: axis constraint
      if (e.shiftKey) {
        const diffX = Math.abs(newX - dragRef.current.startWorldX);
        const diffY = Math.abs(newY - dragRef.current.startWorldY);
        if (diffX >= diffY) {
          newY = dragRef.current.startWorldY;
        } else {
          newX = dragRef.current.startWorldX;
        }
      }

      onNodeDrag(dragRef.current.index, newX, newY);
      return;
    }

    // Pan
    handlePanMove(e, svgRef.current);
  }, [onNodeDrag, startDrag, onDragStart, handlePanMove]);

  const handleSvgMouseUp = useCallback(() => {
    if (dragRef.current?.started) {
      endDrag();
      onDragEnd?.();
    }
    dragRef.current = null;
    handlePanEnd();
  }, [endDrag, onDragEnd, handlePanEnd]);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      deselectAll();
      handlePanStart(e);
    }
  }, [deselectAll, handlePanStart]);

  if (nodes.length < 2) return null;

  const isDragging = state.isDragging;
  const cursorStyle = isDragging ? 'grabbing' : 'default';

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      style={{ width: '100%', height: '100%', background: '#fafafa', cursor: cursorStyle }}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
      onMouseLeave={handleSvgMouseUp}
    >
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
              style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
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
        const color = isBeingDragged ? COLOR_NODE_DRAGGING
          : isSelected ? COLOR_NODE_SELECTED
          : isHovered ? COLOR_NODE_HOVER
          : COLOR_NODE;
        const radius = isBeingDragged ? NODE_RADIUS * 1.6
          : isSelected ? NODE_RADIUS * 1.5
          : isHovered ? NODE_RADIUS * 1.3
          : NODE_RADIUS;

        return (
          <g key={`node-${i}`}
            style={{ cursor: isSelected && onNodeDrag ? 'grab' : isDragging ? 'grabbing' : 'pointer' }}
            onMouseEnter={() => !isDragging && hoverNode(i)}
            onMouseLeave={() => !isDragging && hoverNode(null)}
            onClick={(e) => {
              if (!isDragging) {
                e.stopPropagation();
                selectNode(i);
              }
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, i)}
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
