'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, ChevronDown, Camera, AlertCircle, Sparkles } from 'lucide-react';
import { validateUploadFile, prepareFileForExtraction, requestAiExtraction } from '@/lib/fileProcessor';
import { SYNTHETIC_BENCHMARKS } from '@/data/syntheticReports';
import { SimplifiedReport } from '@/types/report';
import { parseRawReportText } from '@/lib/simplificationEngine';

interface LandingScreenProps {
  onStartProcessing: (fileName: string) => void;
  onReportLoaded: (report: SimplifiedReport, fileInfo?: { fileName: string; fileType: string; previewUrl?: string; fileBase64?: string }) => void;
  onProcessingError: (errorMsg: string) => void;
}

export function LandingScreen({
  onStartProcessing,
  onReportLoaded,
  onProcessingError,
}: LandingScreenProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('Pasted Lab Report');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const sampleMenuRef = useRef<HTMLDivElement>(null);

  // Close sample menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(event.target as Node)) {
        setIsSampleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clipboard paste listener on window (image or text)
  useEffect(() => {
    async function handleClipboardPaste(e: ClipboardEvent) {
      if (isPasteModalOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleSelectedFile(file);
            return;
          }
        } else if (item.type === 'text/plain') {
          item.getAsString((text) => {
            if (text.includes('TEST') || text.includes('RESULT') || text.length > 30) {
              handlePastedTextSubmit(text, 'Clipboard Ingested Report');
            }
          });
        }
      }
    }

    window.addEventListener('paste', handleClipboardPaste);
    return () => window.removeEventListener('paste', handleClipboardPaste);
  }, [isPasteModalOpen]);

  const handleSelectedFile = async (file: File) => {
    setValidationError(null);
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file.');
      return;
    }

    onStartProcessing(file.name);

    let prepared: any = null;
    try {
      prepared = await prepareFileForExtraction(file);

      // Call AI Extraction API with Gemini Key Rotation
      // If rawText was successfully extracted locally (e.g. text PDF or TXT), omit huge base64 payload to prevent LAN timeouts and 413 limits
      const aiResult = await requestAiExtraction({
        fileBase64: prepared.rawText ? undefined : prepared.fileBase64,
        mimeType: prepared.rawText ? undefined : prepared.mimeType,
        rawText: prepared.rawText,
        fileName: prepared.fileName,
      });

      if (!aiResult.report.findings || aiResult.report.findings.length === 0) {
        // If AI returned 0 findings but we have rawText, parse locally
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

      // Robust client fallback for ANY file with extracted text (TXT or PDF)
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

      // If text file (.txt) and prepareFileForExtraction had an issue, read text directly:
      if (file.name.toLowerCase().endsWith('.txt')) {
        try {
          const directText = await file.text();
          const parsed = parseRawReportText(directText, file.name);
          if (parsed.findings.length > 0) {
            onReportLoaded(parsed, {
              fileName: file.name,
              fileType: 'text',
            });
            return;
          }
        } catch {}
      }

      onProcessingError(err?.message || 'Failed to extract values from file.');
    }
  };

  const handlePastedTextSubmit = async (text: string, title: string) => {
    if (!text.trim()) {
      setValidationError('Please enter or paste report text.');
      return;
    }

    setValidationError(null);
    onStartProcessing(title);
    setIsPasteModalOpen(false);

    try {
      // First attempt Gemini AI extraction
      const aiResult = await requestAiExtraction({
        rawText: text,
        fileName: title,
      });

      if (aiResult.report.findings.length > 0) {
        onReportLoaded(aiResult.report, {
          fileName: title,
          fileType: 'text',
        });
        return;
      }
    } catch (e) {
      console.warn('Gemini AI paste extraction failed, trying local engine...', e);
    }

    // Local deterministic engine fallback
    try {
      const parsed = parseRawReportText(text, title);
      if (parsed.findings.length === 0) {
        onProcessingError("We couldn't find lab values in the pasted text.");
        return;
      }
      onReportLoaded(parsed, {
        fileName: title,
        fileType: 'text',
      });
    } catch (err: any) {
      onProcessingError(err?.message || 'Failed to parse text report.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSampleSelect = (bench: SimplifiedReport) => {
    setIsSampleMenuOpen(false);
    onStartProcessing(bench.title);
    setTimeout(() => {
      onReportLoaded(bench, {
        fileName: `${bench.title.replace(/\s+/g, '_')}.txt`,
        fileType: 'text',
      });
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto w-full select-none bg-paper">
      {/* Editorial MEDUCID Logo & Tagline */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center mb-3">
          <img 
            src="/meducid-logo.png" 
            alt="MEDUCID" 
            className="h-14 sm:h-16 w-auto object-contain" 
          />
        </div>
        <p className="font-sans text-sm text-muted font-normal">
          Understand your laboratory report with verified clinical precision.
        </p>
      </div>

      {/* Main Centered Dropzone Card (Cream #fffefa, Crisp border-2, rounded-2xl) */}
      <div className="w-full max-w-2xl">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 rounded-2xl p-8 sm:p-10 text-center transition-all bg-cream cursor-pointer shadow-[0_5px_0_rgba(20,20,20,.05)] ${
            isDragOver
              ? 'border-lime bg-[#e9f6c4]/40 ring-4 ring-lime/30'
              : 'border-ink/20 hover:border-ink/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload laboratory report"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleSelectedFile(file);
            }}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.docx"
            className="hidden"
          />

          <input
            type="file"
            ref={cameraInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleSelectedFile(file);
            }}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          <div className="mx-auto w-14 h-14 rounded-2xl bg-lime border-2 border-ink flex items-center justify-center text-ink mb-4 shadow-xs">
            <Upload className="w-6 h-6 text-ink" />
          </div>

          <div className="font-serif text-xl font-bold text-ink tracking-[-0.02em] mb-1">
            Drop your report here, or <span className="text-ink underline decoration-lime decoration-4 underline-offset-4">browse files</span>
          </div>

          <p className="font-sans text-xs text-muted mb-6">
            Drag &amp; drop from your computer or click to select a laboratory document
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-paper hover:bg-[#eeede6] border-2 border-ink text-ink text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-ink" />
              <span>Paste Text</span>
            </button>

            {/* Mobile camera capture button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="sm:hidden h-10 px-4 rounded-xl bg-paper hover:bg-[#eeede6] border-2 border-ink text-ink text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-ink" />
              <span>Camera</span>
            </button>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mt-3 p-3 bg-[#ffe0d8] border border-[#ff593e]/40 rounded-xl text-xs text-[#9f2e1c] font-bold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-[#9f2e1c] shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Under the bar: 3 required lines */}
        <div className="mt-6 space-y-2 text-center text-xs">
          {/* Line 1: Formats & limit */}
          <p className="font-sans text-muted">
            Supported formats: PDF (text &amp; scanned), PNG, JPG, WEBP, HEIC, TXT, DOCX · Max 10 MB, up to 10 pages
          </p>

          {/* Line 2: Privacy Notice */}
          <p className="font-sans text-muted">
            Use synthetic or de-identified reports only. Files are client-scoped and purged upon session reset.
          </p>

          {/* Line 3: Sample Reports Menu */}
          <div className="pt-2 relative inline-block text-left" ref={sampleMenuRef}>
            <button
              type="button"
              onClick={() => setIsSampleMenuOpen(!isSampleMenuOpen)}
              className="text-xs text-ink hover:text-teal font-bold inline-flex items-center gap-1.5 underline underline-offset-3 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              <span>Try a synthetic sample report</span>
              <ChevronDown className="w-3 h-3 text-ink" />
            </button>

            {isSampleMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 bg-cream border-2 border-ink/20 rounded-xl shadow-[0_5px_0_rgba(20,20,20,.05)] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-left divide-y divide-black/10">
                <div className="px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.05em] text-muted font-bold">
                  Synthetic Laboratory Benchmarks
                </div>
                {SYNTHETIC_BENCHMARKS.map((bench) => (
                  <button
                    key={bench.id}
                    type="button"
                    onClick={() => handleSampleSelect(bench)}
                    className="w-full px-3.5 py-2.5 text-xs text-ink hover:bg-paper flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <span className="font-bold">{bench.title.split('(')[0].trim()}</span>
                    <span className="font-mono text-[10px] text-muted uppercase font-bold">{bench.findings.length} Tests</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paste Text Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-cream rounded-2xl shadow-xl border-2 border-ink max-w-lg w-full p-6 sm:p-7 text-xs animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-ink tracking-[-0.02em]">
                Paste Laboratory Report Text
              </h3>
              <p className="font-sans text-muted mt-1">
                Paste raw report text from your clipboard to extract and simplify findings deterministically.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-bold text-ink mb-1.5">Report Title</label>
                <input
                  type="text"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  className="w-full bg-paper focus:bg-white border-2 border-ink/20 focus:border-ink rounded-xl h-11 px-4 text-sm outline-none text-ink font-sans"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1.5">Raw Report Text</label>
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste laboratory results text here..."
                  className="w-full p-3 font-mono text-xs bg-paper focus:bg-white border-2 border-ink/20 focus:border-ink rounded-xl outline-none leading-relaxed text-ink"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="h-11 px-5 rounded-xl bg-paper border-2 border-ink/20 text-muted hover:text-ink font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePastedTextSubmit(pastedText, pastedTitle)}
                className="cta-shadow h-11 px-6 bg-lime hover:bg-[#d5ff57] text-ink border-2 border-ink rounded-xl font-black uppercase text-xs tracking-wider cursor-pointer transition-colors"
              >
                Extract Findings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
