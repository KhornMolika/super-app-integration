'use client';

import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import { settingsApi } from '@/api';

export interface ArtifactRetentionPolicy {
  enabled: boolean;
  scheduleType: 'recurring' | 'specific_datetime';
  scheduleTime: string; // "02:00"
  frequency: 'daily' | 'weekly';
  weeklyDay: number; // 0 = Sunday
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

export function ArtifactRetentionCard() {
  const [policy, setPolicy] = useState<ArtifactRetentionPolicy>({
    enabled: true,
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
  });

  const [stats, setStats] = useState<StorageOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pruneResult, setPruneResult] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getRetentionConfig();
      if (data?.policy) setPolicy(data.policy);
      if (data?.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to load artifact retention settings:', err);
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
      const data = await settingsApi.updateRetentionPolicy(policy);
      if (data?.success) {
        if (data.policy) setPolicy(data.policy);
        if (data.stats) setStats(data.stats);
        toast.success('Artifact retention policy & schedule saved successfully!', 'Policy Saved');
      } else {
        toast.error(data?.message || 'Failed to save retention policy.', 'Save Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error saving retention policy.', 'Network Error');
    } finally {
      setSaving(false);
    }
  };

  const handleExecutePruning = async () => {
    setShowConfirmModal(false);
    setPruning(true);
    try {
      const data = await settingsApi.runRetentionJob(false);
      if (data?.success) {
        setPruneResult(data);
        await fetchData();
        toast.success(
          `Pruning complete! Freed ${data.freedMb} (${data.prunedCount} test builds removed). Official releases remain protected.`,
          'Storage Pruned',
        );
      } else {
        toast.error(data?.message || 'Failed to execute storage pruning.', 'Pruning Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error during storage pruning.', 'Network Error');
    } finally {
      setPruning(false);
    }
  };

  const formatDateTime = (str: string | null) => {
    if (!str) return 'Never / Not scheduled';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return 'Never / Not scheduled';
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

  const toLocalDatetimeString = (isoString: string | null): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const fromLocalDatetimeString = (localString: string): string | null => {
    if (!localString) return null;
    const d = new Date(localString);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Nexus Artifact Storage &amp; Scheduled APK Deletion
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Super Admin
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically prune old CI/CD test build APKs and temporary snapshots while permanently protecting official production releases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pruning}
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800 shadow-sm transition-all"
          >
            {pruning ? (
              <>
                <svg className="w-4 h-4 animate-spin text-rose-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Pruning Storage...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Run Pruning Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Storage Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase">Test Build Storage</span>
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
            </svg>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats ? `${stats.nexusTestBuildsSizeMb} MB` : '...'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>{stats?.nexusTestBuildsCount || 0} candidate debug builds</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="font-bold uppercase">Official Releases (Protected)</span>
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {stats ? `${stats.nexusReleasesSizeMb} MB` : '...'}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{stats?.nexusReleasesCount || 0} locked releases (Never deleted)</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase">Estimated Prunable</span>
            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
            </svg>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats ? `${stats.estimatedPrunableMb} MB` : '...'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {stats?.estimatedPrunableCount || 0} stale test APKs eligible
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase">Next Execution</span>
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {formatDateTime(stats?.nextScheduledRun || null)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Last: {formatDateTime(policy.lastRunAt || null)}
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSavePolicy} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Scheduled Date & Time Configuration */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Automated Cleanup Schedule</span>
              </h4>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.enabled}
                  onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Schedule Mode Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Schedule Execution Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPolicy({ ...policy, scheduleType: 'recurring' })}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    policy.scheduleType === 'recurring'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Recurring Schedule</span>
                  </div>
                  <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Daily or weekly at set time
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPolicy({ ...policy, scheduleType: 'specific_datetime' })}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                    policy.scheduleType === 'specific_datetime'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Specific Date &amp; Time</span>
                  </div>
                  <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Target calendar date/time
                  </div>
                </button>
              </div>

              {/* Recurring Mode Details */}
              {policy.scheduleType === 'recurring' ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Execution Time (24h):
                    </label>
                    <input
                      type="time"
                      value={policy.scheduleTime}
                      onChange={(e) => setPolicy({ ...policy, scheduleTime: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Frequency:
                    </label>
                    <select
                      value={policy.frequency}
                      onChange={(e) => setPolicy({ ...policy, frequency: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="daily">Daily (Every Day)</option>
                      <option value="weekly">Weekly (Every Sunday)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Target Execution Date &amp; Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalDatetimeString(policy.specificRunDateTime)}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        specificRunDateTime: fromLocalDatetimeString(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Dual-Rule Retention Policy & Thresholds */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Dual-Rule Safety Engine</span>
            </h4>

            {/* Rule 1 */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Rule 1: Retain Last Recent Builds</span>
                  <span className="text-emerald-600 font-extrabold">({policy.maxTestBuildsPerApp} Builds)</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Always Protected</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={policy.maxTestBuildsPerApp}
                onChange={(e) => setPolicy({ ...policy, maxTestBuildsPerApp: Number(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Guarantees that at least the <strong>last {policy.maxTestBuildsPerApp} test builds</strong> are never deleted, ensuring you always have active binaries to test.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Rule 2: Age Cutoff Threshold</span>
                  <span className="text-amber-600 font-extrabold">({policy.retentionDays} Days)</span>
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Older Pruned</span>
              </div>
              <input
                type="range"
                min={3}
                max={60}
                step={1}
                value={policy.retentionDays}
                onChange={(e) => setPolicy({ ...policy, retentionDays: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Any builds exceeding the last {policy.maxTestBuildsPerApp} builds that are older than <strong>{policy.retentionDays} days</strong> will be permanently pruned.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Target Clean Scopes & Safety Lock */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Target Scopes &amp; Protection Boundaries:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={policy.pruneSuperAppTestBuilds}
                onChange={(e) => setPolicy({ ...policy, pruneSuperAppTestBuilds: e.target.checked })}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200">apk-test-builds</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Super App debug APKs</div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={policy.pruneMiniAppArtifacts}
                onChange={(e) => setPolicy({ ...policy, pruneMiniAppArtifacts: e.target.checked })}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200">Stale Mini App Snapshots</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Intermediate upload zips</div>
              </div>
            </label>

            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-xs">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">apk-releases (Protected)</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Locked &amp; never auto-deleted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Toolbar */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Nexus repository security &amp; owner RBAC active</span>
          </span>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Saving Schedule...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Schedule &amp; Retention Policy</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="text-center">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Run Immediate Storage Pruning?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  This will immediately evaluate the Nexus repository <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">apk-test-builds</code>, protect the <strong>last {policy.maxTestBuildsPerApp} builds</strong> per app, and remove older test binaries.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span><strong>Safety Guarantee:</strong> All official releases in <code className="font-mono font-bold">apk-releases</code> are permanently protected.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePruning}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
              >
                Confirm &amp; Prune Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtifactRetentionCard;

