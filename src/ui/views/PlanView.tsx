/**
 * 平面図 (Plan View) — X-Y 投影
 *
 * 配管ルートを上面から見た 2D SVG 表示。
 * Z 座標（高さ）は無視される。
 */

import { useMemo } from 'react';
import { useTranslation } from '../i18n/context';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { projectPlan, calcBoundingBox, calcViewBox, Point2D } from './PipeViewRenderer';
import { useViewSync } from './ViewSyncContext';

interface PlanViewProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
}

const PADDING = 2; // viewBox padding (m)
const PIPE_STROKE = 0.15; // pipe line width in world units
const NODE_RADIUS = 0.3; // node marker radius
const FONT_SIZE = 0.5; // label font size
const DIM_FONT_SIZE = 0.4; // dimension label font size

const COLOR_PIPE = '#336699';
const COLOR_PIPE_HOVER = '#ff8800';
const COLOR_PIPE_SELECTED = '#cc3300';
const COLOR_NODE = '#336699';
const COLOR_NODE_HOVER = '#ff8800';
const COLOR_NODE_SELECTED = '#cc3300';
const COLOR_ELBOW = '#996633';
const COLOR_DIM = '#888888';

export function PlanView({ nodes, analysis }: PlanViewProps) {
  const { t } = useTranslation();
  const { state, hoverNode, hoverSegment, selectNode, selectSegment } = useViewSync();

  const projected = useMemo(
    () => nodes.map(n => projectPlan(n.position)),
    [nodes]
  );

  const viewBox = useMemo(() => {
    if (projected.length === 0) return '0 0 10 10';
    const bbox = calcBoundingBox(projected);
    return calcViewBox(bbox, PADDING);
  }, [projected]);

  if (nodes.length < 2) return null;

  return (
    <svg viewBox={viewBox} style={{ width: '100%', height: '100%', background: '#fafafa' }}>
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
              onMouseEnter={() => hoverSegment(i)}
              onMouseLeave={() => hoverSegment(null)}
              onClick={() => selectSegment(i)}
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
        const color = isSelected ? COLOR_NODE_SELECTED : isHovered ? COLOR_NODE_HOVER : COLOR_NODE;
        const radius = isSelected ? NODE_RADIUS * 1.5 : isHovered ? NODE_RADIUS * 1.3 : NODE_RADIUS;

        return (
          <g key={`node-${i}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => hoverNode(i)}
            onMouseLeave={() => hoverNode(null)}
            onClick={() => selectNode(i)}
          >
            <circle
              cx={pos.x} cy={pos.y} r={radius}
              fill="white" stroke={color} strokeWidth={PIPE_STROKE * 0.8}
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
}

function DimensionLabel({ from, to, length }: { from: Point2D; to: Point2D; length: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Offset label perpendicular to segment direction
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
