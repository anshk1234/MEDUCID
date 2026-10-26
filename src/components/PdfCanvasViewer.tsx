'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { MedicalFinding } from '@/types/report';
import { loadPdfJsLibrary } from '@/lib/fileProcessor';

interface PdfCanvasViewerProps {
  pdfUrl: string;
  findings: MedicalFinding[];
  hoveredFindingId: string | null;
  selectedFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
}

interface TextSpanItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  matchedFinding?: MedicalFinding;
}

export function PdfCanvasViewer({
  pdfUrl,
  findings,
  hoveredFindingId,
  selectedFindingId,
  onSelectFinding,
}: PdfCanvasViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.1); // One zoom control
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [textSpans, setTextSpans] = useState<TextSpanItem[]>([]);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 620, height: 850 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRenderTaskRef = useRef<any>(null);

  // 1. Load PDF.js library and document
  useEffect(() => {
    let isMounted = true;
    setPdfDoc(null);

    async function loadDocument() {
      try {
        setLoading(true);

        await loadPdfJsLibrary();
        const pdfjsLib = (window as any).pdfjsLib;

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await Promise.race([
          loadingTask.promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('PDF preview timed out')), 8000)
          ),
        ]);

        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages || 1);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF document:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadDocument();

    return () => {
      isMounted = false;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfUrl]);

  // 2. Render Page onto Canvas and Extract Text Spans
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any ongoing render task and wait for it to cleanly abort
    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
        await currentRenderTaskRef.current.promise.catch(() => {});
      } catch {}
      currentRenderTaskRef.current = null;
    }

    try {
      setRendering(true);
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: zoomScale });
      setViewportSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      const task = page.render(renderContext);
      currentRenderTaskRef.current = task;
      await task.promise;
      currentRenderTaskRef.current = null;

      // Extract Text Layer items with accurate coordinate mapping
      const textContent = await page.getTextContent();
      const spans: TextSpanItem[] = [];

      for (const item of textContent.items as any[]) {
        const tx = item.transform;
        const str = (item.str || '').trim();
        const width = item.width * zoomScale;
        const height = (item.height || Math.abs(tx[3]) || 10) * zoomScale;

        let matched: MedicalFinding | undefined = undefined;
        if (str.length > 0) {
          matched = findings.find((f) => {
            const val = f.originalValue.trim();
            const nameParts = f.testName.split(/[,\s]+/);
            return (
              (val.length > 0 && str === val) ||
              (val.length > 0 && str.includes(val)) ||
              nameParts.some((p) => p.length > 4 && str.toLowerCase() === p.toLowerCase())
            );
          });
        }

        let vx = tx[4] * zoomScale;
        let vy = viewport.height - (tx[5] * zoomScale);
        if (typeof viewport.convertToViewportPoint === 'function') {
          const pt = viewport.convertToViewportPoint(tx[4], tx[5]);
          vx = pt[0];
          vy = pt[1];
        }

        spans.push({
          str,
          x: vx,
          y: vy - height,
          width: Math.max(width, 30),
          height: Math.max(height, 14),
          matchedFinding: matched,
        });
      }

      setTextSpans(spans);
      setRendering(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
      setRendering(false);
    }
  }, [pdfDoc, currentPage, zoomScale, findings]);

  // Trigger render whenever pdfDoc is loaded, page changes, or zoom changes
  useEffect(() => {
    if (pdfDoc) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, zoomScale, renderCurrentPage]);

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Top Controls: Page Navigation & Single Zoom Control */}
      <div className="h-10 px-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {currentPage} of {numPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= numPages || loading}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* One Zoom Control Only */}
        <div className="flex items-center gap-1 text-[11px] text-slate-700 font-mono">
          <button
            type="button"
            onClick={() => setZoomScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
            className="p-1 rounded hover:bg-slate-100 cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center font-medium">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
            className="p-1 rounded hover:bg-slate-100 cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area (Canvas is always in DOM so ref is immediately valid) */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start relative">
        {/* Loading Overlay */}
        {(loading || rendering) && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center text-slate-600 text-xs gap-2 z-40">
            <Loader2 className="w-5 h-5 animate-spin text-teal-800" />
            <span>{loading ? 'Loading PDF document...' : 'Rendering page...'}</span>
          </div>
        )}

        {/* Canvas & Text Layer Container */}
        <div
          className="relative shadow-sm border border-slate-300 rounded bg-white overflow-hidden"
          style={{ width: viewportSize.width, height: viewportSize.height }}
        >
          {/* Canvas always mounted so ref is non-null from first paint */}
          <canvas ref={canvasRef} className="block" />

          {/* Overlaid Interactive Text Layer */}
          <div
            className="absolute inset-0 pointer-events-auto"
            style={{ width: viewportSize.width, height: viewportSize.height }}
          >
            {textSpans.map((span, idx) => {
              if (!span.matchedFinding || !span.str) return null;

              const finding = span.matchedFinding;
              const isSelected = finding.id === selectedFindingId;
              const isHovered = finding.id === hoveredFindingId;
              const isOutOfRange = finding.flag === 'HIGH' || finding.flag === 'LOW';

              return (
                <div
                  key={idx}
                  onClick={() => onSelectFinding(finding.id)}
                  title={`${finding.testName}: ${finding.originalValue} ${finding.unit} (${finding.referenceRange})`}
                  style={{
                    position: 'absolute',
                    left: `${span.x}px`,
                    top: `${span.y}px`,
                    width: `${span.width}px`,
                    height: `${span.height}px`,
                  }}
                  className={`rounded transition-all cursor-pointer ${
                    isSelected || isHovered
                      ? 'bg-teal-500/40 ring-2 ring-teal-700 z-30 font-bold'
                      : isOutOfRange
                      ? 'bg-amber-400/35 border border-amber-500 hover:bg-amber-400/50 z-20'
                      : 'bg-teal-100/30 hover:bg-teal-200/50 z-10'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
