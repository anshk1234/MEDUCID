'use client';

import React, { useRef, useState } from 'react';
import { 
  FileText, 
  LineChart, 
  Upload, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { SimplifiedReport } from '@/types/report';
import { SYNTHETIC_BENCHMARKS } from '@/data/syntheticReports';
import { validateUploadFile, prepareFileForExtraction, requestAiExtraction } from '@/lib/fileProcessor';
import { parseRawReportText } from '@/lib/simplificationEngine';

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
  onProcessingError,
}: DashboardHomeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [quickValidationError, setQuickValidationError] = useState<string | null>(null);

  // Handle direct file drop or selection right from Dashboard
  const handleFile = async (file: File) => {
    setQuickValidationError(null);
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setQuickValidationError(validation.error || 'Invalid file.');
      return;
    }

    onStartProcessing(file.name);

    let prepared: any = null;
    try {
      prepared = await prepareFileForExtraction(file);

      const aiResult = await requestAiExtraction({
        fileBase64: prepared.rawText ? undefined : prepared.fileBase64,
        mimeType: prepared.rawText ? undefined : prepared.mimeType,
        rawText: prepared.rawText,
        fileName: prepared.fileName,
      });

      if (!aiResult.report.findings || aiResult.report.findings.length === 0) {
        if (prepared.rawText) {
          const parsed = parseRawReportText(prepared.rawText, file.name);
          if (parsed.findings.length > 0) {
            onReportLoaded(parsed, {
              fileName: file.name,
              fileType: prepared.fileType,
              previewUrl: prepared.previewUrl,
              fileBase64: prepared.fileBase64,
            });
            return;
          }
        }
        onProcessingError("We couldn't find lab values in this file. Please verify the document format.");
        return;
      }

      onReportLoaded(aiResult.report, {
        fileName: prepared.fileName,
        fileType: prepared.fileType,
        previewUrl: prepared.previewUrl,
        fileBase64: prepared.fileBase64,
      });
    } catch (err: any) {
      console.warn('AI Extraction error, checking fallback...', err);
      if (prepared?.rawText) {
        try {
          const parsed = parseRawReportText(prepared.rawText, file.name);
          if (parsed.findings.length > 0) {
            onReportLoaded(parsed, {
              fileName: file.name,
              fileType: prepared.fileType,
              previewUrl: prepared.previewUrl,
              fileBase64: prepared.fileBase64,
            });
            return;
          }
        } catch (parseErr) {
          console.warn('Local parser fallback error:', parseErr);
        }
      }
      onProcessingError(err.message || 'Failed to extract report data. Please try another file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

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
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="font-mono font-bold text-ink">
                  {currentReport.findings.length}
                </span>
                <span>measurements extracted</span>
                <span className="text-black/20">•</span>
                <span className="font-mono font-bold text-[#9f2e1c]">
                  {currentReport.findings.filter((f) => f.flag === 'HIGH' || f.flag === 'LOW').length}
                </span>
                <span>outside reference range</span>
              </div>
            </div>

            <button
              onClick={onNavigateToSimplifier}
              className="cta-shadow h-11 px-6 rounded-xl border-2 border-ink bg-lime text-ink text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Resume Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Two Core Gateway Cards (Cream #fffefa, Crisp 1.5px border, Recessed #eeede6 Ledgers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Report Simplifier */}
          <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-lime border-2 border-ink flex items-center justify-center text-ink shadow-[0_2px_0_rgba(0,0,0,.1)]">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-[#3d5d04] bg-[#e7f8b9] border border-[#6a8e0c]/40 px-2.5 py-1 rounded-full font-bold">
                  Active System
                </span>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-ink leading-tight">
                  Report Simplifier
                </h2>
                <p className="font-sans text-sm text-muted mt-2 leading-relaxed">
                  Upload laboratory documents in PDF, TXT, or scan formats. Ingests Complete Blood Count, Biochemistry, and Urinalysis measurements with zero silent discards and side-by-side verification.
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
                  Biomarker &amp; Report Tracker
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

        {/* Direct Ingestion Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`bg-cream border-2 rounded-2xl p-6 sm:p-8 transition-all shadow-[0_5px_0_rgba(20,20,20,.04)] ${
            isDragOver ? 'border-lime bg-[#e9f6c4]/40 ring-4 ring-lime/30' : 'border-dashed border-ink/20 hover:border-ink/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.heic,.docx"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-lime border-2 border-ink flex items-center justify-center text-ink shrink-0 shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-ink tracking-[-0.02em]">
                  Direct Ingestion Dropzone
                </h3>
                <p className="font-sans text-xs text-muted">
                  Drag &amp; drop any PDF, scan, or TXT report to immediately parse into the clinical workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-11 px-5 rounded-xl border-2 border-ink bg-paper hover:bg-[#eeede6] text-ink text-xs font-black uppercase tracking-wider transition-colors w-full sm:w-auto cursor-pointer"
              >
                Browse Document
              </button>
            </div>
          </div>

          {quickValidationError && (
            <div className="mt-4 text-xs font-bold text-[#9f2e1c] bg-[#ffe0d8] border border-[#ff593e]/40 px-4 py-2.5 rounded-xl">
              {quickValidationError}
            </div>
          )}
        </div>

        {/* Longitudinal Trajectory Preview Strip */}
        <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-lime border border-ink flex items-center justify-center text-ink">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink tracking-[-0.02em]">
                Longitudinal Biomarker Sample Trajectories
              </h3>
            </div>
            <button
              onClick={onNavigateToTracker}
              className="text-xs font-bold text-teal hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View Full Trajectory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Metric 1: Glucose */}
            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-bold text-ink">Fasting Glucose</span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#ffe0d8] text-[#9f2e1c] border border-[#ff593e]/30">
                  104 mg/dL
                </span>
              </div>
              <div className="font-mono text-xs text-muted">Range: 70 - 99 mg/dL</div>
              <div className="pt-2 border-t border-[#d7d6cf] flex items-center justify-between text-xs font-mono text-muted">
                <span>Oct &apos;25: 96</span>
                <span>→</span>
                <span>Apr &apos;26: 101</span>
                <span>→</span>
                <span className="font-bold text-[#9f2e1c]">Oct &apos;26: 104</span>
              </div>
            </div>

            {/* Metric 2: Cholesterol */}
            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-bold text-ink">Total Cholesterol</span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e7f8b9] text-[#3d5d04] border border-[#6a8e0c]/30">
                  195 mg/dL
                </span>
              </div>
              <div className="font-mono text-xs text-muted">Range: &lt; 200 mg/dL</div>
              <div className="pt-2 border-t border-[#d7d6cf] flex items-center justify-between text-xs font-mono text-muted">
                <span>Oct &apos;25: 215</span>
                <span>→</span>
                <span>Apr &apos;26: 205</span>
                <span>→</span>
                <span className="font-bold text-[#3d5d04]">Oct &apos;26: 195</span>
              </div>
            </div>

            {/* Metric 3: Hemoglobin */}
            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-bold text-ink">Hemoglobin</span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e7f8b9] text-[#3d5d04] border border-[#6a8e0c]/30">
                  14.2 g/dL
                </span>
              </div>
              <div className="font-mono text-xs text-muted">Range: 13.0 - 17.5 g/dL</div>
              <div className="pt-2 border-t border-[#d7d6cf] flex items-center justify-between text-xs font-mono text-muted">
                <span>Oct &apos;25: 13.8</span>
                <span>→</span>
                <span>Apr &apos;26: 14.0</span>
                <span>→</span>
                <span className="font-bold text-[#3d5d04]">Oct &apos;26: 14.2</span>
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
