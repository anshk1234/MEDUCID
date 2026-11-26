'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  FileText, 
  ArrowRight, 
  Clock, 
  Layers,
  LogOut,
  User,
  Sparkles,
  CheckCircle2,
  Lock,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { SYNTHETIC_BENCHMARKS } from '@/data/syntheticReports';
import { BiomarkerTrendChart } from './BiomarkerTrendChart';

interface ReportTrackerDashboardProps {
  onSwitchToSimplifier: () => void;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface HistoricalReport {
  id: string;
  date: string;
  title: string;
  category: string;
  totalTests: number;
  outOfRangeCount: number;
  status: string;
}

interface TrendMetric {
  name: string;
  unit: string;
  range: string;
  rangeLow?: number | null;
  rangeHigh?: number | null;
  points: { date: string; value: number; flag: 'NORMAL' | 'HIGH' | 'LOW' }[];
  description: string;
}

export function ReportTrackerDashboard({ onSwitchToSimplifier }: ReportTrackerDashboardProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [reports, setReports] = useState<HistoricalReport[]>([]);
  const [trends, setTrends] = useState<TrendMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check auth session cookie on mount
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        await loadUserData();
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Session check error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const applyTrends = (loadedTrends: TrendMetric[]) => {
    setTrends(loadedTrends);
    if (loadedTrends.length > 0) {
      setSelectedMetric((prev) =>
        loadedTrends.some((t) => t.name === prev) ? prev : loadedTrends[0].name
      );
    } else {
      setSelectedMetric('');
    }
  };

  const loadUserData = async () => {
    setIsLoadingData(true);
    setTrendsError(null);
    try {
      const [repRes, trRes] = await Promise.all([
        fetch('/api/tracker/reports'),
        fetch('/api/tracker/trends'),
      ]);

      if (repRes.ok) {
        const repData = await repRes.json();
        setReports(repData.reports || []);
      }

      if (trRes.ok) {
        const trData = await trRes.json();
        applyTrends(trData.trends || []);
      } else {
        setTrendsError('Failed to load biomarker trajectories. Please try again.');
      }
    } catch (err) {
      console.warn('Error loading D1 data:', err);
      setTrendsError('Failed to load biomarker trajectories. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setReports([]);
      setTrends([]);
      setSelectedMetric('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Seed sample benchmarks into Cloudflare D1
  const handleSeedSampleData = async () => {
    setIsSyncing(true);
    try {
      for (const benchmark of SYNTHETIC_BENCHMARKS) {
        await fetch('/api/tracker/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: benchmark }),
        });
      }
      await loadUserData();
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setDeletingId(reportId);
    try {
      const res = await fetch('/api/tracker/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        const trRes = await fetch('/api/tracker/trends');
        if (trRes.ok) {
          const trData = await trRes.json();
          setTrendsError(null);
          applyTrends(trData.trends || []);
        } else {
          setTrendsError('Failed to refresh biomarker trajectories. Please try again.');
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const activeMetric = trends.find((m) => m.name === selectedMetric) || trends[0] || null;

  // 1. Loading State (SaaS Skeleton)
  if (isLoadingAuth) {
    return (
      <div className="flex-1 overflow-y-auto bg-paper py-10 px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto space-y-8 animate-pulse">
          {/* User Header Skeleton */}
          <div className="bg-cream border-2 border-ink/10 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e2e0d8]" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-[#e2e0d8]" />
                <div className="h-3 w-56 rounded bg-[#eeede6]" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 rounded-xl bg-[#eeede6]" />
              <div className="h-10 w-44 rounded-xl bg-[#e2e0d8]" />
            </div>
          </div>

          {/* 2 Metric Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-cream p-6 rounded-2xl border-2 border-ink/10 space-y-3">
                <div className="h-3 w-32 rounded bg-[#e2e0d8]" />
                <div className="h-8 w-16 rounded bg-[#e2e0d8]" />
                <div className="h-3 w-40 rounded bg-[#eeede6]" />
              </div>
            ))}
          </div>

          {/* Biomarker Trajectory Card Skeleton */}
          <div className="bg-cream rounded-2xl border-2 border-ink/10 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
              <div className="space-y-2">
                <div className="h-6 w-64 rounded bg-[#e2e0d8]" />
                <div className="h-3 w-80 rounded bg-[#eeede6]" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-24 rounded-lg bg-[#e2e0d8]" />
                <div className="h-8 w-20 rounded-lg bg-[#eeede6]" />
                <div className="h-8 w-28 rounded-lg bg-[#eeede6]" />
              </div>
            </div>

            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div className="h-5 w-40 rounded bg-[#d7d6cf]" />
                <div className="h-6 w-32 rounded bg-[#d7d6cf]" />
              </div>
              <div className="h-56 w-full rounded-xl bg-cream border border-ink/10" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((c) => (
                  <div key={c} className="bg-cream p-5 rounded-xl border border-ink/10 space-y-3">
                    <div className="h-3 w-24 rounded bg-[#e2e0d8]" />
                    <div className="h-7 w-28 rounded bg-[#e2e0d8]" />
                    <div className="h-3 w-36 rounded bg-[#eeede6]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (Requires Google Login for Tracker)
  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#FAF9F6] py-16 px-4 sm:px-6 select-none">
        <div className="max-w-[720px] mx-auto space-y-8">
          
          <div className="bg-cream border-2 border-ink/15 rounded-2xl p-8 sm:p-10 shadow-[0_5px_0_rgba(20,20,20,.05)] text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-lime border-2 border-ink mx-auto flex items-center justify-center text-ink shadow-[0_4px_0_rgba(0,0,0,.1)]">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-ink bg-lime border border-ink px-3 py-1 rounded-full font-black">
                Cloudflare D1 Edge Database
              </span>
              <h2 className="font-serif text-3xl font-bold tracking-[-0.02em] text-ink pt-1">
                Sign in to access your Report Tracker
              </h2>
              <p className="font-sans text-sm text-muted max-w-lg mx-auto leading-relaxed">
                Connect your account to securely sync historical laboratory reports and monitor longitudinal biomarker trends across visits with your Cloudflare D1 SQL database.
              </p>
            </div>

            {/* Recessed Ledger of Tracker Capabilities */}
            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-5 text-left space-y-3">
              <div className="flex items-start gap-3 text-xs text-muted">
                <CheckCircle2 className="w-4 h-4 text-[#3d5d04] shrink-0 mt-0.5" />
                <span><strong className="text-ink">Persistent 30-Day Cookie:</strong> Log in once—your session remains active across reloads and returns.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-muted">
                <CheckCircle2 className="w-4 h-4 text-[#3d5d04] shrink-0 mt-0.5" />
                <span><strong className="text-ink">Longitudinal Chronology:</strong> Plot fasting glucose, cholesterol, and blood counts across years of lab checkups.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-muted">
                <CheckCircle2 className="w-4 h-4 text-[#3d5d04] shrink-0 mt-0.5" />
                <span><strong className="text-ink">Isolated Cloudflare D1 Storage:</strong> Zero database blending—records are bound strictly to your user profile.</span>
              </div>
            </div>

            {/* Login Action Area */}
            <div className="space-y-4 pt-2">
              <button
                onClick={handleGoogleLogin}
                className="cta-shadow w-full h-12 rounded-xl border-2 border-ink bg-lime hover:bg-[#d5ff57] text-ink text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {/* Google Multi-color G Icon */}
                <svg className="w-4 h-4 bg-white rounded-full p-0.5 border border-ink/20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <button
                onClick={onSwitchToSimplifier}
                className="w-full h-11 rounded-xl bg-paper border border-black/15 text-muted hover:text-ink hover:bg-[#eeede6] text-xs font-bold transition-colors cursor-pointer"
              >
                Return to Report Simplifier (No login required)
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 3. Authenticated State (Displays Live Cloudflare D1 Data)
  return (
    <div className="flex-1 overflow-y-auto bg-paper py-10 px-4 sm:px-6 select-none">
      <div className="max-w-[1100px] mx-auto space-y-10">
        
        {/* User Session Header */}
        <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-lime border-2 border-ink flex items-center justify-center text-ink font-bold text-base shadow-xs shrink-0">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold tracking-[-0.02em] text-ink">
                  {user.name}
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-[#3d5d04] bg-[#e7f8b9] border border-[#6a8e0c]/40 px-2 py-0.5 rounded-full font-bold">
                  Cloudflare D1 Synced
                </span>
              </div>
              <p className="font-mono text-xs text-muted mt-0.5">
                {user.email} · Persistent 30-Day Session Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLogout}
              className="h-10 px-4 rounded-xl bg-paper border border-black/15 text-[#9f2e1c] hover:bg-[#ffe0d8] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={onSwitchToSimplifier}
              className="cta-shadow h-10 px-5 rounded-xl border-2 border-ink bg-lime hover:bg-[#d5ff57] text-ink text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Analyze New Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          <div className="bg-cream p-6 rounded-2xl border-2 border-ink/15 shadow-[0_5px_0_rgba(20,20,20,.05)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.05em] text-muted font-bold">
              <span>Saved Reports</span>
              <FileText className="w-4 h-4 text-muted" />
            </div>
            <div className="font-mono text-3xl font-black text-ink">{reports.length}</div>
            <div className="font-mono text-xs text-muted flex items-center gap-1.5 pt-1">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span>{reports.length > 0 ? `${reports.length} panels archived` : 'No reports synced yet'}</span>
            </div>
          </div>

          <div className="bg-cream p-6 rounded-2xl border-2 border-ink/15 shadow-[0_5px_0_rgba(20,20,20,.05)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.05em] text-muted font-bold">
              <span>Tracked Biomarkers</span>
              <LineChart className="w-4 h-4 text-teal" />
            </div>
            <div className="font-mono text-3xl font-black text-teal">{trends.length}</div>
            <div className="font-mono text-xs text-teal font-bold pt-1">
              {trends.length} active trajectory curves
            </div>
          </div>

        </div>

        {/* If no reports in database yet, show Quick Seed Banner */}
        {reports.length === 0 && (
          <div className="bg-cream border-2 border-ink/15 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_rgba(20,20,20,.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-serif text-base font-bold text-ink tracking-[-0.02em]">
                Your Cloudflare D1 Database is Ready
              </h3>
              <p className="font-sans text-xs text-muted">
                Populate your database with 3 sample chronological patient visits (CMP, CBC, Lipids) to test live queries immediately.
              </p>
            </div>

            <button
              onClick={handleSeedSampleData}
              disabled={isSyncing}
              className="cta-shadow h-10 px-5 rounded-xl border-2 border-ink bg-lime hover:bg-[#d5ff57] disabled:opacity-50 text-ink text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Writing to D1...' : 'Sync Sample Visits to D1'}</span>
            </button>
          </div>
        )}

        {/* Longitudinal Trajectory Section */}
        <div className="bg-cream rounded-2xl border-2 border-ink/15 p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-ink tracking-[-0.02em] flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-lime border border-ink flex items-center justify-center text-ink">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Biomarker Trajectory Over Time</span>
              </h3>
              <p className="font-sans text-xs text-muted mt-1">
                Select a biomarker to inspect historical measurements against printed reference intervals.
              </p>
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex items-center p-1 bg-[#eeede6] rounded-xl border border-black/15 flex-wrap max-w-full gap-1">
              {trends.slice(0, 6).map((m) => (
                <button
                  key={m.name}
                  onClick={() => setSelectedMetric(m.name)}
                  className={`h-8 px-3 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                    selectedMetric === m.name
                      ? 'bg-lime text-ink shadow-xs border-2 border-ink'
                      : 'text-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Biomarker Recessed Visualizer */}
          {isLoadingData && trends.length === 0 ? (
            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-6 space-y-6 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-5 w-40 rounded bg-[#d7d6cf]" />
                <div className="h-6 w-32 rounded bg-[#d7d6cf]" />
              </div>
              <div className="h-56 w-full rounded-xl bg-cream border border-ink/10" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((c) => (
                  <div key={c} className="bg-cream p-5 rounded-xl border border-ink/10 space-y-3">
                    <div className="h-3 w-24 rounded bg-[#e2e0d8]" />
                    <div className="h-7 w-28 rounded bg-[#e2e0d8]" />
                    <div className="h-3 w-36 rounded bg-[#eeede6]" />
                  </div>
                ))}
              </div>
            </div>
          ) : trendsError ? (
            <div className="bg-[#ffe0d8]/60 border border-[#ff593e]/30 rounded-xl p-8 text-center space-y-3">
              <p className="text-xs font-mono text-[#9f2e1c] font-bold">{trendsError}</p>
              <button
                onClick={loadUserData}
                className="h-9 px-4 rounded-lg border-2 border-ink bg-cream hover:bg-[#eeede6] text-ink text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : !activeMetric ? (
            <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-8 text-center text-xs font-mono text-muted">
              No biomarker trajectories recorded yet. Analyze and save a report, or sync sample visits above.
            </div>
          ) : (
          <div className="bg-[#eeede6] border border-[#d7d6cf] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg font-bold text-ink tracking-[-0.02em]">
                    {activeMetric.name}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    ({activeMetric.unit})
                  </span>
                </div>
                <p className="font-sans text-xs text-muted mt-0.5">{activeMetric.description}</p>
              </div>

              {activeMetric.points && activeMetric.points.length > 0 && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs uppercase tracking-[0.05em] text-muted font-bold">Latest Result:</span>
                  <span className="font-mono text-xl font-black text-ink">
                    {activeMetric.points[activeMetric.points.length - 1].value} {activeMetric.unit}
                  </span>
                </div>
              )}
            </div>

            {/* Line Graph with Upper & Lower Reference Limits */}
            <BiomarkerTrendChart
              name={activeMetric.name}
              unit={activeMetric.unit}
              range={activeMetric.range}
              rangeLow={activeMetric.rangeLow}
              rangeHigh={activeMetric.rangeHigh}
              points={activeMetric.points || []}
            />

            {/* Visual Step Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {activeMetric.points && activeMetric.points.map((pt, idx) => {
                const isLatest = idx === activeMetric.points.length - 1;
                const isNormal = pt.flag === 'NORMAL';
                return (
                  <div
                    key={`${pt.date}-${idx}`}
                    className={`bg-cream p-5 rounded-xl border-2 transition-all ${
                      isLatest
                        ? 'border-ink shadow-sm ring-2 ring-lime/40'
                        : 'border-ink/15'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs text-muted mb-2">
                      <span>{pt.date}</span>
                      {isLatest && (
                        <span className="text-[10px] font-mono uppercase tracking-[0.05em] font-bold text-ink bg-lime border border-ink px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="font-mono text-2xl font-black text-ink">
                        {pt.value}
                        <span className="font-sans text-xs text-muted ml-1">{activeMetric.unit}</span>
                      </div>

                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isNormal
                            ? 'bg-[#e7f8b9] text-[#3d5d04] border border-[#6a8e0c]/30'
                            : 'bg-[#ffe0d8] text-[#9f2e1c] border border-[#ff593e]/30'
                        }`}
                      >
                        {isNormal ? 'Within Range' : 'Outside Range'}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-black/10 font-mono text-xs text-muted flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      <span>Printed Range: {activeMetric.range || 'Closed interval'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* Historical Uploaded Reports Table */}
        <div className="bg-cream rounded-2xl border-2 border-ink/15 p-6 sm:p-8 shadow-[0_5px_0_rgba(20,20,20,.05)] space-y-4">
          <div className="border-b border-black/10 pb-3">
            <h3 className="font-serif text-xl font-bold text-ink tracking-[-0.02em]">
              Archived Reports ({reports.length})
            </h3>
            <p className="font-sans text-xs text-muted mt-0.5">
              Historical clinical reports cataloged in your Cloudflare D1 account.
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted font-mono">
              No reports stored in Cloudflare D1 yet. Use the button above to seed sample visits or analyze a report in the simplifier!
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#eeede6]/50 p-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-lime border border-ink flex items-center justify-center text-ink shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-sans text-sm font-bold text-ink">{r.title}</h4>
                      <p className="font-mono text-xs text-muted mt-0.5">
                        {r.date} · {r.category} · {r.totalTests} measurements
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full ${
                        r.outOfRangeCount > 0
                          ? 'bg-[#ffe0d8] text-[#9f2e1c] border border-[#ff593e]/30'
                          : 'bg-[#e7f8b9] text-[#3d5d04] border border-[#6a8e0c]/30'
                      }`}
                    >
                      {r.outOfRangeCount > 0 ? `${r.outOfRangeCount} outside range` : 'All within range'}
                    </span>

                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      disabled={deletingId === r.id}
                      title="Delete from database"
                      className="p-2 text-muted hover:text-[#9f2e1c] hover:bg-[#ffe0d8] rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
