'use client';

import React from 'react';
import { 
  FileText, 
  LineChart, 
  Upload, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';
import { SimplifiedReport } from '@/types/report';
import { SYNTHETIC_BENCHMARKS } from '@/data/syntheticReports';

interface DashboardHomeProps {
  currentReport: SimplifiedReport | null;
  fileInfo?: { fileName: string; fileType: string; previewUrl?: string };
  onNavigateToSimplifier: () => void;
  onNavigateToTracker: () => void;
  onStartProcessing: (fileName: string) => void;
  onReportLoaded: (report: SimplifiedReport, fileInfo?: { fileName: string; fileType: string; previewUrl?: string; fileBase64?: string }) => void;
  onProcessingError: (errorMsg: string) => void;
}

export function DashboardHome({
  currentReport,
  fileInfo,
  onNavigateToSimplifier,
  onNavigateToTracker,
  onStartProcessing,
  onReportLoaded,
}: DashboardHomeProps) {
  const loadSampleBenchmark = (reportId: string) => {
    const benchmark = SYNTHETIC_BENCHMARKS.find((b) => b.id === reportId) || SYNTHETIC_BENCHMARKS[0];
    onStartProcessing(`${benchmark.title} (Synthetic Benchmark)`);
    setTimeout(() => {
      onReportLoaded(benchmark, {
        fileName: `${benchmark.title}.txt`,
        fileType: 'text/plain',
      });
    }, 450);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-paper py-10 px-4 sm:px-6">
      <div className="max-w-[1100px] mx-auto space-y-10">
        
        {/* Editorial Hero Header */}
        <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <img 
                src="/meducid-logo.png" 
                alt="MEDUCID" 
                className="h-8 w-auto object-contain" 
              />
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-ink bg-lime border border-ink px-2.5 py-0.5 rounded-md font-black">
                Clinical Intelligence Hub
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-ink leading-[1.15]">
              Understand laboratory data with clinical precision.
            </h1>

            <p className="font-sans text-sm sm:text-base text-muted leading-relaxed">
              Deterministic laboratory document simplification, verified closed &amp; inequality range interpretation, and multi-visit longitudinal biomarker tracking.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5 border-t md:border-t-0 md:border-l border-ink/10 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center gap-2 text-xs font-mono tracking-[0.05em] uppercase text-[#737373]">
              <span>Verification</span>
              <span className="font-bold text-[#3d5d04] bg-[#e7f8b9] px-2 py-0.5 rounded border border-[#6a8e0c]/30">100% Strict Match</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-[0.05em] uppercase text-[#737373]">
              <span>Storage</span>
              <span className="font-bold text-teal bg-[#eeede6] px-2 py-0.5 rounded border border-ink/20">Local Sandbox</span>
            </div>
          </div>
        </div>

        {/* Active Session Callout (Elevated Cream Card with Recessed Ledger) */}
        {currentReport && (
          <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-lime border border-ink" />
                <span className="font-mono text-xs uppercase tracking-[0.05em] font-bold text-ink">
                  Active In-Memory Session
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-ink tracking-[-0.02em]">
                {fileInfo?.fileName || currentReport.title || 'Laboratory Report'}
              </h3>
              <p className="font-sans text-xs text-muted">
                {currentReport.findings.length} findings extracted · {currentReport.summary.outOfRangeCount} out-of-range indicators
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToSimplifier}
                className="cta-shadow h-11 px-5 rounded-xl border-2 border-ink bg-lime hover:bg-[#d5ff57] text-ink text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Resume Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Report Simplifier */}
          <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-lime border-2 border-ink flex items-center justify-center text-ink shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink bg-lime border border-ink px-2.5 py-1 rounded-full font-black">
                  Core Engine Active
                </span>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-ink leading-tight">
                  Report Simplification
                </h2>
                <p className="font-sans text-sm text-muted mt-2 leading-relaxed">
                  Extract complete panels across all pages without omission. Read side-by-side verification with source line coordinates and deterministic high/low bounds.
                </p>
              </div>

              {/* Recessed Ledger Sub-box */}
              <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl divide-y divide-[#d7d6cf] text-xs">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted font-medium">Extraction Completeness</span>
                  <span className="font-mono font-bold text-ink uppercase tracking-[0.05em]">100% Deterministic</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted font-medium">Supported Panels</span>
                  <span className="text-ink font-bold">CBC, Biochem, Urinalysis</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted font-medium">Auditing Mode</span>
                  <span className="text-ink font-bold">Split-Screen Original vs Derived</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-black/10">
              <button
                onClick={onNavigateToSimplifier}
                className="cta-shadow w-full h-12 px-6 rounded-xl border-2 border-ink bg-lime hover:bg-[#d5ff57] text-ink text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Open Report Simplifier</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={() => loadSampleBenchmark('multi-01')}
                className="w-full h-11 px-4 rounded-xl bg-paper border border-black/15 text-muted hover:text-ink hover:bg-[#eeede6] text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-coral" />
                <span>Load Synthetic Benchmark (43 Biomarkers)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Biomarker & Report Tracker */}
          <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-ink border-2 border-ink flex items-center justify-center text-lime shadow-[0_2px_0_rgba(0,0,0,.1)]">
                  <LineChart className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink bg-lime border border-ink px-2.5 py-1 rounded-full font-black">
                  Phase 2 Architecture
                </span>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-ink leading-tight">
                  Report Tracker
                </h2>
                <p className="font-sans text-sm text-muted mt-2 leading-relaxed">
                  Longitudinal health analysis across chronological patient visits. Track fasting glucose, lipid fractions, and hematology trajectories against clinical bounds with Cloudflare D1 persistence.
                </p>
              </div>

              {/* Recessed Ledger Sub-box */}
              <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl divide-y divide-[#d7d6cf] text-xs">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted font-medium">Trajectory Visualization</span>
                  <span className="font-mono font-bold text-ink uppercase tracking-[0.05em]">Multi-Visit Chronological</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted font-medium">Target Storage Engine</span>
                  <span className="text-ink font-bold">Cloudflare D1 SQL + KV</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted font-medium">Historical Panels</span>
                  <span className="text-ink font-bold">Out-of-range flag logging</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-black/10">
              <button
                onClick={onNavigateToTracker}
                className="w-full h-12 px-6 rounded-xl border-2 border-ink bg-ink hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,.15)] cursor-pointer"
              >
                <LineChart className="w-4 h-4 text-lime" />
                <span>Explore Biomarker Tracker</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <div className="h-11 flex items-center justify-center text-xs text-muted font-mono tracking-[0.05em] uppercase font-bold">
                Edge SQL Database Architecture Ready
              </div>
            </div>
          </div>

        </div>

        {/* Clean Ledger Footer Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-cream border border-ink/15 rounded-xl p-4 shadow-xs space-y-1">
            <div className="text-muted uppercase tracking-[0.05em] text-[10px] font-bold">Session Isolation</div>
            <div className="font-sans font-bold text-ink">Client Sandboxed</div>
          </div>
          <div className="bg-cream border border-ink/15 rounded-xl p-4 shadow-xs space-y-1">
            <div className="text-muted uppercase tracking-[0.05em] text-[10px] font-bold">Range Engine</div>
            <div className="font-sans font-bold text-ink">100% Deterministic</div>
          </div>
          <div className="bg-cream border border-ink/15 rounded-xl p-4 shadow-xs space-y-1">
            <div className="text-muted uppercase tracking-[0.05em] text-[10px] font-bold">Completeness</div>
            <div className="font-sans font-bold text-ink">CBC, Biochem, Urinalysis</div>
          </div>
          <div className="bg-cream border border-ink/15 rounded-xl p-4 shadow-xs space-y-1">
            <div className="text-muted uppercase tracking-[0.05em] text-[10px] font-bold">Cloudflare D1</div>
            <div className="font-sans font-bold text-teal">Edge SQL Ready</div>
          </div>
        </div>

      </div>
    </div>
  );
}
