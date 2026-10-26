'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  FileText, 
  RotateCcw, 
  Trash2, 
  PanelLeftClose, 
  PanelLeftOpen, 
  GripVertical,
  Layers,
  Database
} from 'lucide-react';
import { SimplifiedReport, MedicalFinding } from '@/types/report';
import { OriginalReportPane } from './OriginalReportPane';
import { SimplifiedResultsPane } from './SimplifiedResultsPane';

interface SplitScreenWorkspaceProps {
  report: SimplifiedReport;
  fileInfo?: {
    fileName: string;
    fileType: string;
    previewUrl?: string;
    fileBase64?: string;
  };
  onNewReport: () => void;
  onClearData: () => void;
  onSaveFinding: (updated: MedicalFinding) => void;
  onRevertFinding: (findingId: string) => void;
  onAddRow: (newFinding: MedicalFinding) => void;
}

export function SplitScreenWorkspace({
  report,
  fileInfo,
  onNewReport,
  onClearData,
  onSaveFinding,
  onRevertFinding,
  onAddRow,
}: SplitScreenWorkspaceProps) {
  // Draggable divider state (default 50%, min 30%, max 70%)
  const [leftPanePercent, setLeftPanePercent] = useState<number>(50);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSavingToTracker, setIsSavingToTracker] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Responsive tab view under 1100px: [Report | Results]
  const [responsiveTab, setResponsiveTab] = useState<'report' | 'results'>('results');

  // Shared hover/select state between left and right panes
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse drag handler for divider
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp between 30% and 70%
      if (newPercent >= 30 && newPercent <= 70) {
        setLeftPanePercent(newPercent);
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSaveToTracker = async () => {
    setIsSavingToTracker(true);
    try {
      const res = await fetch('/api/tracker/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert('Please open the Report Tracker tab and sign in first to sync reports to your Cloudflare database.');
      }
    } catch {
      alert('Error connecting to Cloudflare D1.');
    } finally {
      setIsSavingToTracker(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-paper">
      {/* Top Bar: max 56px */}
      <header className="h-14 max-h-14 border-b border-black/10 bg-paper/95 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none">
        {/* Left: MEDUCID Wordmark + File Name Chip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <img 
              src="/meducid-logo.png" 
              alt="MEDUCID" 
              className="h-7 w-auto object-contain" 
            />
          </div>

          <div className="h-4 w-px bg-black/10 hidden sm:block" />

          {/* File Name Chip - Privacy Sanitized */}
          <div className="flex items-center gap-1.5 text-xs text-ink bg-cream px-2.5 py-1 rounded-lg border border-black/15 font-mono font-medium shadow-xs">
            <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
            <span>
              {fileInfo?.fileType ? `report.${fileInfo.fileType}` : 'report.pdf'}
            </span>
          </div>
        </div>

        {/* Center: Under 1100px Responsive Switcher */}
        <div className="flex xl:hidden items-center bg-[#eeede6] p-0.5 rounded-lg border border-black/15 text-xs">
          <button
            onClick={() => setResponsiveTab('report')}
            className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-colors ${
              responsiveTab === 'report' ? 'bg-lime text-ink border border-ink shadow-xs' : 'text-muted'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => setResponsiveTab('results')}
            className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-colors ${
              responsiveTab === 'results' ? 'bg-lime text-ink border border-ink shadow-xs' : 'text-muted'
            }`}
          >
            Results
          </button>
        </div>

        {/* Right: Left Pane Collapse Button, New Report, Clear Data */}
        <div className="flex items-center gap-2.5">
          {/* Collapse/Expand Left Pane Toggle (Desktop) */}
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            title={isLeftCollapsed ? 'Show original report pane' : 'Collapse original report pane'}
            className="hidden xl:flex items-center gap-1.5 text-xs text-ink bg-cream hover:bg-[#eeede6] border-2 border-ink/15 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-bold shadow-xs"
          >
            {isLeftCollapsed ? (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-muted" />
                <span>Show report</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-muted" />
                <span>Collapse report</span>
              </>
            )}
          </button>

          {/* Sync to Cloudflare D1 Tracker Button */}
          <button
            onClick={handleSaveToTracker}
            disabled={isSavingToTracker}
            title="Save this report to your longitudinal Cloudflare D1 database"
            className="text-xs font-black uppercase text-ink bg-lime hover:bg-[#d5ff57] border-2 border-ink px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-ink" />
            <span>{savedSuccess ? 'Saved to D1 ✓' : isSavingToTracker ? 'Saving...' : 'Save to Tracker'}</span>
          </button>

          {/* New Report Button */}
          <button
            onClick={onNewReport}
            className="text-xs font-bold text-white bg-ink hover:bg-neutral-800 border-2 border-ink px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New report</span>
          </button>

          {/* Clear Data Action */}
          <button
            onClick={onClearData}
            title="Clear all session data"
            className="p-1.5 text-muted hover:text-ink hover:bg-[#eeede6] rounded-lg cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Split-Screen Workspace (Desktop) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex relative select-text"
      >
        {/* LEFT PANE (Original Report): rendered conditionally or by percentage */}
        <div
          style={{
            width: isLeftCollapsed ? '0%' : `${leftPanePercent}%`,
            display: isLeftCollapsed ? 'none' : undefined,
          }}
          className={`h-full overflow-hidden ${
            responsiveTab === 'results' ? 'hidden xl:block' : 'w-full'
          }`}
        >
          <OriginalReportPane
            report={report}
            fileInfo={fileInfo}
            hoveredFindingId={hoveredFindingId}
            onHoverFinding={setHoveredFindingId}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
          />
        </div>

        {/* DRAGGABLE DIVIDER (Desktop only) */}
        {!isLeftCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            className="hidden xl:flex w-1.5 bg-slate-200 hover:bg-teal-600 active:bg-teal-700 cursor-col-resize items-center justify-center transition-colors z-20 group relative shrink-0"
            title="Drag to resize split view (min 30%, max 70%)"
          >
            <div className="w-4 h-8 bg-white border border-slate-300 rounded shadow-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        )}

        {/* RIGHT PANE (Simplified Results): exactly ONE scroll container */}
        <div
          style={{
            width: isLeftCollapsed ? '100%' : `${100 - leftPanePercent}%`,
          }}
          className={`h-full overflow-hidden ${
            responsiveTab === 'report' ? 'hidden xl:block' : 'w-full'
          }`}
        >
          <SimplifiedResultsPane
            report={report}
            hoveredFindingId={hoveredFindingId}
            onHoverFinding={setHoveredFindingId}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onSaveFinding={onSaveFinding}
            onRevertFinding={onRevertFinding}
            onAddRow={onAddRow}
          />
        </div>
      </div>
    </div>
  );
}
