'use client';

import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Copy, 
  Check, 
  Pencil, 
  X, 
  RotateCcw, 
  Plus, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Info,
  HelpCircle 
} from 'lucide-react';
import { SimplifiedReport, MedicalFinding } from '@/types/report';
import { CompactRangeBar } from './CompactRangeBar';
import { AnnotatedExplanation } from './AnnotatedExplanation';
import { evaluateFindingFlag } from '@/lib/consistencyChecker';
import { lookupMedicalConcept } from '@/lib/simplificationEngine';

interface SimplifiedResultsPaneProps {
  report: SimplifiedReport;
  hoveredFindingId: string | null;
  onHoverFinding: (id: string | null) => void;
  selectedFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  onSaveFinding: (updated: MedicalFinding) => void;
  onRevertFinding: (findingId: string) => void;
  onAddRow: (newFinding: MedicalFinding) => void;
}

export function SimplifiedResultsPane({
  report,
  hoveredFindingId,
  onHoverFinding,
  selectedFindingId,
  onSelectFinding,
  onSaveFinding,
  onRevertFinding,
  onAddRow,
}: SimplifiedResultsPaneProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'questions'>('overview');
  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'within' | 'no_numeric'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedQuestions, setCopiedQuestions] = useState(false);
  const [isConsistencyExpanded, setIsConsistencyExpanded] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editRange, setEditRange] = useState('');
  const [editExplanation, setEditExplanation] = useState('');

  // Draft new row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowName, setNewRowName] = useState('');
  const [newRowValue, setNewRowValue] = useState('');
  const [newRowUnit, setNewRowUnit] = useState('');
  const [newRowRange, setNewRowRange] = useState('');
  const [newRowExplanation, setNewRowExplanation] = useState('');

  const outOfRangeFindings = report.findings.filter(
    (f) => f.flag === 'HIGH' || f.flag === 'LOW'
  );

  // Filtered findings for All Results tab
  const filteredFindings = useMemo(() => {
    return report.findings.filter((f) => {
      if (filterMode === 'flagged' && f.flag !== 'HIGH' && f.flag !== 'LOW') return false;
      if (filterMode === 'within' && (f.flag !== 'NORMAL' || (f.rangeLow === null && f.rangeHigh === null))) return false;
      if (filterMode === 'no_numeric' && (f.rangeLow !== null || f.rangeHigh !== null)) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          f.testName.toLowerCase().includes(q) ||
          f.simplifiedName.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.plainExplanation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [report.findings, filterMode, searchTerm]);

  // Group findings by category
  const categories = useMemo(() => {
    return Array.from(new Set(filteredFindings.map((f) => f.category)));
  }, [filteredFindings]);

  const startEditing = (finding: MedicalFinding) => {
    setEditingId(finding.id);
    setEditName(finding.testName);
    setEditValue(finding.originalValue);
    setEditUnit(finding.unit);
    setEditRange(finding.referenceRange);
    setEditExplanation(finding.plainExplanation);
  };

  const handleSaveEdit = (originalFinding: MedicalFinding) => {
    const numVal = parseFloat(editValue.replace(/[^\d.-]/g, ''));
    let low: number | null = null;
    let high: number | null = null;

    if (editRange.includes('-')) {
      const parts = editRange.split('-').map((p) => parseFloat(p.replace(/[^\d.-]/g, '')));
      if (!isNaN(parts[0])) low = parts[0];
      if (!isNaN(parts[1])) high = parts[1];
    } else if (editRange.startsWith('<')) {
      high = parseFloat(editRange.replace(/[^\d.-]/g, ''));
    } else if (editRange.startsWith('>')) {
      low = parseFloat(editRange.replace(/[^\d.-]/g, ''));
    }

    const newFlag = evaluateFindingFlag(numVal, low, high);
    const relationWord = newFlag === 'HIGH' ? 'Above' : newFlag === 'LOW' ? 'Below' : 'Within';

    const updated: MedicalFinding = {
      ...originalFinding,
      testName: editName.trim(),
      originalValue: editValue.trim(),
      unit: editUnit.trim(),
      referenceRange: editRange.trim(),
      numericValue: isNaN(numVal) ? null : numVal,
      rangeLow: low,
      rangeHigh: high,
      flag: newFlag,
      plainExplanation: editExplanation.trim() || originalFinding.plainExplanation,
      clinicalContext: `${relationWord} the reference range on this report (${editRange.trim()}).`,
      userModified: true,
      originalExtractedValue: originalFinding.originalExtractedValue || originalFinding.originalValue,
      originalExtractedUnit: originalFinding.originalExtractedUnit || originalFinding.unit,
      originalExtractedRange: originalFinding.originalExtractedRange || originalFinding.referenceRange,
      lowConfidence: false,
    };

    onSaveFinding(updated);
    setEditingId(null);
  };

  const handleSaveNewRow = () => {
    if (!newRowName.trim() || !newRowValue.trim()) return;

    const numVal = parseFloat(newRowValue.replace(/[^\d.-]/g, ''));
    let low: number | null = null;
    let high: number | null = null;

    if (newRowRange.includes('-')) {
      const parts = newRowRange.split('-').map((p) => parseFloat(p.replace(/[^\d.-]/g, '')));
      if (!isNaN(parts[0])) low = parts[0];
      if (!isNaN(parts[1])) high = parts[1];
    } else if (newRowRange.startsWith('<')) {
      high = parseFloat(newRowRange.replace(/[^\d.-]/g, ''));
    } else if (newRowRange.startsWith('>')) {
      low = parseFloat(newRowRange.replace(/[^\d.-]/g, ''));
    }

    const calculatedFlag = evaluateFindingFlag(numVal, low, high);
    const lexicon = lookupMedicalConcept(newRowName);
    const relationWord = calculatedFlag === 'HIGH' ? 'Above' : calculatedFlag === 'LOW' ? 'Below' : 'Within';

    const newFinding: MedicalFinding = {
      id: `custom-row-${Date.now()}`,
      testName: newRowName.trim(),
      simplifiedName: lexicon.simplifiedName || newRowName.trim(),
      category: lexicon.category || 'General Laboratory',
      originalValue: newRowValue.trim(),
      unit: newRowUnit.trim(),
      referenceRange: newRowRange.trim() || 'Not specified',
      numericValue: isNaN(numVal) ? null : numVal,
      rangeLow: low,
      rangeHigh: high,
      flag: calculatedFlag,
      plainExplanation: newRowExplanation.trim() || lexicon.plainExplanation,
      clinicalContext: `${relationWord} the reference range on this report (${newRowRange.trim()}).`,
      sourceSpan: `${newRowName.trim()} ${newRowValue.trim()} ${newRowUnit.trim()} ${newRowRange.trim()}`,
      userModified: true,
    };

    onAddRow(newFinding);
    setIsAddingRow(false);
    setNewRowName('');
    setNewRowValue('');
    setNewRowUnit('');
    setNewRowRange('');
    setNewRowExplanation('');
  };

  const handleCopyQuestions = () => {
    const text = report.clinicianQuestions
      .map((q, idx) => `${idx + 1}. ${q}`)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }

    setCopiedQuestions(true);
    setTimeout(() => setCopiedQuestions(false), 2000);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {
      console.warn('Fallback copy failed:', e);
    }
  };

  // Verifies if value, unit, and range exist verbatim in raw text for grounding check
  const rawLower = report.rawText.toLowerCase();

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-text">
      {/* Sticky Top Header: Count, Filter Chips, Search */}
      <div className="p-4 bg-[#FAF9F6] border-b border-[#E7E4DC] shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Header line */}
          <div className="text-xs font-medium text-[#171717] tracking-tight flex items-center gap-2">
            {report.summary.outOfRangeCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[#B45309] bg-[#FFFBEB] px-2.5 py-1 rounded-md border border-[#FDE68A] font-mono text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
                {report.summary.outOfRangeCount} of {report.summary.totalWithNumericRange} values
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[#047857] bg-[#ECFDF5] px-2.5 py-1 rounded-md border border-[#A7F3D0] font-mono text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                All {report.summary.totalWithNumericRange} values
              </span>
            )}
            <span className="font-sans text-[#525252]">
              with a printed numeric range are outside it ({report.summary.noNumericRangeCount} have no numeric range)
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E7E4DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#115E59]/40 text-[#171717] font-sans"
            />
          </div>
        </div>

        {/* Filter Chips & Tabs Toolbar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E7E4DC] select-none">
          {/* Tabs: Overview | All results | Questions */}
          <div className="flex items-center bg-[#F3F1EB] p-1 rounded-xl border border-[#E7E4DC]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E7E4DC]'
                  : 'text-[#525252] hover:text-[#171717]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-white text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E7E4DC]'
                  : 'text-[#525252] hover:text-[#171717]'
              }`}
            >
              <span>All results</span>
              <span className="font-mono text-[10px] text-[#737373] bg-[#FAF9F6] border border-[#E7E4DC] px-1.5 py-0.2 rounded">
                {report.findings.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'questions'
                  ? 'bg-white text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E7E4DC]'
                  : 'text-[#525252] hover:text-[#171717]'
              }`}
            >
              <span>Questions</span>
              <span className="font-mono text-[10px] text-[#737373] bg-[#FAF9F6] border border-[#E7E4DC] px-1.5 py-0.2 rounded">
                {report.clinicianQuestions.length}
              </span>
            </button>
          </div>

          {/* Filter Chips (Active on All results tab) */}
          {activeTab === 'results' && (
            <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-[6px] transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-[#171717] border border-[#E7E4DC] shadow-xs font-semibold'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                All ({report.summary.totalTests})
              </button>
              <button
                onClick={() => setFilterMode('flagged')}
                className={`px-2.5 py-1 rounded-[6px] transition-all cursor-pointer ${
                  filterMode === 'flagged'
                    ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] shadow-xs font-semibold'
                    : 'text-[#B45309] hover:bg-[#FFFBEB]'
                }`}
              >
                Outside ({report.summary.outOfRangeCount})
              </button>
              <button
                onClick={() => setFilterMode('within')}
                className={`px-2.5 py-1 rounded-[6px] transition-all cursor-pointer ${
                  filterMode === 'within'
                    ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] shadow-xs font-semibold'
                    : 'text-[#525252] hover:text-[#171717]'
                }`}
              >
                Within ({report.summary.withinRangeCount})
              </button>
              {report.summary.noNumericRangeCount > 0 && (
                <button
                  onClick={() => setFilterMode('no_numeric')}
                  className={`px-2.5 py-1 rounded-[6px] transition-all cursor-pointer ${
                    filterMode === 'no_numeric'
                      ? 'bg-[#FAF9F6] text-[#171717] border border-[#E7E4DC] shadow-xs font-semibold'
                      : 'text-[#737373] hover:text-[#171717]'
                  }`}
                >
                  No numeric range ({report.summary.noNumericRangeCount})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Single Scroll Container for Right Pane */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-[#FAF9F6]">
        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW                                                    */}
        {/* =================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-100">
            {/* 1. Key Findings: One compact card per outside-range value */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold tracking-[-0.02em] text-[#171717]">
                  Key Findings (Outside Printed Reference Range)
                </h3>
                <span className="font-mono text-[11px] text-slate-400">
                  {outOfRangeFindings.length} flagged
                </span>
              </div>

              {outOfRangeFindings.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {outOfRangeFindings.map((finding) => {
                    const isHigh = finding.flag === 'HIGH';
                    const isHovered = finding.id === hoveredFindingId;
                    const isSelected = finding.id === selectedFindingId;

                    return (
                      <div
                        key={finding.id}
                        onMouseEnter={() => onHoverFinding(finding.id)}
                        onMouseLeave={() => onHoverFinding(null)}
                        onClick={() => onSelectFinding(finding.id)}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                          isHovered || isSelected
                            ? 'border-teal-700 bg-teal-50/40 ring-1 ring-teal-500 shadow-xs'
                            : 'border-amber-200/90 bg-amber-50/20 hover:bg-amber-50/40'
                        }`}
                      >
                        {/* Line 1: Printed Name | Monospace Value + Unit | Printed Range | Chip */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <span className="font-semibold text-xs text-slate-900 tracking-tight">
                              {finding.testName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal ml-2">
                              {finding.simplifiedName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Stated Value + Unit in Monospace */}
                            <div className="font-mono tabular-nums text-xs font-bold text-slate-900">
                              {finding.originalValue}{' '}
                              <span className="text-[11px] text-slate-500 font-normal">
                                {finding.unit}
                              </span>
                            </div>

                            {/* Stated Range (Never truncated) */}
                            <div className="font-mono tabular-nums text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Range: {finding.referenceRange}
                            </div>

                            {/* Above / Below Chip (Icon + Text, never color alone) */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>{isHigh ? 'Above printed range' : 'Below printed range'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Line 2: One-line plain explanation */}
                        <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                          <AnnotatedExplanation text={finding.plainExplanation} />
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-teal-50/60 border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>All values are within the ranges printed on this report.</span>
                </div>
              )}
            </section>

            {/* 2. Summary: 2-3 neutral sentences built only from extracted rows */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Summary
              </h3>
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <p>{report.summary.overview}</p>
              </div>
            </section>

            {/* 3. Consistency & Completeness Verification */}
            <section className="space-y-2 border-t border-slate-100 pt-3">
              {report.extractionCompleteness && report.extractionCompleteness.unresolvedCount > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5 mb-2">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Extraction Completeness Notice</span>
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    {report.extractionCompleteness.unresolvedCount} candidate line(s) could not be resolved into valid measurement format and were skipped.
                  </p>
                  <div className="pt-1 border-t border-amber-200/60 font-mono text-[10px] space-y-0.5 text-amber-900">
                    {report.extractionCompleteness.unresolvedItems.slice(0, 3).map((item, i) => (
                      <div key={i} className="truncate">
                        • {item.line} <span className="opacity-70">({item.reason})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsConsistencyExpanded(!isConsistencyExpanded)}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      {report.factualConsistency.metrics?.statusDetails ||
                        `${report.findings.length}/${report.findings.length} extracted values found verbatim in source`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {report.extractionCompleteness
                        ? `Completeness: ${report.extractionCompleteness.successfullyParsed}/${report.extractionCompleteness.sourceMeasurementsIdentified} measurements parsed (${report.extractionCompleteness.coveragePercentage}% coverage)`
                        : `${report.findings.length} findings parsed from document`}
                    </span>
                  </div>
                </div>
                {isConsistencyExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isConsistencyExpanded && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                  {report.factualConsistency.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          check.status === 'pass'
                            ? 'text-teal-700'
                            : check.status === 'warning'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      />
                      <div>
                        <strong className="text-slate-800">{check.title}:</strong>{' '}
                        <span className="text-slate-600">{check.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ALL RESULTS (Two-line rows, NOT 6-column table!)              */}
        {/* =================================================================== */}
        {activeTab === 'results' && (
          <div className="space-y-5 animate-in fade-in duration-100">
            {categories.map((category) => {
              const categoryFindings = filteredFindings.filter((f) => f.category === category);
              if (categoryFindings.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  {/* Thin Sticky Section Subheader */}
                  <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs py-1 px-1 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {category}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {categoryFindings.length} tests
                    </span>
                  </div>

                  {/* Two-Line Rows */}
                  <div className="divide-y divide-slate-100">
                    {categoryFindings.map((finding) => {
                      const isHovered = finding.id === hoveredFindingId;
                      const isSelected = finding.id === selectedFindingId;
                      const isHigh = finding.flag === 'HIGH';
                      const isLow = finding.flag === 'LOW';
                      const isOutOfRange = isHigh || isLow;
                      const isEditing = editingId === finding.id;

                      // Check verbatim presence in source text
                      const valInRaw = rawLower.includes(finding.originalValue.toLowerCase());
                      const unitInRaw = finding.unit === '' || rawLower.includes(finding.unit.toLowerCase());
                      const isUnverified = !finding.userModified && (!valInRaw || !unitInRaw);

                      if (isEditing) {
                        return (
                          <div
                            key={finding.id}
                            className="p-3 bg-teal-50/40 rounded-lg border border-teal-300 my-1 space-y-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Test name"
                                className="text-xs px-2 py-1 bg-white border border-slate-300 rounded font-medium"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  placeholder="Value"
                                  className="w-16 text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded tabular-nums"
                                />
                                <input
                                  type="text"
                                  value={editUnit}
                                  onChange={(e) => setEditUnit(e.target.value)}
                                  placeholder="Unit"
                                  className="w-14 text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded"
                                />
                              </div>
                              <input
                                type="text"
                                value={editRange}
                                onChange={(e) => setEditRange(e.target.value)}
                                placeholder="Reference range"
                                className="text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded"
                              />
                            </div>

                            <textarea
                              rows={2}
                              value={editExplanation}
                              onChange={(e) => setEditExplanation(e.target.value)}
                              placeholder="Plain-language explanation..."
                              className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded"
                            />

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(finding)}
                                className="px-3 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-medium cursor-pointer"
                              >
                                Save correction
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={finding.id}
                          onMouseEnter={() => onHoverFinding(finding.id)}
                          onMouseLeave={() => onHoverFinding(null)}
                          onClick={() => onSelectFinding(finding.id)}
                          className={`p-3 transition-colors cursor-pointer rounded-lg my-0.5 ${
                            isHovered || isSelected
                              ? 'bg-teal-50 border border-teal-700 shadow-xs'
                              : isOutOfRange
                              ? 'bg-amber-50/25 hover:bg-amber-50/50'
                              : 'hover:bg-slate-50'
                          } ${
                            isUnverified || finding.lowConfidence
                              ? 'border-2 border-dashed border-amber-300'
                              : 'border border-transparent'
                          }`}
                        >
                          {/* Line 1: test name | value + unit | printed range | inline range bar | flag chip | pencil */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            {/* Left: Test name + status chips */}
                            <div className="flex items-center gap-2 flex-wrap min-w-[200px] flex-1">
                              <span className="font-semibold text-xs text-slate-900 tracking-tight">
                                {finding.testName}
                              </span>

                              {(isUnverified || finding.lowConfidence) && (
                                <span className="text-[10px] font-mono text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded font-semibold">
                                  Check this value
                                </span>
                              )}

                              {finding.userModified && (
                                <span
                                  title={`Original value: ${finding.originalExtractedValue} ${finding.originalExtractedUnit}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded"
                                >
                                  Corrected by you
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRevertFinding(finding.id);
                                    }}
                                    title="Revert to originally extracted value"
                                    className="text-slate-400 hover:text-slate-700 cursor-pointer ml-0.5"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              )}
                            </div>

                            {/* Right: Value, Range, Gauge, Flag, Pencil */}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Stated value + unit */}
                              <div className="font-mono tabular-nums text-xs font-bold text-slate-900 min-w-[65px] text-right">
                                {finding.originalValue}{' '}
                                <span className="text-[11px] font-normal text-slate-500">
                                  {finding.unit}
                                </span>
                              </div>

                              {/* Printed Range: wrap instead of clipping */}
                              <div className="font-mono tabular-nums text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 max-w-[150px] text-center">
                                {finding.referenceRange}
                              </div>

                              {/* Inline Range Bar (~100px) */}
                              <div className="w-[100px] hidden sm:block">
                                <CompactRangeBar
                                  numericValue={finding.numericValue}
                                  low={finding.rangeLow}
                                  high={finding.rangeHigh}
                                  flag={finding.flag}
                                  referenceRange={finding.referenceRange}
                                />
                              </div>

                              {/* Flag Chip */}
                              <div className="min-w-[70px]">
                                {isOutOfRange ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                    <span>{isHigh ? 'Above' : 'Below'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                    <span>Normal</span>
                                  </span>
                                )}
                              </div>

                              {/* Pencil Edit Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(finding);
                                }}
                                title="Edit extraction"
                                className="p-1 text-slate-400 hover:text-teal-800 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Line 2: plain-language explanation, muted, 1-2 sentences with definition tooltips */}
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed pl-0.5">
                            <AnnotatedExplanation text={finding.plainExplanation} />
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Inline Add Row Draft */}
            {isAddingRow ? (
              <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-400 space-y-2">
                <div className="text-xs font-semibold text-slate-900">Add Missing Lab Row</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newRowName}
                    onChange={(e) => setNewRowName(e.target.value)}
                    placeholder="Test name (e.g. Magnesium)"
                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded font-medium"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newRowValue}
                      onChange={(e) => setNewRowValue(e.target.value)}
                      placeholder="Value"
                      className="w-16 text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={newRowUnit}
                      onChange={(e) => setNewRowUnit(e.target.value)}
                      placeholder="Unit"
                      className="w-14 text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <input
                    type="text"
                    value={newRowRange}
                    onChange={(e) => setNewRowRange(e.target.value)}
                    placeholder="Reference range (e.g. 1.7 - 2.2 mg/dL)"
                    className="text-xs font-mono px-2 py-1 bg-white border border-slate-300 rounded"
                  />
                </div>
                <input
                  type="text"
                  value={newRowExplanation}
                  onChange={(e) => setNewRowExplanation(e.target.value)}
                  placeholder="What this test measures in general terms..."
                  className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsAddingRow(false)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewRow}
                    className="px-3 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Add row
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRow(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-teal-800 hover:text-teal-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add missing row</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: QUESTIONS                                                   */}
        {/* =================================================================== */}
        {activeTab === 'questions' && (
          <div className="space-y-4 animate-in fade-in duration-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Questions to Ask Your Clinician
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Neutral questions referencing values printed on this report:
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyQuestions}
                className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
              >
                {copiedQuestions ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-700" />
                    <span className="text-teal-800 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy questions</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {report.clinicianQuestions.map((question, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed flex items-start gap-2.5 transition-colors"
                >
                  <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-100/80 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="font-medium text-slate-800">{question}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
