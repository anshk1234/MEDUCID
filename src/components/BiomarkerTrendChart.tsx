'use client';

import React, { useState } from 'react';

export interface TrendChartPoint {
  date: string;
  value: number;
  flag: 'NORMAL' | 'HIGH' | 'LOW';
}

interface BiomarkerTrendChartProps {
  name: string;
  unit: string;
  range: string;
  rangeLow?: number | null;
  rangeHigh?: number | null;
  points: TrendChartPoint[];
}

function parseBoundsFromRange(
  range: string,
  rangeLow?: number | null,
  rangeHigh?: number | null
): { low: number | null; high: number | null } {
  let low = typeof rangeLow === 'number' && Number.isFinite(rangeLow) ? rangeLow : null;
  let high = typeof rangeHigh === 'number' && Number.isFinite(rangeHigh) ? rangeHigh : null;

  if (low === null && high === null && range) {
    const intervalMatch = range.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
    if (intervalMatch) {
      low = Number(intervalMatch[1]);
      high = Number(intervalMatch[2]);
    } else {
      const upperMatch = range.match(/^[<≤]=?\s*(-?\d+(?:\.\d+)?)/);
      const lowerMatch = range.match(/^[>≥]=?\s*(-?\d+(?:\.\d+)?)/);
      if (upperMatch) high = Number(upperMatch[1]);
      if (lowerMatch) low = Number(lowerMatch[1]);
    }
  }

  return { low, high };
}

function formatTick(val: number): string {
  if (Math.abs(val) >= 100) return Math.round(val).toString();
  if (Number.isInteger(val)) return val.toString();
  return val.toFixed(1);
}

export function BiomarkerTrendChart({
  name,
  unit,
  range,
  rangeLow,
  rangeHigh,
  points,
}: BiomarkerTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points || points.length === 0) return null;

  const { low, high } = parseBoundsFromRange(range, rangeLow, rangeHigh);

  const allValues = points.map((p) => p.value);
  if (low !== null) allValues.push(low);
  if (high !== null) allValues.push(high);

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const span = rawMax - rawMin || Math.abs(rawMax) * 0.2 || 10;
  const yMin = rawMin - span * 0.22;
  const yMax = rawMax + span * 0.22;

  const width = 800;
  const height = 270;
  const padLeft = 58;
  const padRight = 96; // Dedicated right gutter for Upper/Lower limit pills (no dot overlap)
  const padTop = 30;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const innerXPad = points.length === 1 ? plotW / 2 : Math.min(44, plotW * 0.08);
  const usableW = plotW - innerXPad * 2;

  const toX = (idx: number) => {
    if (points.length === 1) return padLeft + plotW / 2;
    return padLeft + innerXPad + (idx / (points.length - 1)) * usableW;
  };

  const toY = (val: number) => {
    const ratio = (val - yMin) / (yMax - yMin);
    return padTop + plotH - ratio * plotH;
  };

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(' ');

  // 5 evenly spaced Y-axis ticks for higher precision
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = yMin + t * (yMax - yMin);
    return { val, y: toY(val), label: formatTick(val) };
  });

  const highY = high !== null ? toY(high) : null;
  const lowY = low !== null ? toY(low) : null;
  const plotRight = width - padRight;
  const plotBottom = height - padBottom;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="bg-cream border border-ink/15 rounded-xl p-4 sm:p-5 space-y-3 relative">
      {/* Header & Clear Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink font-bold">
            {name} Trajectory
          </span>
          {unit && (
            <span className="font-mono text-[10px] text-muted bg-[#eeede6] border border-[#d7d6cf] px-2 py-0.5 rounded">
              Unit: {unit}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
          {high !== null && (
            <span className="flex items-center gap-1.5 text-[#9f2e1c] font-bold">
              <span className="w-4 border-t-2 border-dashed border-[#d94832]" />
              Upper: {high}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[#3d5d04] font-bold">
            <span className="w-3 h-3 rounded-sm bg-[#e7f8b9] border border-[#6a8e0c]/40 inline-block" />
            Normal Zone
          </span>
          {low !== null && (
            <span className="flex items-center gap-1.5 text-[#0f6b63] font-bold">
              <span className="w-4 border-t-2 border-dashed border-[#15847a]" />
              Lower: {low}
            </span>
          )}
        </div>
      </div>

      {/* Hover Detail Strip */}
      <div className="min-h-[28px] flex items-center justify-between bg-[#eeede6]/70 border border-[#d7d6cf] rounded-lg px-3 py-1 text-xs font-mono">
        {hoveredPoint ? (
          <>
            <span className="text-ink font-bold">
              {hoveredPoint.date}: {hoveredPoint.value} {unit}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                hoveredPoint.flag === 'NORMAL'
                  ? 'bg-[#e7f8b9] text-[#3d5d04]'
                  : 'bg-[#ffe0d8] text-[#9f2e1c]'
              }`}
            >
              {hoveredPoint.flag === 'NORMAL'
                ? 'Within Reference Range'
                : hoveredPoint.flag === 'HIGH'
                ? 'Above Upper Limit'
                : 'Below Lower Limit'}
            </span>
          </>
        ) : (
          <span className="text-muted text-[11px]">
            Hover over any point to inspect exact measurement and reference status.
          </span>
        )}
      </div>

      {/* Responsive SVG Line Graph */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] select-none"
          role="img"
          aria-label={`${name} trajectory line chart`}
        >
          {/* Plot Background */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="#faf9f5"
            rx={6}
          />

          {/* Out-of-Range High Zone (subtle coral tint) */}
          {highY !== null && highY > padTop && (
            <rect
              x={padLeft}
              y={padTop}
              width={plotW}
              height={highY - padTop}
              fill="#ffe0d8"
              opacity={0.35}
            />
          )}

          {/* Out-of-Range Low Zone (subtle coral tint) */}
          {lowY !== null && lowY < plotBottom && (
            <rect
              x={padLeft}
              y={lowY}
              width={plotW}
              height={plotBottom - lowY}
              fill="#ffe0d8"
              opacity={0.35}
            />
          )}

          {/* Normal Reference Range Shaded Band */}
          {highY !== null && lowY !== null && (
            <rect
              x={padLeft}
              y={Math.min(highY, lowY)}
              width={plotW}
              height={Math.abs(lowY - highY)}
              fill="#e7f8b9"
              opacity={0.5}
            />
          )}

          {/* Horizontal Y-Axis Gridlines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={plotRight}
                y2={t.y}
                stroke="#e2e0d8"
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={t.y + 3.5}
                textAnchor="end"
                fontSize="10.5"
                fill="#737373"
                fontFamily="monospace"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Plot Border */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#d7d6cf"
            strokeWidth="1"
            rx={6}
          />

          {/* Upper Limit Dashed Line + Dedicated Right Gutter Pill */}
          {highY !== null && (
            <g>
              <line
                x1={padLeft}
                y1={highY}
                x2={plotRight}
                y2={highY}
                stroke="#d94832"
                strokeWidth="1.75"
                strokeDasharray="6 4"
              />
              <rect
                x={plotRight + 6}
                y={highY - 10}
                width={84}
                height={20}
                rx={5}
                fill="#ffe0d8"
                stroke="#d94832"
                strokeOpacity={0.45}
              />
              <text
                x={plotRight + 48}
                y={highY + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#9f2e1c"
                fontFamily="monospace"
              >
                Max {high}
              </text>
            </g>
          )}

          {/* Lower Limit Dashed Line + Dedicated Right Gutter Pill */}
          {lowY !== null && (
            <g>
              <line
                x1={padLeft}
                y1={lowY}
                x2={plotRight}
                y2={lowY}
                stroke="#15847a"
                strokeWidth="1.75"
                strokeDasharray="6 4"
              />
              <rect
                x={plotRight + 6}
                y={lowY - 10}
                width={84}
                height={20}
                rx={5}
                fill="#e2f5f3"
                stroke="#15847a"
                strokeOpacity={0.45}
              />
              <text
                x={plotRight + 48}
                y={lowY + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0f6b63"
                fontFamily="monospace"
              >
                Min {low}
              </text>
            </g>
          )}

          {/* Trajectory Line */}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#141414"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points & X-Axis Labels */}
          {points.map((pt, idx) => {
            const cx = toX(idx);
            const cy = toY(pt.value);
            const isNormal = pt.flag === 'NORMAL';
            const isHovered = hoveredIdx === idx;
            const labelAbove = cy - padTop > 22;

            return (
              <g
                key={`${pt.date}-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Invisible wider hit area for smooth hovering */}
                <circle cx={cx} cy={cy} r={18} fill="transparent" />

                {/* Hover vertical guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={plotBottom}
                    stroke="#141414"
                    strokeOpacity={0.25}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Outer highlight ring on hover */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill={isNormal ? '#b8f235' : '#ff593e'}
                    opacity={0.3}
                  />
                )}

                {/* Point Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 5.5}
                  fill={isNormal ? '#b8f235' : '#ff593e'}
                  stroke="#141414"
                  strokeWidth="2"
                />

                {/* Value Label with clean halo */}
                <text
                  x={cx}
                  y={labelAbove ? cy - 12 : cy + 20}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="800"
                  fill={isNormal ? '#141414' : '#9f2e1c'}
                  stroke="#faf9f5"
                  strokeWidth="4"
                  paintOrder="stroke"
                  fontFamily="monospace"
                >
                  {pt.value}
                </text>

                {/* X-Axis Tick & Date Label */}
                <line
                  x1={cx}
                  y1={plotBottom}
                  x2={cx}
                  y2={plotBottom + 5}
                  stroke="#a3a3a3"
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? '#141414' : '#525252'}
                  fontFamily="monospace"
                >
                  {pt.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
