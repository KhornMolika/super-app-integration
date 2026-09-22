'use client';

import React, { useState, useEffect } from 'react';
import { superAppApi } from '@/api';
import { toast } from '@/components/ui/Toast';
import {
  DotBadge,
  DevicePhoneIcon,
  ZapIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';

export interface SuperAppReleaseCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBaseVersion?: string;
  defaultTargetVersion?: string;
}

export function SuperAppReleaseCompareModal({
  isOpen,
  onClose,
  defaultBaseVersion,
  defaultTargetVersion,
}: SuperAppReleaseCompareModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [baseVersion, setBaseVersion] = useState<string>(defaultBaseVersion || 'v0.0.2');
  const [targetVersion, setTargetVersion] = useState<string>(defaultTargetVersion || 'v0.0.3');
  const [diffData, setDiffData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'MINI_APPS' | 'CAPABILITIES' | 'ARTIFACTS'>('MINI_APPS');

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistoryAndDiff = async () => {
      setLoading(true);
      try {
        const historyData = await superAppApi.getReleaseHistory();
        setHistory(historyData || []);

        const initialBase =
          defaultBaseVersion ||
          historyData.find((r: any) => r.type === 'LIVE_OFFICIAL')?.version ||
          'v0.0.2';
        const initialTarget =
          defaultTargetVersion ||
          historyData.find((r: any) => r.type === 'CANDIDATE_ASSEMBLY')?.version ||
          'v0.0.3';

        setBaseVersion(initialBase);
        setTargetVersion(initialTarget);

        const diffResult = await superAppApi.compareReleases(initialBase, initialTarget);
        setDiffData(diffResult);
      } catch (err: any) {
        console.error('Failed to fetch release comparison:', err);
        toast.error('Unable to compute Super App release diff', 'Comparison Error');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryAndDiff();
  }, [isOpen, defaultBaseVersion, defaultTargetVersion]);

  const handleCompare = async (newBase: string, newTarget: string) => {
    setLoading(true);
    try {
      const diffResult = await superAppApi.compareReleases(newBase, newTarget);
      setDiffData(diffResult);
    } catch (err: any) {
      toast.error('Failed to compare selected Super App versions', 'Diff Error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderBadgeForType = (type: string, isLive?: boolean) => {
    if (isLive || type === 'LIVE_OFFICIAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
          <DotBadge color="emerald" pulse />
          <span>LIVE OFFICIAL BUILD</span>
        </span>
      );
    }
    if (type === 'CANDIDATE_ASSEMBLY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-xs">
          <DotBadge color="purple" />
          <span>CANDIDATE ASSEMBLY</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        <DotBadge color="slate" />
        <span>PREVIOUS VERSION</span>
      </span>
    );
  };

  const upgradedApps = diffData?.miniAppsDiff?.upgraded || [];
  const addedApps = diffData?.miniAppsDiff?.added || [];
  const removedApps = diffData?.miniAppsDiff?.removed || [];
  const unchangedApps = diffData?.miniAppsDiff?.unchanged || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  Super App Release Comparator (SA vs SA)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                  Gate 2 Ecosystem Manifest
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compare bundled Mini App updates, native platform bridges, and Nexus binary digests between Super App builds.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Release Version Selector Bar */}
        <div className="px-6 py-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Base Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Base Release:</span>
              </span>
              <select
                value={baseVersion}
                onChange={(e) => {
                  setBaseVersion(e.target.value);
                  handleCompare(e.target.value, targetVersion);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none shadow-xs"
              >
                {history.map((r) => (
                  <option key={`base-${r.version}`} value={r.version}>
                    {r.isLive ? '[Live] ' : r.type === 'CANDIDATE_ASSEMBLY' ? '[Candidate] ' : '[Prev] '}
                    {r.version} ({r.isLive ? 'Live Official' : r.type === 'CANDIDATE_ASSEMBLY' ? 'Candidate Build' : 'Previous Version'})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-400 font-extrabold text-xs px-1 uppercase tracking-wider">vs</span>

            {/* Target Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Target Release:</span>
              </span>
              <select
                value={targetVersion}
                onChange={(e) => {
                  setTargetVersion(e.target.value);
                  handleCompare(baseVersion, e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none shadow-xs"
              >
                {history.map((r) => (
                  <option key={`target-${r.version}`} value={r.version}>
                    {r.isLive ? '[Live] ' : r.type === 'CANDIDATE_ASSEMBLY' ? '[Candidate] ' : '[Prev] '}
                    {r.version} ({r.isLive ? 'Live Official' : r.type === 'CANDIDATE_ASSEMBLY' ? 'Candidate Build' : 'Previous Version'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Tab Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80">
            {[
              { id: 'MINI_APPS', label: 'Bundled Mini Apps', icon: <DevicePhoneIcon className="w-3.5 h-3.5" />, count: upgradedApps.length + addedApps.length },
              { id: 'CAPABILITIES', label: 'Capabilities & Bridges', icon: <ZapIcon className="w-3.5 h-3.5" />, count: diffData?.capabilitiesDiff?.added?.length || 0 },
              { id: 'ARTIFACTS', label: 'Nexus APK Integrity', icon: <ShieldCheckIcon className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-semibold text-slate-500">Comparing Super App releases...</span>
            </div>
          ) : (
            <>
              {/* Release Side-by-Side Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Base Card */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    {renderBadgeForType(diffData?.baseRelease?.type, diffData?.baseRelease?.isLive)}
                    <span className="text-xs text-slate-400 font-mono">
                      {diffData?.baseRelease?.assembledAt ? new Date(diffData.baseRelease.assembledAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                      {diffData?.baseRelease?.version}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Mode: <strong className="text-slate-700 dark:text-slate-300 uppercase">{diffData?.baseRelease?.buildMode || 'release'}</strong> • Size: <strong>{diffData?.baseRelease?.apkSize || '89.4 MB'}</strong>
                    </p>
                  </div>
                </div>

                {/* Target Card */}
                <div className="p-5 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/40 via-white to-purple-50/10 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    {renderBadgeForType(diffData?.targetRelease?.type, diffData?.targetRelease?.isLive)}
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                      {diffData?.targetRelease?.assembledAt ? new Date(diffData.targetRelease.assembledAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-purple-900 dark:text-purple-200 font-mono">
                      {diffData?.targetRelease?.version}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Mode: <strong className="text-purple-700 dark:text-purple-300 uppercase">{diffData?.targetRelease?.buildMode || 'debug'}</strong> • Size: <strong>{diffData?.targetRelease?.apkSize || '92.8 MB'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab 1: Bundled Mini Apps Diff */}
              {activeTab === 'MINI_APPS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>Bundled Mini Apps Lifecycle Differences</span>
                    </h4>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <span>Base: {diffData?.miniAppsDiff?.totalBaseApps || 0} Apps</span>
                      <ArrowRightIcon className="w-3 h-3 text-slate-400" />
                      <span>Target: {diffData?.miniAppsDiff?.totalTargetApps || 0} Apps</span>
                    </span>
                  </div>

                  {/* 1. Upgraded Mini Apps */}
                  {upgradedApps.length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                        <span>Upgraded Mini Apps ({upgradedApps.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {upgradedApps.map((app: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{app.name}</span>
                              <div className="font-mono text-[11px] text-slate-400">{app.packageName}</div>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono font-bold">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{app.baseVersion}</span>
                              <ArrowRightIcon className="w-3 h-3 text-indigo-500" />
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">{app.targetVersion}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Newly Added Mini Apps */}
                  {addedApps.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <SparklesIcon className="w-4 h-4 text-emerald-600" />
                        <span>Newly Added to Super App ({addedApps.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {addedApps.map((app: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{app.name}</span>
                              <div className="font-mono text-[11px] text-slate-400">{app.packageName || app.id}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                              v{app.version}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Unchanged Apps */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Unchanged Bundled Mini Apps ({unchangedApps.length})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                      {unchangedApps.map((app: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{app.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{app.version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Capabilities & Bridges */}
              {activeTab === 'CAPABILITIES' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Super App Native Platform Capabilities</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Base ({diffData?.baseRelease?.version}) Capabilities</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {diffData?.baseRelease?.capabilities?.map((c: string) => (
                          <span key={c} className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Target ({diffData?.targetRelease?.version}) Capabilities</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {diffData?.targetRelease?.capabilities?.map((c: string) => (
                          <span key={c} className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 uppercase">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Artifacts & Checksums */}
              {activeTab === 'ARTIFACTS' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Nexus Registry Binary Signatures</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Base Release Digest ({diffData?.baseRelease?.version})</span>
                        <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          <span>Gate 2 Verified</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all border border-slate-200 dark:border-slate-700">
                        {diffData?.baseRelease?.integrityDigest}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-900 dark:text-purple-300">Target Release Digest ({diffData?.targetRelease?.version})</span>
                        <span className="font-mono text-purple-600 font-bold flex items-center gap-1">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          <span>Candidate Signed</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl font-mono text-[11px] text-purple-800 dark:text-purple-300 break-all border border-purple-200 dark:border-purple-700">
                        {diffData?.targetRelease?.integrityDigest}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Comparing <strong className="text-slate-700 dark:text-slate-300">{baseVersion}</strong> with <strong className="text-indigo-600 dark:text-indigo-400">{targetVersion}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-sm"
          >
            Close Comparator
          </button>
        </div>
      </div>
    </div>
  );
}
