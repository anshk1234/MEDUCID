'use client';

import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';

export type ProcessingStep = 'reading' | 'extracting' | 'verifying' | 'complete' | 'error';

interface ProcessingStepperProps {
  currentStep: ProcessingStep;
  fileName?: string;
  errorMessage?: string;
  onRetry: () => void;
  onPasteInstead: () => void;
}

export function ProcessingStepper({
  currentStep,
  fileName = 'report',
  errorMessage,
  onRetry,
  onPasteInstead,
}: ProcessingStepperProps) {
  const steps = [
    { id: 'reading', label: 'Reading file' },
    { id: 'extracting', label: 'Extracting values' },
    { id: 'verifying', label: 'Checking against the source' },
  ];

  const getStepStatus = (stepId: string) => {
    if (currentStep === 'error') return 'pending';
    if (currentStep === 'complete') return 'complete';

    const order = ['reading', 'extracting', 'verifying'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-cream rounded-2xl shadow-xl border-2 border-ink p-6 sm:p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <img src="/meducid-logo.png" alt="MEDUCID" className="h-9 w-auto object-contain" />
          </div>
          <h3 className="font-serif text-lg font-bold text-ink tracking-[-0.02em]">
            {currentStep === 'error' ? 'Extraction Error' : 'Processing Medical Report'}
          </h3>
          <p className="font-mono text-xs text-muted mt-1 truncate max-w-xs mx-auto">
            {fileName}
          </p>
        </div>

        {currentStep === 'error' ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-[#ffe0d8] border border-[#ff593e]/40 rounded-xl flex items-start gap-2.5 text-xs text-[#9f2e1c]">
              <AlertCircle className="w-4 h-4 text-[#9f2e1c] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Unable to extract findings</strong>
                <p className="mt-0.5 text-xs text-[#9f2e1c]/90 leading-relaxed font-sans">
                  {errorMessage || "We couldn't find lab values in this file."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={onRetry}
                className="flex-1 h-11 px-4 border-2 border-ink/20 hover:border-ink bg-paper text-ink rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Try another file
              </button>
              <button
                onClick={onPasteInstead}
                className="cta-shadow flex-1 h-11 px-4 bg-lime hover:bg-[#d5ff57] text-ink border-2 border-ink rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Paste text instead
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stepper list */}
            <div className="space-y-3.5 py-1">
              {steps.map((step) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-center gap-3 text-xs">
                    {status === 'complete' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3d5d04] shrink-0" />
                    ) : status === 'current' ? (
                      <Loader2 className="w-4 h-4 text-ink animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-ink/20 shrink-0" />
                    )}
                    <span
                      className={`font-sans ${
                        status === 'current'
                          ? 'text-ink font-bold'
                          : status === 'complete'
                          ? 'text-ink font-bold'
                          : 'text-muted'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted text-center pt-3 border-t border-black/10 font-sans">
              Preserving original numerical values, units, and reference brackets...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
