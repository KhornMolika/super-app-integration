"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { superAppApi } from '@/api';
import { toast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/inputs';
import {
  DotBadge,
  DevicePhoneIcon,
  ZapIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@/components/ui/Icons';

function ReleaseCompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlBase = searchParams.get('base') || '';
  const urlTarget = searchParams.get('target') || '';

  const [history, setHistory] = useState<any[]>([]);
  const [baseVersion, setBaseVersion] = useState<string>(urlBase || 'v0.0.1');
  const [targetVersion, setTargetVersion] = useState<string>(urlTarget || 'v0.0.3');
  const [diffData, setDiffData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'MINI_APPS' | 'CAPABILITIES' | 'ARTIFACTS'>('MINI_APPS');

  useEffect(() => {
    const fetchHistoryAndDiff = async () => {
      setLoading(true);
      try {
        const historyData = await superAppApi.getReleaseHistory();
        setHistory(historyData || []);

        const initialBase =
          urlBase ||
          historyData.find((r: any) => r.type === 'LIVE_OFFICIAL')?.version ||
          'v0.0.1';
        const initialTarget =
          urlTarget ||
          historyData.find((r: any) => r.type === 'CANDIDATE_ASSEMBLY')?.version ||
          'v0.0.3';

        setBaseVersion(initialBase);
        setTargetVersion(initialTarget);

        const diffResult = await superAppApi.compareReleases(initialBase, initialTarget);
        setDiffData(diffResult);
      } catch (err: any) {
        console.error('Failed to fetch release comparison:', err);
        toast.error('Unable to compute SuperApp release diff', 'Comparison Error');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryAndDiff();
  }, [urlBase, urlTarget]);

  const handleCompare = async (newBase: string, newTarget: string) => {
    setLoading(true);
    setBaseVersion(newBase);
    setTargetVersion(newTarget);
    router.replace(`/releases/compare?base=${encodeURIComponent(newBase)}&target=${encodeURIComponent(newTarget)}`);

    try {
      const diffResult = await superAppApi.compareReleases(newBase, newTarget);
      setDiffData(diffResult);
    } catch (err: any) {
      toast.error('Failed to compare selected SuperApp versions', 'Diff Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    handleCompare(targetVersion, baseVersion);
  };

  const renderBadgeForType = (type: string, isLive?: boolean) => {
    if (isLive || type === 'LIVE_OFFICIAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
          <DotBadge color="bg-emerald-500 animate-pulse" />
          <span>OFFICIAL PRODUCTION RELEASE</span>
        </span>
      );
    }
    if (type === 'CANDIDATE_ASSEMBLY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-300 border border-accent-300 dark:border-accent-800 shadow-2xs">
          <DotBadge color="bg-accent-500" />
          <span>CANDIDATE STAGING ASSEMBLY</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        <DotBadge color="bg-slate-400" />
        <span>PREVIOUS ARCHIVED VERSION</span>
      </span>
    );
  };

  const upgradedApps = diffData?.miniAppsDiff?.upgraded || [];
  const addedApps = diffData?.miniAppsDiff?.added || [];
  const removedApps = diffData?.miniAppsDiff?.removed || [];
  const unchangedApps = diffData?.miniAppsDiff?.unchanged || [];

  return (
    <div className="w-full min-w-0 space-y-6 animate-fade-in pb-16">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/releases"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Releases</span>
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                SuperApp Release Comparator
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                Gate 2 Ecosystem Manifest
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Side-by-side audit of bundled MiniApp versions, native capabilities, and Sonatype Nexus APK signatures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Comparing <strong className="text-slate-700 dark:text-slate-300">{baseVersion}</strong> ➔ <strong className="text-accent-600 dark:text-accent-400">{targetVersion}</strong>
          </span>
        </div>
      </div>

      {/* Sticky Version Selector & Tab Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Version Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Base Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Base Build:</span>
            </span>
            <div className="w-60">
              <Select
                value={baseVersion}
                onChange={(e) => handleCompare(e.target.value, targetVersion)}
                className="!py-1.5 !px-3 text-xs font-bold"
              >
                {history.map((r) => (
                  <option key={`base-${r.version}`} value={r.version}>
                    {r.isLive ? '[Live] ' : r.type === 'CANDIDATE_ASSEMBLY' ? '[Candidate] ' : '[Prev] '}
                    {r.version} ({r.isLive ? 'Live Official' : r.type === 'CANDIDATE_ASSEMBLY' ? 'Candidate Build' : 'Previous Version'})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Base and Target"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* Target Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-500 inline-block" />
              <span>Target Build:</span>
            </span>
            <div className="w-60">
              <Select
                value={targetVersion}
                onChange={(e) => handleCompare(baseVersion, e.target.value)}
                className="!py-1.5 !px-3 text-xs font-bold"
              >
                {history.map((r) => (
                  <option key={`target-${r.version}`} value={r.version}>
                    {r.isLive ? '[Live] ' : r.type === 'CANDIDATE_ASSEMBLY' ? '[Candidate] ' : '[Prev] '}
                    {r.version} ({r.isLive ? 'Live Official' : r.type === 'CANDIDATE_ASSEMBLY' ? 'Candidate Build' : 'Previous Version'})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
          {[
            {
              id: 'MINI_APPS',
              label: 'Bundled MiniApps',
              icon: <DevicePhoneIcon className="w-3.5 h-3.5" />,
              count: upgradedApps.length + addedApps.length,
            },
            {
              id: 'CAPABILITIES',
              label: 'Capabilities & Bridges',
              icon: <ZapIcon className="w-3.5 h-3.5" />,
              count: diffData?.capabilitiesDiff?.added?.length || 0,
            },
            {
              id: 'ARTIFACTS',
              label: 'Nexus APK Integrity',
              icon: <ShieldCheckIcon className="w-3.5 h-3.5" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-xs font-mono bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-slate-500">Calculating release manifest differential...</span>
        </div>
      ) : (
        <>
          {/* Release Side-by-Side Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Base Release Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                {renderBadgeForType(diffData?.baseRelease?.type, diffData?.baseRelease?.isLive)}
                <span className="text-xs text-slate-400 font-mono">
                  {diffData?.baseRelease?.assembledAt ? new Date(diffData.baseRelease.assembledAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  {diffData?.baseRelease?.version}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pipeline: <strong className="text-slate-700 dark:text-slate-300 font-mono">{diffData?.baseRelease?.isLive ? 'superapp-release-build' : 'superapp-test-build'}</strong> • Compile Mode: <strong className="uppercase">{diffData?.baseRelease?.buildMode || 'release'}</strong> • Size: <strong>{diffData?.baseRelease?.apkSize || '~25 MB'}</strong>
                </p>
              </div>
            </div>

            {/* Target Release Card */}
            <div className="p-5 rounded-2xl border border-accent-200/80 dark:border-accent-800/60 bg-gradient-to-br from-accent-50/30 via-white to-accent-50/10 dark:from-accent-950/20 dark:via-slate-800 dark:to-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                {renderBadgeForType(diffData?.targetRelease?.type, diffData?.targetRelease?.isLive)}
                <span className="text-xs text-accent-600 dark:text-accent-400 font-mono">
                  {diffData?.targetRelease?.assembledAt ? new Date(diffData.targetRelease.assembledAt).toLocaleString() : 'Active Candidate'}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-accent-900 dark:text-accent-200 font-mono">
                  {diffData?.targetRelease?.version}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pipeline: <strong className="text-accent-700 dark:text-accent-300 font-mono">{diffData?.targetRelease?.isLive ? 'superapp-release-build' : 'superapp-test-build'}</strong> • Compile Mode: <strong className="uppercase">{diffData?.targetRelease?.buildMode || 'debug'}</strong> • Size: <strong>{diffData?.targetRelease?.apkSize || '~28 MB'}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Tab 1: Bundled MiniApps Diff */}
          {activeTab === 'MINI_APPS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <DevicePhoneIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <span>Bundled MiniApps Lifecycle Differences</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span>Base: {diffData?.miniAppsDiff?.totalBaseApps || 0} Apps</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Target: {diffData?.miniAppsDiff?.totalTargetApps || 0} Apps</span>
                </span>
              </div>

              {/* 1. Upgraded MiniApps */}
              {upgradedApps.length > 0 && (
                <div className="p-5 rounded-2xl bg-accent-50/60 dark:bg-accent-950/30 border border-accent-200/80 dark:border-accent-800/60 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-accent-900 dark:text-accent-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                      <span>Upgraded MiniApps in Target Release ({upgradedApps.length})</span>
                    </span>
                    <span className="text-xs font-normal lowercase text-slate-500 dark:text-slate-400">
                      new version manifests included
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {upgradedApps.map((app: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-accent-200/80 dark:border-accent-800 flex items-center justify-between text-xs shadow-2xs">
                        <div className="space-y-0.5">
                          <Link
                            href={`/miniapps/${app.id || app.appId}`}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 transition-colors"
                          >
                            {app.name}
                          </Link>
                          <div className="font-mono text-xs text-slate-400">{app.packageName || app.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 font-mono font-bold">
                            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              v{app.baseVersion}
                            </span>
                            <ArrowRightIcon className="w-3.5 h-3.5 text-accent-500" />
                            <span className="px-2.5 py-1 rounded bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200">
                              v{app.targetVersion}
                            </span>
                          </div>
                          {app.id && (
                            <Link
                              href={`/miniapps/${app.id}?tab=versions`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"
                              title="Inspect version diff"
                            >
                              <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Newly Added MiniApps */}
              {addedApps.length > 0 && (
                <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <SparklesIcon className="w-4 h-4 text-emerald-600" />
                      <span>Newly Added to SuperApp ({addedApps.length})</span>
                    </span>
                    <span className="text-xs font-normal lowercase text-slate-500 dark:text-slate-400">
                      brand new integration
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {addedApps.map((app: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between text-xs shadow-2xs">
                        <div className="space-y-0.5">
                          <Link
                            href={`/miniapps/${app.id || app.appId}`}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 transition-colors"
                          >
                            {app.name}
                          </Link>
                          <div className="font-mono text-xs text-slate-400">{app.packageName || app.id}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          v{app.version}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Removed MiniApps */}
              {removedApps.length > 0 && (
                <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                    Removed / Delisted from SuperApp ({removedApps.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {removedApps.map((app: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{app.name}</span>
                          <div className="font-mono text-xs text-slate-400">{app.packageName || app.id}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          v{app.version}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Unchanged Apps */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Unchanged Bundled MiniApps ({unchangedApps.length})</span>
                  <span className="text-xs font-normal lowercase">identical bytecode digests</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  {unchangedApps.map((app: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{app.name}</span>
                      <span className="font-mono text-xs text-slate-400 font-semibold">{app.version}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Capabilities & Bridges */}
          {activeTab === 'CAPABILITIES' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ZapIcon className="w-5 h-5 text-amber-500" />
                  <span>SuperApp Native Platform Capabilities & Hardware Bridges</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Base ({diffData?.baseRelease?.version}) Capabilities</span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {diffData?.baseRelease?.capabilities?.length || 0} active
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {diffData?.baseRelease?.capabilities?.map((c: string) => (
                      <span key={c} className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase shadow-2xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-accent-200 dark:border-accent-800 bg-accent-50/20 dark:bg-accent-950/20 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent-700 dark:text-accent-300 uppercase">Target ({diffData?.targetRelease?.version}) Capabilities</span>
                    <span className="text-xs font-mono font-bold text-accent-600 dark:text-accent-400">
                      {diffData?.targetRelease?.capabilities?.length || 0} active
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {diffData?.targetRelease?.capabilities?.map((c: string) => (
                      <span key={c} className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-accent-300 dark:border-accent-700 text-accent-800 dark:text-accent-200 uppercase shadow-2xs">
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
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
                  <span>Sonatype Nexus Registry Binary Signatures & Integrity</span>
                </h3>
              </div>

              <div className="space-y-4">
                {/* Base Digest Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Base Release Digest ({diffData?.baseRelease?.version})
                    </span>
                    <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>Gate 2 Verified Digest</span>
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-mono text-xs text-slate-600 dark:text-slate-300 break-all border border-slate-200 dark:border-slate-700">
                    {diffData?.baseRelease?.integrityDigest || 'SHA256: 4e82b79a10cf7b941094dae3d2319fbc7e63b65d1d6110f014e03108c35a8bc3'}
                  </div>
                </div>

                {/* Target Digest Card */}
                <div className="p-5 rounded-2xl bg-accent-50/30 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-800 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-accent-900 dark:text-accent-300">
                      Target Release Digest ({diffData?.targetRelease?.version})
                    </span>
                    <span className="font-mono text-accent-600 font-bold flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>Candidate Signed Digest</span>
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl font-mono text-xs text-accent-800 dark:text-accent-300 break-all border border-accent-200 dark:border-accent-700">
                    {diffData?.targetRelease?.integrityDigest || 'SHA256: 1c8488f88885ed79b6d93a414a76525eb3146e671e054a7023fbc1b1dacdfb1b'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReleaseComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      }
    >
      <ReleaseCompareContent />
    </Suspense>
  );
}
