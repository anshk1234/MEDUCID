'use client';

import React, { useState, useEffect } from 'react';
import { SimplifiedReport, MedicalFinding } from '@/types/report';
import { auditFactualConsistency } from '@/lib/consistencyChecker';
import { formatStrictSummary, generateStrictNeutralQuestions } from '@/lib/simplificationEngine';
import { saveUserSession, loadUserSession, clearUserSession } from '@/lib/sessionState';

import { LandingScreen } from '@/components/LandingScreen';
import { ProcessingStepper, ProcessingStep } from '@/components/ProcessingStepper';
import { SplitScreenWorkspace } from '@/components/SplitScreenWorkspace';
import { ReportTrackerDashboard } from '@/components/ReportTrackerDashboard';
import { DashboardHome } from '@/components/DashboardHome';
import { ShowcaseWebsite } from '@/components/ShowcaseWebsite';
import { ClarisChatbot } from '@/components/ClarisChatbot';
import { FileText, LineChart, LayoutDashboard, Globe } from 'lucide-react';

export default function MeducidApp() {
  // Dashboard View: 'showcase' | 'dashboard' | 'simplifier' | 'tracker'
  const [dashboardView, setDashboardView] = useState<'showcase' | 'dashboard' | 'simplifier' | 'tracker'>('showcase');

  // App Stage: 'landing' | 'processing' | 'workspace'
  const [stage, setStage] = useState<'landing' | 'processing' | 'workspace'>('landing');

  // Active Report & File Information (Isolated to this user session)
  const [currentReport, setCurrentReport] = useState<SimplifiedReport | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    fileName: string;
    fileType: string;
    previewUrl?: string;
    fileBase64?: string;
  } | undefined>(undefined);

  // Stepper state
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('reading');
  const [processingFileName, setProcessingFileName] = useState<string>('');
  const [processingErrorMessage, setProcessingErrorMessage] = useState<string | undefined>(undefined);

  // Restore isolated session state on mount (ensures page reload retains workspace)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'tracker') {
        setDashboardView('tracker');
      }
    }
    const saved = loadUserSession();
    if (saved && saved.report) {
      setCurrentReport(saved.report);
      setFileInfo(saved.fileInfo);
      setStage('workspace');
    }
  }, []);

  // Start File Processing Workflow
  const handleStartProcessing = (fileName: string) => {
    setDashboardView('simplifier');
    setProcessingFileName(fileName);
    setProcessingStep('reading');
    setProcessingErrorMessage(undefined);
    setStage('processing');

    // Progression of stepper
    setTimeout(() => {
      setProcessingStep('extracting');
    }, 400);

    setTimeout(() => {
      setProcessingStep('verifying');
    }, 800);
  };

  // Report Successfully Loaded
  const handleReportLoaded = (
    report: SimplifiedReport,
    info?: { fileName: string; fileType: string; previewUrl?: string; fileBase64?: string }
  ) => {
    setCurrentReport(report);
    setFileInfo(info);
    saveUserSession(report, info, 'workspace');
    setProcessingStep('complete');
    setTimeout(() => {
      setStage('workspace');
    }, 200);
  };

  // Processing Error
  const handleProcessingError = (errorMsg: string) => {
    setProcessingErrorMessage(errorMsg);
    setProcessingStep('error');
  };

  // Reset to Landing (New Report / Clear Data)
  const handleResetSession = () => {
    clearUserSession();
    setCurrentReport(null);
    setFileInfo(undefined);
    setStage('landing');
  };

  // Save Inline Edit from Workspace
  const handleSaveFinding = (updatedFinding: MedicalFinding) => {
    if (!currentReport) return;

    const updatedFindings = currentReport.findings.map((f) =>
      f.id === updatedFinding.id ? updatedFinding : f
    );

    const summary = formatStrictSummary(updatedFindings);
    const clinicianQuestions = generateStrictNeutralQuestions(updatedFindings);

    const updatedReport: SimplifiedReport = {
      ...currentReport,
      findings: updatedFindings,
      summary,
      clinicianQuestions,
    };
    updatedReport.factualConsistency = auditFactualConsistency(updatedReport);

    setCurrentReport(updatedReport);
    saveUserSession(updatedReport, fileInfo, 'workspace');
  };

  // Revert Finding to Original Extracted Value
  const handleRevertFinding = (findingId: string) => {
    if (!currentReport) return;

    const updatedFindings = currentReport.findings.map((f) => {
      if (f.id === findingId) {
        return {
          ...f,
          originalValue: f.originalExtractedValue || f.originalValue,
          unit: f.originalExtractedUnit || f.unit,
          referenceRange: f.originalExtractedRange || f.referenceRange,
          userModified: false,
        };
      }
      return f;
    });

    const summary = formatStrictSummary(updatedFindings);
    const clinicianQuestions = generateStrictNeutralQuestions(updatedFindings);

    const updatedReport: SimplifiedReport = {
      ...currentReport,
      findings: updatedFindings,
      summary,
      clinicianQuestions,
    };
    updatedReport.factualConsistency = auditFactualConsistency(updatedReport);

    setCurrentReport(updatedReport);
    saveUserSession(updatedReport, fileInfo, 'workspace');
  };

  // Add Missing Row to Current Report
  const handleAddRow = (newFinding: MedicalFinding) => {
    if (!currentReport) return;

    const updatedFindings = [...currentReport.findings, newFinding];
    const summary = formatStrictSummary(updatedFindings);
    const clinicianQuestions = generateStrictNeutralQuestions(updatedFindings);

    const updatedReport: SimplifiedReport = {
      ...currentReport,
      findings: updatedFindings,
      summary,
      clinicianQuestions,
    };
    updatedReport.factualConsistency = auditFactualConsistency(updatedReport);

    setCurrentReport(updatedReport);
    saveUserSession(updatedReport, fileInfo, 'workspace');
  };

  return (
    <div className={`${dashboardView === 'showcase' ? 'min-h-screen w-full' : 'h-screen w-screen overflow-hidden flex flex-col'} bg-paper text-ink font-sans antialiased`}>
      {/* Warm Clinical Editorial Navigation Bar (Shown on app dashboard, simplifier, & tracker) */}
      {dashboardView !== 'showcase' && (
        <header className="h-16 border-t-[3px] border-teal border-b border-black/10 bg-paper/95 backdrop-blur-md shrink-0 select-none z-30">
          <div className="max-w-[1180px] h-full mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button 
                onClick={() => setDashboardView('dashboard')}
                className="flex items-center text-left group cursor-pointer"
                aria-label="MEDUCID Home"
              >
                <img 
                  src="/meducid-logo.png" 
                  alt="MEDUCID" 
                  className="h-8 w-auto object-contain" 
                />
              </button>

              <div className="h-4 w-px bg-black/10 hidden sm:block" />

              {/* Segmented View Switcher */}
              <nav className="flex items-center p-1 bg-[#eeede6] rounded-xl border border-black/15 shadow-xs" aria-label="Dashboard navigation">
                <button
                  onClick={() => setDashboardView('showcase')}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] text-xs font-bold text-muted hover:text-ink hover:bg-paper transition-all cursor-pointer"
                  title="Return to Showcase Website"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Website</span>
                </button>

                <button
                  onClick={() => setDashboardView('dashboard')}
                  className={`flex items-center gap-2 h-9 px-3.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                    dashboardView === 'dashboard'
                      ? 'bg-lime text-ink shadow-[0_2px_0_rgba(0,0,0,0.1)] border-2 border-ink'
                      : 'text-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setDashboardView('simplifier')}
                  className={`flex items-center gap-2 h-9 px-3.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                    dashboardView === 'simplifier'
                      ? 'bg-lime text-ink shadow-[0_2px_0_rgba(0,0,0,0.1)] border-2 border-ink'
                      : 'text-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Report Simplifier</span>
                </button>

                <button
                  onClick={() => setDashboardView('tracker')}
                  className={`flex items-center gap-2 h-9 px-3.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                    dashboardView === 'tracker'
                      ? 'bg-lime text-ink shadow-[0_2px_0_rgba(0,0,0,0.1)] border-2 border-ink'
                      : 'text-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Report Tracker</span>
                  <span className="text-[9px] font-mono tracking-[0.05em] px-1.5 py-0.5 rounded-full bg-ink text-lime border border-ink">
                    PHASE 2
                  </span>
                </button>
              </nav>
            </div>

            {/* Right-side status: Isolated session badge */}
            <div className="flex items-center gap-2 text-xs font-mono tracking-[0.05em] uppercase text-[#3d5d04] bg-[#e7f8b9] border border-[#6a8e0c]/35 px-3 py-1.5 rounded-full font-bold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d5d04]" />
              <span className="hidden sm:inline">Session Isolated</span>
            </div>
          </div>
        </header>
      )}

      {/* VIEW 0: Showcase Website (Opens First) */}
      {dashboardView === 'showcase' && (
        <ShowcaseWebsite onOpenDashboard={() => setDashboardView('dashboard')} />
      )}

      {/* VIEW 1: Dashboard Home (App Landing Hub) */}
      {dashboardView === 'dashboard' && (
        <DashboardHome
          currentReport={currentReport}
          fileInfo={fileInfo}
          onNavigateToSimplifier={() => setDashboardView('simplifier')}
          onNavigateToTracker={() => setDashboardView('tracker')}
          onStartProcessing={handleStartProcessing}
          onReportLoaded={handleReportLoaded}
          onProcessingError={handleProcessingError}
        />
      )}

      {/* VIEW 2: Report Tracker (Phase 2 Minimal Dashboard) */}
      {dashboardView === 'tracker' && (
        <ReportTrackerDashboard onSwitchToSimplifier={() => setDashboardView('simplifier')} />
      )}

      {/* VIEW 3: Report Simplifier (Core Unchanged Workflow) */}
      {dashboardView === 'simplifier' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* STAGE 1: Upload-Only Landing Screen (app start) */}
          {stage === 'landing' && (
            <LandingScreen
              onStartProcessing={handleStartProcessing}
              onReportLoaded={handleReportLoaded}
              onProcessingError={handleProcessingError}
            />
          )}

          {/* PROCESSING STATE: Stepper between landing and results */}
          {stage === 'processing' && (
            <ProcessingStepper
              currentStep={processingStep}
              fileName={processingFileName}
              errorMessage={processingErrorMessage}
              onRetry={() => setStage('landing')}
              onPasteInstead={() => setStage('landing')}
            />
          )}

          {/* STAGE 2: Split-Screen Workspace (left: original, right: simplified results) */}
          {stage === 'workspace' && currentReport && (
            <SplitScreenWorkspace
              report={currentReport}
              fileInfo={fileInfo}
              onNewReport={handleResetSession}
              onClearData={handleResetSession}
              onSaveFinding={handleSaveFinding}
              onRevertFinding={handleRevertFinding}
              onAddRow={handleAddRow}
            />
          )}
        </div>
      )}
      {/* Floating Retractable Medical Terminology Assistant */}
      <ClarisChatbot
        reportContext={
          currentReport
            ? `Report with ${currentReport.findings.length} findings: ${currentReport.findings.slice(0, 10).map((f) => f.testName + ': ' + f.originalValue + ' ' + (f.unit || '')).join(', ')}`
            : undefined
        }
      />
    </div>
  );
}
