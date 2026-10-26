'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileCode, 
  Image as ImageIcon 
} from 'lucide-react';
import { SimplifiedReport, MedicalFinding } from '@/types/report';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface OriginalReportPaneProps {
  report: SimplifiedReport;
  fileInfo?: {
    fileName: string;
    fileType: string;
    previewUrl?: string;
    fileBase64?: string;
  };
  hoveredFindingId: string | null;
  onHoverFinding: (id: string | null) => void;
  selectedFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
}

export function OriginalReportPane({
  report,
  fileInfo,
  hoveredFindingId,
  onHoverFinding,
  selectedFindingId,
  onSelectFinding,
}: OriginalReportPaneProps) {
  const [viewMode, setViewMode] = useState<'original' | 'extracted'>('original');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const linesContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const pdfSource = fileInfo?.previewUrl || (fileInfo?.fileBase64 ? `data:application/pdf;base64,${fileInfo.fileBase64}` : '');
  const imageSource = fileInfo?.previewUrl || (fileInfo?.fileBase64 ? `data:${fileInfo.fileType};base64,${fileInfo.fileBase64}` : '');

  const isPdf = Boolean(fileInfo && fileInfo.fileType === 'pdf' && pdfSource);
  const isImage = Boolean(fileInfo && fileInfo.fileType === 'image' && imageSource);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 60));
  const handleZoomReset = () => setZoomLevel(100);

  // Auto scroll to highlighted line when finding is hovered or selected from the right pane
  useEffect(() => {
    const targetId = hoveredFindingId || selectedFindingId;
    if (targetId && lineRefs.current[targetId]) {
      lineRefs.current[targetId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [hoveredFindingId, selectedFindingId]);

  const lines = report.rawText.split('\n');

  return (
    <div className="h-full flex flex-col bg-[#FAF9F6] border-r border-[#E7E4DC] overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="h-12 px-4 bg-white border-b border-[#E7E4DC] flex items-center justify-between gap-3 shrink-0 text-xs">
        {/* Toggle: [Original | Extracted text] */}
        <div className="flex items-center bg-[#F3F1EB] p-1 rounded-xl border border-[#E7E4DC]">
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'original'
                ? 'bg-white text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E7E4DC]'
                : 'text-[#525252] hover:text-[#171717]'
            }`}
          >
            {isPdf || isImage ? <ImageIcon className="w-3.5 h-3.5 text-[#525252]" /> : <FileText className="w-3.5 h-3.5 text-[#525252]" />}
            <span>Original</span>
          </button>
          <button
            onClick={() => setViewMode('extracted')}
            className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'extracted'
                ? 'bg-white text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E7E4DC]'
                : 'text-[#525252] hover:text-[#171717]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#525252]" />
            <span>Extracted text</span>
          </button>
        </div>

        {/* Zoom controls for non-PDF views (PDF has its own internal single zoom control) */}
        {!isPdf && (
          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono">
            <button
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1 rounded hover:bg-slate-100 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1 rounded hover:bg-slate-100 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={handleZoomReset}
                title="Reset zoom"
                className="p-1 rounded hover:bg-slate-100 cursor-pointer ml-0.5"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Document Content Area */}
      <div className="flex-1 overflow-hidden select-text">
        {viewMode === 'original' && isPdf ? (
          /* PDF.js Canvas + Interactive Text Layer Viewer */
          <PdfCanvasViewer
            pdfUrl={pdfSource}
            findings={report.findings}
            hoveredFindingId={hoveredFindingId}
            selectedFindingId={selectedFindingId}
            onSelectFinding={onSelectFinding}
          />
        ) : viewMode === 'original' && isImage ? (
          /* Zoomable Image View */
          <div className="h-full overflow-auto p-4 flex items-center justify-center">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
              className="transition-transform duration-100 shadow-sm border border-slate-300 rounded-lg overflow-hidden bg-white max-w-full"
            >
              <img
                src={imageSource}
                alt="Uploaded Laboratory Report"
                className="max-w-full h-auto object-contain block"
              />
            </div>
          </div>
        ) : (
          /* Formatted Text / Extracted Text View with Line Numbers & Synchronized Highlights */
          <div className="h-full overflow-auto p-4" ref={linesContainerRef}>
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
              className="transition-transform duration-100 bg-white rounded-lg border border-slate-200 p-4 font-mono text-xs shadow-none min-w-max"
            >
              {lines.map((line, idx) => {
                const matchedFinding = report.findings.find(
                  (f) => f.sourceSpan && line.includes(f.sourceSpan)
                );

                const isHovered = matchedFinding && matchedFinding.id === hoveredFindingId;
                const isSelected = matchedFinding && matchedFinding.id === selectedFindingId;
                const isOutOfRange = matchedFinding && (matchedFinding.flag === 'HIGH' || matchedFinding.flag === 'LOW');

                return (
                  <div
                    key={idx}
                    ref={(el) => {
                      if (matchedFinding) {
                        lineRefs.current[matchedFinding.id] = el;
                      }
                    }}
                    onMouseEnter={() => matchedFinding && onHoverFinding(matchedFinding.id)}
                    onMouseLeave={() => onHoverFinding(null)}
                    onClick={() => matchedFinding && onSelectFinding(matchedFinding.id)}
                    className={`flex items-start gap-4 px-2 py-0.5 rounded transition-all whitespace-pre font-mono cursor-pointer ${
                      isHovered || isSelected
                        ? 'bg-teal-50 border-2 border-teal-700 font-semibold text-slate-900 shadow-xs'
                        : isOutOfRange
                        ? 'border border-amber-300 bg-amber-50/60 text-slate-900'
                        : matchedFinding
                        ? 'hover:bg-slate-100 text-slate-800'
                        : 'text-slate-500'
                    }`}
                  >
                    <span className="w-6 text-right select-none text-slate-400 font-mono text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-mono">{line || ' '}</span>
                    {matchedFinding && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase shrink-0 font-medium ${
                          isOutOfRange
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {matchedFinding.flag === 'HIGH'
                          ? '▲ Above'
                          : matchedFinding.flag === 'LOW'
                          ? '▼ Below'
                          : 'Normal'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pane Footer Info: Sanitize name for privacy */}
      <div className="h-7 px-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
        <span className="truncate max-w-[200px]">
          {fileInfo?.fileType ? `report.${fileInfo.fileType}` : 'report.txt'}
        </span>
        <span>{report.findings.length} parsed lab entities</span>
      </div>
    </div>
  );
}
