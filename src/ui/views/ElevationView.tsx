/**
 * 立面図 (Elevation View) — X-Z 投影
 *
 * 配管ルートを正面から見た 2D SVG 表示。
 * X 軸: 水平位置、Z 軸: 高さ方向。Y 座標は無視される。
 * Z=0 の地盤線を点線で表示。
 * 選択済みノードのドラッグ移動に対応（Shift で軸拘束）。
 * 選択済みセグメントの平行移動に対応。
 */

import { useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from '../i18n/context';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { projectElevation, inverseElevation, calcBoundingBox, calcViewBox, applyTransform, Point2D } from './PipeViewRenderer';
import { useViewSync } from './ViewSyncContext';
import { useViewTransform } from '../hooks/useViewTransform';
import { clientToSvgPoint } from '../hooks/useSvgCoordinates';
import { ViewHandle } from './PlanView';
import {
  PADDING, PIPE_STROKE, NODE_RADIUS, FONT_SIZE, DIM_FONT_SIZE,
  COLOR_PIPE, COLOR_PIPE_HOVER, COLOR_PIPE_SELECTED,
  COLOR_NODE, COLOR_NODE_HOVER, COLOR_NODE_SELECTED,
  COLOR_ELBOW, COLOR_DIM,
} from './viewConstants';

interface ElevationViewProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
  onNodeDrag?: (index: number, x: number, z: number) => void;
  onSegmentDrag?: (segmentIndex: number, deltaX: number, deltaZ: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const DRAG_THRESHOLD = 3; // pixels
const COLOR_GROUND = '#aaaaaa';
const COLOR_NODE_DRAGGING = '#cc3300';
const COLOR_PIPE_DRAGGING = '#cc6600';

export const ElevationView = forwardRef<ViewHandle, ElevationViewProps>(
  function ElevationView({ nodes, analysis, onNodeDrag, onSegmentDrag, onDragStart, onDragEnd }, ref) {
  const { t } = useTranslation();
  const { state, hoverNode, hoverSegment, selectNode, selectSegment, startDrag, endDrag, startSegmentDrag, endSegmentDrag, deselectAll } = useViewSync();
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, handlePanStart, handlePanMove, handlePanEnd, resetTransform } = useViewTransform(svgRef);
  const dragRef = useRef<{
    index: number;
    startClientX: number;
    startClientY: number;
    started: boolean;
    startWorldX: number;
    startWorldZ: number;
  } | null>(null);
  const segDragRef = useRef<{
    segmentIndex: number;
    startClientX: number;
    startClientY: number;
    started: boolean;
    lastWorldX: number;
    lastWorldZ: number;
  } | null>(null);

  useImperativeHandle(ref, () => ({ resetTransform }), [resetTransform]);

  const projected = useMemo(
    () => nodes.map(n => projectElevation(n.position)),
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

  const viewBoxParts = useMemo(() => viewBox.split(' ').map(Number), [viewBox]);

  // ── Node drag handlers ──

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
      startWorldZ: nodes[i].position.z,
    };
  }, [state.selectedNodeIndex, onNodeDrag, nodes]);

  // ── Segment drag handlers ──

  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, segIdx: number) => {
    if (state.selectedSegmentIndex !== segIdx) return;
    if (!onSegmentDrag) return;
    e.stopPropagation();
    e.preventDefault();

    const svgPt = svgRef.current ? clientToSvgPoint(svgRef.current, e.clientX, e.clientY) : null;
    if (!svgPt) return;
    const world = inverseElevation(svgPt);

    segDragRef.current = {
      segmentIndex: segIdx,
      startClientX: e.clientX,
      startClientY: e.clientY,
      started: false,
      lastWorldX: world.x,
      lastWorldZ: world.z,
    };
  }, [state.selectedSegmentIndex, onSegmentDrag]);

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
      const world = inverseElevation(svgPt);

      let newX = Math.round(world.x * 10) / 10;
      let newZ = Math.round(world.z * 10) / 10;

      // Shift key: axis constraint
      if (e.shiftKey) {
        const diffX = Math.abs(newX - dragRef.current.startWorldX);
        const diffZ = Math.abs(newZ - dragRef.current.startWorldZ);
        if (diffX >= diffZ) {
          newZ = dragRef.current.startWorldZ;
        } else {
          newX = dragRef.current.startWorldX;
        }
      }

      onNodeDrag(dragRef.current.index, newX, newZ);
      return;
    }

    // Segment drag
    if (segDragRef.current && svgRef.current && onSegmentDrag) {
      const dx = e.clientX - segDragRef.current.startClientX;
      const dy = e.clientY - segDragRef.current.startClientY;

      if (!segDragRef.current.started) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        segDragRef.current.started = true;
        startSegmentDrag(segDragRef.current.segmentIndex);
        onDragStart?.();
      }

      const svgPt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
      if (!svgPt) return;
      const world = inverseElevation(svgPt);

      const deltaX = Math.round((world.x - segDragRef.current.lastWorldX) * 10) / 10;
      const deltaZ = Math.round((world.z - segDragRef.current.lastWorldZ) * 10) / 10;

      if (deltaX !== 0 || deltaZ !== 0) {
        onSegmentDrag(segDragRef.current.segmentIndex, deltaX, deltaZ);
        segDragRef.current.lastWorldX += deltaX;
        segDragRef.current.lastWorldZ += deltaZ;
      }
      return;
    }

    // Pan
    handlePanMove(e, svgRef.current);
  }, [onNodeDrag, onSegmentDrag, startDrag, startSegmentDrag, onDragStart, handlePanMove]);

  const handleSvgMouseUp = useCallback(() => {
    if (dragRef.current?.started) {
      endDrag();
      onDragEnd?.();
    }
    if (segDragRef.current?.started) {
      endSegmentDrag();
      onDragEnd?.();
    }
    dragRef.current = null;
    segDragRef.current = null;
    handlePanEnd();
  }, [endDrag, endSegmentDrag, onDragEnd, handlePanEnd]);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      deselectAll();
      handlePanStart(e);
    }
  }, [deselectAll, handlePanStart]);

  if (nodes.length < 2) return null;

  // Ground line at Z=0 → projectElevation maps Z=0 to y=0
  const groundY = 0;
  const groundX1 = viewBoxParts[0];
  const groundX2 = viewBoxParts[0] + viewBoxParts[2];
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
      {/* Ground line (Z=0) */}
      <line
        x1={groundX1} y1={groundY}
        x2={groundX2} y2={groundY}
        stroke={COLOR_GROUND}
        strokeWidth={PIPE_STROKE * 0.5}
        strokeDasharray={`${PIPE_STROKE * 3} ${PIPE_STROKE * 2}`}
      />
      <text
        x={groundX2 - 0.3}
        y={groundY + DIM_FONT_SIZE + 0.1}
        textAnchor="end"
        fontSize={DIM_FONT_SIZE * 0.8}
        fill={COLOR_GROUND}
        style={{ pointerEvents: 'none' }}
      >
        {t('view.ground_line')}
      </text>

      {/* Pipe segments */}
      {analysis.straightRuns.map((run, i) => {
        const from = projected[run.fromNodeIndex];
        const to = projected[run.toNodeIndex];
        const isHovered = state.hoveredSegmentIndex === i;
        const isSelected = state.selectedSegmentIndex === i;
        const isBeingDragged = state.draggingSegmentIndex === i;
        const color = isBeingDragged ? COLOR_PIPE_DRAGGING
          : isSelected ? COLOR_PIPE_SELECTED
          : isHovered ? COLOR_PIPE_HOVER
          : COLOR_PIPE;
        const strokeWidth = isBeingDragged ? PIPE_STROKE * 2.8
          : isSelected ? PIPE_STROKE * 2.5
          : isHovered ? PIPE_STROKE * 1.8
          : PIPE_STROKE;

        return (
          <g key={`seg-${i}`}>
            <line
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={isBeingDragged ? `${PIPE_STROKE * 2} ${PIPE_STROKE}` : undefined}
              style={{ cursor: isSelected && onSegmentDrag ? 'grab' : isDragging ? 'grabbing' : 'pointer' }}
              onMouseEnter={() => !isDragging && hoverSegment(i)}
              onMouseLeave={() => !isDragging && hoverSegment(null)}
              onClick={(e) => { if (!isDragging) { e.stopPropagation(); selectSegment(i); } }}
              onMouseDown={(e) => handleSegmentMouseDown(e, i)}
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
            onClick={(e) => { if (!isDragging) { e.stopPropagation(); selectNode(i); } }}
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
