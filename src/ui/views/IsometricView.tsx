/**
 * アイソメ図 (Isometric View) — 30° 等角投影
 *
 * 配管ルートの 3D 空間を等角投影で表示する SVG コンポーネント。
 * 原点に X, Y, Z 軸ガイドを表示して空間認識を補助。
 */

import { useMemo } from 'react';
import { useTranslation } from '../i18n/context';
import { RouteNode, RouteAnalysis } from '@domain/route/types';
import { projectIsometric, calcBoundingBox, calcViewBox, Point2D } from './PipeViewRenderer';
import { useViewSync } from './ViewSyncContext';

interface IsometricViewProps {
  nodes: readonly RouteNode[];
  analysis: RouteAnalysis;
}

const PADDING = 2;
const PIPE_STROKE = 0.15;
const NODE_RADIUS = 0.3;
const FONT_SIZE = 0.5;
const DIM_FONT_SIZE = 0.4;
const AXIS_LENGTH = 2;

const COLOR_PIPE = '#336699';
const COLOR_PIPE_HOVER = '#ff8800';
const COLOR_PIPE_SELECTED = '#cc3300';
const COLOR_NODE = '#336699';
const COLOR_NODE_HOVER = '#ff8800';
const COLOR_NODE_SELECTED = '#cc3300';
const COLOR_ELBOW = '#996633';
const COLOR_DIM = '#888888';
const COLOR_AXIS_X = '#cc4444';
const COLOR_AXIS_Y = '#44aa44';
const COLOR_AXIS_Z = '#4444cc';

export function IsometricView({ nodes, analysis }: IsometricViewProps) {
  const { t } = useTranslation();
  const { state, hoverNode, hoverSegment, selectNode, selectSegment } = useViewSync();

  const projected = useMemo(
    () => nodes.map(n => projectIsometric(n.position)),
    [nodes]
  );

  const viewBox = useMemo(() => {
    if (projected.length === 0) return '0 0 10 10';
    // Include origin axis guides in bounding box
    const origin = projectIsometric({ x: 0, y: 0, z: 0 });
    const axisX = projectIsometric({ x: AXIS_LENGTH, y: 0, z: 0 });
    const axisY = projectIsometric({ x: 0, y: AXIS_LENGTH, z: 0 });
    const axisZ = projectIsometric({ x: 0, y: 0, z: AXIS_LENGTH });
    const allPoints = [...projected, origin, axisX, axisY, axisZ];
    const bbox = calcBoundingBox(allPoints);
    return calcViewBox(bbox, PADDING);
  }, [projected]);

  if (nodes.length < 2) return null;

  // Axis guide endpoints
  const origin = projectIsometric({ x: 0, y: 0, z: 0 });
  const axisX = projectIsometric({ x: AXIS_LENGTH, y: 0, z: 0 });
  const axisY = projectIsometric({ x: 0, y: AXIS_LENGTH, z: 0 });
  const axisZ = projectIsometric({ x: 0, y: 0, z: AXIS_LENGTH });

  return (
    <svg viewBox={viewBox} style={{ width: '100%', height: '100%', background: '#fafafa' }}>
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
