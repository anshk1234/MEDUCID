'use client';

import React, { useState } from 'react';
import { MEDICAL_TERM_DEFINITIONS } from '@/data/medicalTerms';

interface AnnotatedExplanationProps {
  text: string;
}

export function AnnotatedExplanation({ text }: AnnotatedExplanationProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Split words while preserving punctuation and spacing
  const words = text.split(/(\s+|[.,;()]+)/);

  return (
    <span className="leading-relaxed">
      {words.map((word, idx) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const definition = MEDICAL_TERM_DEFINITIONS[cleanWord];

        if (definition) {
          const isOpen = activeTooltip === `${cleanWord}-${idx}`;
          return (
            <span key={idx} className="relative inline-block group">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip(`${cleanWord}-${idx}`)}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip(`${cleanWord}-${idx}`)}
                onBlur={() => setActiveTooltip(null)}
                className="underline decoration-dotted decoration-teal-600 underline-offset-3 font-medium text-slate-800 hover:text-teal-900 cursor-help focus:outline-none focus:ring-1 focus:ring-teal-700 rounded-xs"
                aria-describedby={isOpen ? `tooltip-${cleanWord}-${idx}` : undefined}
              >
                {word}
              </button>

              {isOpen && (
                <span
                  id={`tooltip-${cleanWord}-${idx}`}
                  role="tooltip"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 p-2 bg-slate-900 text-white text-[11px] font-normal leading-snug rounded shadow-md z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
                >
                  <strong className="block text-teal-300 font-semibold mb-0.5 capitalize">
                    {cleanWord}
                  </strong>
                  {definition}
                </span>
              )}
            </span>
          );
        }

        return <React.Fragment key={idx}>{word}</React.Fragment>;
      })}
    </span>
  );
}
