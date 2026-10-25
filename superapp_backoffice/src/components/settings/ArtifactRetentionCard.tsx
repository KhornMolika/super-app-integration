'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from '@/components/ui/Toast';
import { settingsApi } from '@/api';

export interface ArtifactRetentionPolicy {
  enabled: boolean;
  scheduleType: 'recurring' | 'specific_datetime';
  scheduleTime: string;
  frequency: 'daily' | 'weekly';
  weeklyDay: number;
  specificRunDateTime: string | null;
  retentionDays: number; // e.g. 14
  maxTestBuildsPerApp: number; // e.g. 3
  pruneSuperAppTestBuilds: boolean;
  pruneMiniAppArtifacts: boolean;
  lastRunAt?: string | null;
  lastFreedBytes?: number;
  lastPrunedCount?: number;
}

export interface StorageOverviewStats {
  nexusTestBuildsCount: number;
  nexusTestBuildsSizeMb: number;
  nexusReleasesCount: number;
  nexusReleasesSizeMb: number;
  protectedReleaseCount: number;
  estimatedPrunableMb: number;
  estimatedPrunableCount: number;
  lastRunAt: string | null;
  lastFreedBytes: number;
  nextScheduledRun: string | null;
}

const DEFAULT_POLICY: ArtifactRetentionPolicy = {
  enabled: false,
  scheduleType: 'recurring',
  scheduleTime: '02:00',
  frequency: 'daily',
  weeklyDay: 0,
  specificRunDateTime: null,
  retentionDays: 14,
  maxTestBuildsPerApp: 3,
  pruneSuperAppTestBuilds: true,
  pruneMiniAppArtifacts: true,
  lastRunAt: null,
  lastFreedBytes: 0,
  lastPrunedCount: 0,
};

const DEFAULT_STATS: StorageOverviewStats = {
  nexusTestBuildsCount: 0,
  nexusTestBuildsSizeMb: 0,
  nexusReleasesCount: 0,
  nexusReleasesSizeMb: 0,
  protectedReleaseCount: 0,
  estimatedPrunableMb: 0,
  estimatedPrunableCount: 0,
  lastRunAt: null,
  lastFreedBytes: 0,
  nextScheduledRun: null,
};

export function ArtifactRetentionCard() {
  const [policy, setPolicy] = useState<ArtifactRetentionPolicy>(DEFAULT_POLICY);
  const [savedPolicy, setSavedPolicy] = useState<ArtifactRetentionPolicy>(DEFAULT_POLICY);
  const [stats, setStats] = useState<StorageOverviewStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pruneResult, setPruneResult] = useState<any | null>(null);

  // Track whether form has unsaved modifications
  const isDirty = useMemo(() => {
    return JSON.stringify(policy) !== JSON.stringify(savedPolicy);
  }, [policy, savedPolicy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getRetentionConfig();
      const payload = (res as any)?.data ?? res;
      if (payload?.policy) {
        const cleanPolicy = { ...DEFAULT_POLICY, ...payload.policy };
        setPolicy(cleanPolicy);
        setSavedPolicy(cleanPolicy);
      }
      if (payload?.stats) {
        setStats((prev) => ({ ...prev, ...payload.stats }));
      }
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.warn('Artifact retention fetch warning:', err?.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePolicy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.updateRetentionPolicy(policy);
      const payload = (res as any)?.data ?? res;
      if (res?.success || payload?.success) {
        const updatedPolicy = payload?.policy || policy;
        setPolicy(updatedPolicy);
        setSavedPolicy(updatedPolicy);
        if (payload?.stats) setStats((prev) => ({ ...prev, ...payload.stats }));
        toast.success('Retention policy saved to database successfully!', 'Policy Stored');
      } else {
        toast.error(payload?.message || res?.message || 'Failed to save retention policy.', 'Save Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error saving retention policy.', 'Network Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPolicy(savedPolicy);
    toast.info('Reverted changes to last saved policy configuration.');
  };

  const handleExecutePruning = async () => {
    setShowConfirmModal(false);
    setPruning(true);
    try {
      const res = await settingsApi.runRetentionJob(false);
      const payload = (res as any)?.data ?? res;
      if (res?.success || payload?.success) {
        setPruneResult(payload);
        await fetchData();
        toast.success(
          `Pruning complete! Freed ${payload.freedMb || '0 MB'} (${payload.prunedCount || 0} test builds removed). Official releases remain protected.`,
          'Storage Pruned',
        );
      } else {
        toast.error(payload?.message || res?.message || 'Failed to execute storage pruning.', 'Pruning Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error during storage pruning.', 'Network Error');
    } finally {
      setPruning(false);
    }
  };

  const formatDateTime = (str: string | null | undefined) => {
    if (!str) return 'Never executed';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return 'Never executed';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return str;
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${Math.round(mb * 10) / 10} MB`;
    return `${Math.round((mb / 1024) * 10) / 10} GB`;
  };

  // Live estimated prunable calculation based on current slider values
  const dynamicEstimated = useMemo(() => {
    if (!stats || stats.nexusTestBuildsCount === 0) {
      return { count: 0, sizeMb: 0 };
    }
    const excess = Math.max(0, stats.nexusTestBuildsCount - policy.maxTestBuildsPerApp);
    const avgPerBuildMb = stats.nexusTestBuildsSizeMb / stats.nexusTestBuildsCount;
    const estimatedMb = Math.round(excess * avgPerBuildMb * 10) / 10;
    return {
      count: excess,
      sizeMb: estimatedMb,
    };
  }, [stats, policy.maxTestBuildsPerApp]);

  // Sliders fill percentage calculations
  const rule1Pct = useMemo(() => {
    return Math.max(0, Math.min(100, ((policy.maxTestBuildsPerApp - 1) / (10 - 1)) * 100));
  }, [policy.maxTestBuildsPerApp]);

  const rule2Pct = useMemo(() => {
    return Math.max(0, Math.min(100, ((policy.retentionDays - 3) / (60 - 3)) * 100));
  }, [policy.retentionDays]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Nexus Artifact Storage &amp; APK Retention Policy
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Define retention thresholds for CI/CD test build APKs and execute on-demand storage pruning with guaranteed protection for official releases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            title="Refresh Storage Metrics"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            type="button"
            disabled={pruning}
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 border border-rose-200/80 dark:border-rose-800 shadow-xs hover:shadow transition-all cursor-pointer"
          >
            {pruning ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-rose-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Pruning Storage...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Run Pruning Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pruning Result Notification (if recently executed) */}
      {pruneResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200">
                Storage Pruning Completed Successfully
              </div>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
                Reclaimed <strong>{pruneResult.freedMb || formatBytes(pruneResult.freedBytes)}</strong> across <strong>{pruneResult.prunedCount || 0} candidate test builds</strong>. All official releases in <code className="font-mono text-[11px] bg-emerald-500/20 px-1 py-0.5 rounded">apk-releases</code> were preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPruneResult(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 p-1 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Storage Overview Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Test Build Storage */}
        <div className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Test Build Storage
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {stats.nexusTestBuildsSizeMb > 0 ? `${stats.nexusTestBuildsSizeMb} MB` : '0 MB'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span>{stats.nexusTestBuildsCount} candidate debug builds</span>
            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full border border-brand-200/60 dark:border-brand-800/60">
              Nexus
            </span>
          </div>
        </div>

        {/* Metric 2: Official Releases */}
        <div className="group relative p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Official Releases
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
            {stats.nexusReleasesSizeMb > 0 ? `${stats.nexusReleasesSizeMb} MB` : '0 MB'}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{stats.nexusReleasesCount} locked releases</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              Permanent
            </span>
          </div>
        </div>

        {/* Metric 3: Estimated Prunable */}
        <div className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Estimated Prunable
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {dynamicEstimated.sizeMb} MB
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span>{dynamicEstimated.count} builds exceed quota</span>
            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-800/60">
              Reclaimable
            </span>
          </div>
        </div>

        {/* Metric 4: Last Storage Pruning */}
        <div className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
              Last Storage Pruning
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {formatDateTime(policy.lastRunAt || stats.lastRunAt)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span className="truncate">Freed: {formatBytes(policy.lastFreedBytes || stats.lastFreedBytes)}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {policy.lastPrunedCount || 0} builds
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSavePolicy} className="space-y-6">
        {/* Dual-Rule Safety Engine Card (Spans Full Width with 2-Column Rules Grid) */}
        <div className="p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Dual-Rule Safety Engine
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Two-layer protection algorithm to evaluate test packages and prevent accidental loss of active builds.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800">
              Guaranteed Safe
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Rule 1: Retain Recent Builds */}
            <div className="p-5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Rule 1: Retain Recent Builds per App</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      {policy.maxTestBuildsPerApp} Builds
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Guarantees the last <strong>{policy.maxTestBuildsPerApp} test builds</strong> per app are never deleted.
                  </p>
                </div>
              </div>

              {/* Slider with Smooth Dynamically Filled Gradient Track */}
              <div className="space-y-2 pt-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={policy.maxTestBuildsPerApp}
                  onChange={(e) => setPolicy({ ...policy, maxTestBuildsPerApp: Number(e.target.value) })}
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${rule1Pct}%, #334155 ${rule1Pct}%, #334155 100%)`,
                  }}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 shadow-inner"
                />
              </div>

              {/* Accurately Placed Quick Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { val: 1, label: '1 Build (Aggressive)' },
                  { val: 3, label: '3 Builds (Default)' },
                  { val: 5, label: '5 Builds (Recommended)' },
                  { val: 10, label: '10 Builds (Conservative)' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setPolicy({ ...policy, maxTestBuildsPerApp: item.val })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border text-center transition-all cursor-pointer ${
                      policy.maxTestBuildsPerApp === item.val
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule 2: Age Cutoff Threshold */}
            <div className="p-5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Rule 2: Age Cutoff Threshold</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                      {policy.retentionDays} Days
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Builds exceeding the threshold older than <strong>{policy.retentionDays} days</strong> will be permanently pruned.
                  </p>
                </div>
              </div>

              {/* Slider with Smooth Dynamically Filled Gradient Track */}
              <div className="space-y-2 pt-2">
                <input
                  type="range"
                  min={3}
                  max={60}
                  step={1}
                  value={policy.retentionDays}
                  onChange={(e) => setPolicy({ ...policy, retentionDays: Number(e.target.value) })}
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${rule2Pct}%, #334155 ${rule2Pct}%, #334155 100%)`,
                  }}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-amber-500 shadow-inner"
                />
              </div>

              {/* Accurately Placed Quick Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { val: 7, label: '7 Days' },
                  { val: 14, label: '14 Days' },
                  { val: 30, label: '30 Days (Standard)' },
                  { val: 60, label: '60 Days (Extended)' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setPolicy({ ...policy, retentionDays: item.val })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border text-center transition-all cursor-pointer ${
                      policy.retentionDays === item.val
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Target Clean Scopes & Protection Boundaries */}
        <div className="p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Target Scopes &amp; Protection Boundaries
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specify which repository targets are subject to cleanup. Official production releases are permanently exempt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Target 1: apk-test-builds */}
            <div
              onClick={() =>
                setPolicy({ ...policy, pruneSuperAppTestBuilds: !policy.pruneSuperAppTestBuilds })
              }
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                policy.pruneSuperAppTestBuilds
                  ? 'border-brand-500/80 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 opacity-70'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                policy.pruneSuperAppTestBuilds
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}>
                {policy.pruneSuperAppTestBuilds && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                    apk-test-builds
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    policy.pruneSuperAppTestBuilds
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {policy.pruneSuperAppTestBuilds ? 'ACTIVE TARGET' : 'EXCLUDED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  SuperApp CI/CD debug APKs and test binaries generated from Git push builds.
                </p>
              </div>
            </div>

            {/* Target 2: Stale MiniApp Snapshots */}
            <div
              onClick={() =>
                setPolicy({ ...policy, pruneMiniAppArtifacts: !policy.pruneMiniAppArtifacts })
              }
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                policy.pruneMiniAppArtifacts
                  ? 'border-brand-500/80 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 opacity-70'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                policy.pruneMiniAppArtifacts
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}>
                {policy.pruneMiniAppArtifacts && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                    Stale MiniApp Snapshots
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    policy.pruneMiniAppArtifacts
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {policy.pruneMiniAppArtifacts ? 'ACTIVE TARGET' : 'EXCLUDED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Intermediate upload zips and expired temporary package snapshots.
                </p>
              </div>
            </div>

            {/* Target 3: apk-releases (Protected) */}
            <div className="p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-xs flex items-start gap-3.5">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 font-mono">
                    apk-releases
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 px-1.5 py-0.2 rounded uppercase">
                    Immune
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  Official signed production releases are cryptographically anchored and never pruned.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Toolbar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Nexus repository security &amp; Super Admin RBAC validation active</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Discard Changes
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                isDirty
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
              }`}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Storing in Database...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{isDirty ? 'Save Changes to Database' : 'Save Retention Policy'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-7 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Execute Storage Pruning Now?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  This will evaluate all assets in the Nexus repository <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">apk-test-builds</code> and permanently remove test packages that exceed your retention rules.
                </p>
              </div>

              {/* Safety Evaluation Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Recent Build Quota</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Keep Latest {policy.maxTestBuildsPerApp} Builds / App</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Age Expiration Cutoff</span>
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">Older than {policy.retentionDays} Days</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>Production Releases</span>
                  </span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">100% Protected (Never Pruned)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Dual-Rule Safety Engine will ensure that active releases and the latest test build iterations are never impacted.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePruning}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm &amp; Prune Storage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtifactRetentionCard;
