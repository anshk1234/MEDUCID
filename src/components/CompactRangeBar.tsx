'use client';

import React from 'react';
import { FlagStatus } from '@/types/report';

interface CompactRangeBarProps {
  numericValue?: number | null;
  low?: number | null;
  high?: number | null;
  flag: FlagStatus;
  referenceRange: string;
}

export function CompactRangeBar({
  numericValue,
  low,
  high,
  flag,
  referenceRange,
}: CompactRangeBarProps) {
  // If non-numeric or unbounded, return clean text
  if (numericValue === null || numericValue === undefined || isNaN(numericValue)) {
    return <span className="text-[10px] text-slate-400 font-mono">-</span>;
  }

  // Derive visual range
  let minBound = low !== null && low !== undefined ? low : (high !== null && high !== undefined ? 0 : numericValue * 0.5);
  let maxBound = high !== null && high !== undefined ? high : (low !== null && low !== undefined ? low * 2 : numericValue * 1.5);

  const span = Math.max(maxBound - minBound, 1);
  const visualMin = Math.min(minBound - span * 0.25, numericValue < minBound ? numericValue - span * 0.1 : minBound);
  const visualMax = Math.max(maxBound + span * 0.25, numericValue > maxBound ? numericValue + span * 0.1 : maxBound);
  const totalRange = visualMax - visualMin;

  const lowPercent = low !== null && low !== undefined ? Math.max(0, Math.min(100, ((low - visualMin) / totalRange) * 100)) : 0;
  const highPercent = high !== null && high !== undefined ? Math.max(0, Math.min(100, ((high - visualMin) / totalRange) * 100)) : 100;
  const valPercent = Math.max(3, Math.min(97, ((numericValue - visualMin) / totalRange) * 100));

  const isOutOfRange = flag === 'HIGH' || flag === 'LOW';

  return (
    <div
      className="w-[120px] max-w-[120px] flex flex-col justify-center gap-0.5 select-none"
      title={`Reference range: ${referenceRange} | Stated value: ${numericValue}`}
    >
      <div className="relative h-2 w-full bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E7E4DC]">
        {/* Valid Reference Range Zone */}
        <div
          className="absolute top-0 bottom-0 bg-[#E7E4DC]/80"
          style={{
            left: `${lowPercent}%`,
            width: `${Math.max(0, highPercent - lowPercent)}%`,
          }}
        />

        {/* Marker for Measured Value */}
        <div
          className={`absolute top-0 bottom-0 w-2 -ml-1 rounded-full shadow-xs ${
            isOutOfRange
              ? 'bg-[#B45309] ring-1 ring-[#FDE68A]'
              : 'bg-[#047857] ring-1 ring-[#A7F3D0]'
          }`}
          style={{ left: `${valPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-0.5">
        <span>{low !== null && low !== undefined ? low : '<'}</span>
        <span>{high !== null && high !== undefined ? high : '>'}</span>
      </div>
    </div>
  );
}
