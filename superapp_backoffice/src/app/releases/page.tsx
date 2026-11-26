"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { superAppApi, miniappsApi, MiniApp } from '@/api';
import { SuperAppReleaseCompareModal } from '@/components/releases/SuperAppReleaseCompareModal';
import { SuperAppRebuildPanel } from '@/components/releases/SuperAppRebuildPanel';
import { useAuth } from '@/lib/auth';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import { ShieldIcon, DevicePhoneIcon, CheckIcon, SparklesIcon, ArrowRightIcon, DotBadge } from '@/components/ui/Icons';
import {
  AppStatusBadge,
  VersionStageBadge,
  appStatusOf,
  versionStageOf,
} from '@/components/miniapp-detail/MiniAppStatusBadges';

export default function ReleasesPage() {
  // Rebuilding the Super App is super_app:manage: Super Admin only
  const { hasRole } = useAuth();
  const isPlatformAdmin = hasRole('SUPER_ADMIN');
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [releaseVersion, setReleaseVersion] = useState('v0.0.3');
  const [isAssembling, setIsAssembling] = useState(false);
  const [gate2Result, setGate2Result] = useState<any>(null);
  const [releaseBuildStages, setReleaseBuildStages] = useState<Record<string, any> | null>(null);
  const [releaseBuildStatus, setReleaseBuildStatus] = useState<'BUILDING' | 'COMPLETED' | 'FAILED' | null>(null);
  const [releaseBuildError, setReleaseBuildError] = useState<string | null>(null);
  const [attestationOpen, setAttestationOpen] = useState(false);
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [ecosystemStatus, setEcosystemStatus] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [releaseVersionFilter, setReleaseVersionFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const releaseVersionOptions = useMemo(() => {
    const versions = new Set<string>();
    let hasPending = false;
    for (const app of apps) {
      const ver = app.integrationConfig?.superAppReleaseVersion;
      if (ver) {
        versions.add(String(ver));
      } else {
        hasPending = true;
      }
    }
    const sorted = Array.from(versions).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }),
    );
    return [
      { value: 'ALL', label: 'All Versions' },
      ...(hasPending ? [{ value: 'PENDING', label: 'Pending Official Release' }] : []),
      ...sorted.map((v) => ({ value: v, label: v })),
    ];
  }, [apps]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return apps.filter((app) => {
      if (q) {
        const name = (app.name || '').toLowerCase();
        const appId = (app.appId || '').toLowerCase();
        const pkg = (app.integrationConfig?.packageName || '').toLowerCase();
        if (!name.includes(q) && !appId.includes(q) && !pkg.includes(q)) {
          return false;
        }
      }
      if (methodFilter !== 'ALL' && app.integrationMethod !== methodFilter) {
        return false;
      }
      if (releaseVersionFilter !== 'ALL') {
        const saReleaseVer = app.integrationConfig?.superAppReleaseVersion || '';
        if (releaseVersionFilter === 'PENDING') {
          if (saReleaseVer) return false;
        } else if (saReleaseVer !== releaseVersionFilter) {
          return false;
        }
      }
      return true;
    });
  }, [apps, searchQuery, methodFilter, releaseVersionFilter]);

  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  const fetchNextVersion = () => {
    superAppApi.getNextVersion()
      .then(data => {
        const ver = (data as any)?.nextReleaseVersion || data?.nextVersion;
        if (ver) {
          setReleaseVersion(ver);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    superAppApi.getEcosystemStatus()
      .then(data => setEcosystemStatus(data))
      .catch(() => {});
    miniappsApi.getAll({ limit: 100 })
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        // Only Live apps and apps with an Active (approved for release) version stage
        // are eligible for Official SuperApp Release assembly.
        setApps(
          list.filter((app) => {
            const status = appStatusOf(app);
            const stage = versionStageOf(app);
            return status === 'LIVE' || stage === 'ACTIVE';
          }),
        );
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    fetchNextVersion();
  }, []);

  useEffect(() => {
    if (releaseBuildStatus !== 'BUILDING') return;
    const trackedId = gate2Result?.verifiedApps?.[0]?.id;
    if (!trackedId) return;

    const timer = setInterval(async () => {
      try {
        const app = await miniappsApi.getById(trackedId);
        if (app?.buildStages) {
          setReleaseBuildStages(app.buildStages);
        }
        const bStatus = String(app?.buildStatus || '').toUpperCase();
        const publishDone =
          String(app?.buildStages?.publish?.status || '').toUpperCase() === 'COMPLETED';
        if (bStatus === 'COMPLETED' || publishDone) {
          setReleaseBuildStatus('COMPLETED');
          superAppApi.getEcosystemStatus().then(setEcosystemStatus).catch(() => {});
          fetchNextVersion();
        } else if (bStatus === 'FAILED') {
          setReleaseBuildStatus('FAILED');
          setReleaseBuildError((app as any)?.buildError || 'Release build failed in Jenkins.');
        }
      } catch {
        // Ignore transient poll errors while Jenkins is building
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [releaseBuildStatus, gate2Result]);

  const handleRunGate2 = async () => {
    setIsAssembling(true);
    try {
      const payload = {
        releaseVersion,
        miniApps: apps.map(a => ({
          id: a.id,
          name: a.name || 'MiniApp',
          packageName: a.integrationConfig?.packageName || (a.integrationMethod === 'FLUTTER_PACKAGE' ? 'ma_flutter_trust_regulator' : a.integrationMethod === 'DEEP_LINK' ? (a.integrationConfig?.urlScheme || a.appId) : 'webview_package'),
          version: a.version || '0.0.2',
          declaredPermissions: a.permissions || [{ type: 'NFC' }],
        })),
      };

      const data = await superAppApi.verifyReleaseAssembly(payload);
      setGate2Result(data);
      if (data?.buildTriggered) {
        setReleaseBuildStages(data.buildStages || null);
        setReleaseBuildStatus('BUILDING');
        setReleaseBuildError(null);
      } else {
        setReleaseBuildStages(null);
        setReleaseBuildStatus(data?.passed ? 'COMPLETED' : 'FAILED');
      }
      if (data?.success || data?.status === 'ASSEMBLY_STARTED') {
        fetchNextVersion();
      }
    } catch (err) {
      console.error('Failed to run Gate 2 assembly', err);
    } finally {
      setIsAssembling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center mt-32">
        <svg className="animate-spin h-10 w-10 text-brand-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  const officialVer = ecosystemStatus?.officialReleaseVersion || 'v0.0.1';
  const testVer = ecosystemStatus?.superAppVersion || releaseVersion || 'v0.0.1';

  return (
    <div className="w-full min-w-0 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              SuperApp Releases
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Official Assembly
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Verify approved MiniApp packages, validate checksums, and assemble official SuperApp releases.
          </p>
        </div>

        {/* Unified Action Toolbar - Uniform h-10 height, rounded-xl, and aligned */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* 1. Compare Button */}
          <Link
            href={`/releases/compare?base=${encodeURIComponent(officialVer)}&target=${encodeURIComponent(releaseVersion)}`}
            className="h-10 px-3.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-2 shadow-2xs shrink-0 whitespace-nowrap"
            title="Compare official live and target release manifests"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Compare Releases</span>
          </Link>

          {/* 2. Target Version Input Pill */}
          <label className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15 flex items-center gap-2 shrink-0 shadow-2xs transition-all">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              Target Version
            </span>
            <input
              type="text"
              value={releaseVersion}
              onChange={e => setReleaseVersion(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white w-18 outline-none text-center"
              title="Target release version tag"
            />
          </label>

          {/* 3. Verify & Build Release Primary Button */}
          <button
            type="button"
            onClick={handleRunGate2}
            disabled={isAssembling}
            className="h-10 px-4 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 shadow-sm hover:shadow transition-all flex items-center gap-2 shrink-0 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            title="Verify MiniApp checksums/permissions and assemble the SuperApp release build"
          >
            {isAssembling ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Verifying &amp; Building...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Verify &amp; Build Release</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isPlatformAdmin && <SuperAppRebuildPanel />}

      {/* SuperApp Release Classification Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Live SA Official Build */}
        <div className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              <DotBadge color="bg-emerald-500 animate-pulse" />
              <span>OFFICIAL PRODUCTION RELEASE</span>
            </span>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">superapp-release-build</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              {officialVer}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active master build serving end users with approved ACTIVE MiniApps. Compiled via production pipeline.
            </p>
          </div>
          <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status: <strong className="text-emerald-700 dark:text-emerald-400">Live in Production</strong></span>
            <Link
              href={`/releases/compare?base=${encodeURIComponent(officialVer)}&target=${encodeURIComponent(releaseVersion)}`}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Bundle</span>
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Next Official Release Queue */}
        <div className="p-5 rounded-2xl border border-accent-200/80 dark:border-accent-800/60 bg-gradient-to-br from-accent-50/70 via-white to-accent-50/20 dark:from-accent-950/30 dark:via-slate-900 dark:to-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-accent-100 text-accent-800 dark:bg-accent-900/60 dark:text-accent-300">
              <DotBadge color="bg-accent-500" />
              <span>QUEUED FOR NEXT RELEASE</span>
            </span>
            <span className="text-xs font-mono text-accent-700 dark:text-accent-400 font-bold">superapp-release-build</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              {releaseVersion}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Target official release packaging {apps.length} Live &amp; Stage: Active MiniApp(s) for production distribution.
            </p>
          </div>
          <div className="pt-3 border-t border-accent-100 dark:border-accent-900/40 flex items-center justify-between text-xs">
            <span className="text-slate-500">Queue: <strong className="text-accent-700 dark:text-accent-400">{apps.length} MAs Ready</strong></span>
            <Link
              href={`/releases/compare?base=${encodeURIComponent(officialVer)}&target=${encodeURIComponent(releaseVersion)}`}
              className="text-xs font-bold text-accent-700 dark:text-accent-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Compare Diff</span>
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: SA Old Build (Archived) */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-slate-50/30 dark:from-slate-800/40 dark:via-slate-900 dark:to-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <DotBadge color="bg-slate-400" />
              <span>SA OLD BUILD(S)</span>
            </span>
            <span className="text-xs font-mono text-slate-400">Archived History</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              v0.0.1
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Historical baseline release preserved in Nexus registry for regression audit and rollback capability.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Repository: <strong className="text-slate-700 dark:text-slate-300">Nexus S3</strong></span>
            <Link
              href={`/releases/compare?base=v0.0.1&target=${encodeURIComponent(releaseVersion)}`}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View History</span>
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Security Gate 2 Live Audit Card */}
      {gate2Result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-fade-in space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/60 flex items-center justify-center text-accent-600 dark:text-accent-400 font-bold text-lg">
                <ShieldIcon className="w-5 h-5 text-accent-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Release Verification &amp; Official Assembly
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    superapp-release-build
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Target Release: {gate2Result.releaseVersion} • Pipeline: Official Release Build • Timestamp: {gate2Result.timestamp}
                </p>
              </div>
            </div>
            <div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                gate2Result.status === 'PASSED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {gate2Result.status}
              </span>
            </div>
          </div>

          {/* Release Build Steps */}
          {releaseBuildStages && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Jenkins Release Build Steps
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  releaseBuildStatus === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : releaseBuildStatus === 'FAILED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                }`}>
                  {releaseBuildStatus === 'COMPLETED'
                    ? 'Completed'
                    : releaseBuildStatus === 'FAILED'
                      ? 'Failed'
                      : 'Building...'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'preflight', fallbackName: '1. Pre-Flight & Source Checkout' },
                  { id: 'compile', fallbackName: '2. Compile Release APK & AAB' },
                  { id: 'publish', fallbackName: '3. Publish to Nexus (apk-releases)' },
                ].map(({ id, fallbackName }) => {
                  const s = releaseBuildStages?.[id] || {};
                  const st = String(s.status || 'PENDING').toUpperCase();
                  const isDone = st === 'COMPLETED' || st === 'SUCCESS';
                  const isRunning = st === 'RUNNING' || st === 'IN_PROGRESS';
                  const isFailed = st === 'FAILED';
                  return (
                    <div
                      key={id}
                      className={`p-3 rounded-lg border text-xs ${
                        isDone
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30'
                          : isRunning
                            ? 'border-sky-200 dark:border-sky-800/60 bg-sky-50/60 dark:bg-sky-950/30'
                            : isFailed
                              ? 'border-rose-200 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/30'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-slate-800 dark:text-slate-100">
                        <span className="truncate">{s.name || fallbackName}</span>
                        <span className={`shrink-0 text-[10px] font-bold uppercase ${
                          isDone ? 'text-emerald-600' : isRunning ? 'text-sky-600' : isFailed ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {st}
                        </span>
                      </div>
                      {s.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {s.details}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {releaseBuildError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{releaseBuildError}</p>
              )}
            </div>
          )}

          {/* Candidate APK Build Status & Download Button */}
          {gate2Result.apkUrl && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent-500/10 via-brand-500/10 to-emerald-500/10 border border-accent-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-accent-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-sm">
                  <DevicePhoneIcon className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {releaseBuildStatus === 'COMPLETED' ? 'Official Release APK Ready' : 'Official Release APK Building...'}
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                      {gate2Result.releaseVersion || releaseVersion} • apk-releases
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {releaseBuildStatus === 'COMPLETED'
                      ? <>Compiled via <strong>superapp-release-build</strong> and published to Nexus <strong>apk-releases</strong>.</>
                      : <>Building via <strong>superapp-release-build</strong> with verified Live &amp; Stage: Active MiniApps. Download unlocks when Jenkins finishes.</>}
                  </p>
                </div>
              </div>
              {releaseBuildStatus === 'COMPLETED' ? (
                <a
                  href={`/api/download-apk?type=release&version=${encodeURIComponent(gate2Result.releaseVersion || releaseVersion)}&appName=superapp`}
                  download={`superapp-${gate2Result.releaseVersion || releaseVersion}-release.apk`}
                  className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>Download Release APK</span>
                </a>
              ) : (
                <span className="w-full sm:w-auto px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                  <span>{releaseBuildStatus === 'FAILED' ? 'Build Failed' : 'Building in Jenkins...'}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Approved MiniApps List Table with Clear Version Badging */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Bundled MiniApp Candidates for Assembly</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved MiniApps eligible to be bundled into SuperApp candidate release {releaseVersion}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {filteredApps.filter((a) => appStatusOf(a) === 'LIVE' || versionStageOf(a) === 'ACTIVE').length} Active (Release Ready)
              </span>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                {filteredApps.filter((a) => appStatusOf(a) !== 'LIVE' && versionStageOf(a) !== 'ACTIVE').length} In Staging
              </span>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {filteredApps.length} Total Queued
              </span>
            </div>
          </div>

          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search by MiniApp name, appId, or package..."
            filters={[
              {
                id: 'method',
                label: 'Method',
                value: methodFilter,
                onChange: (val) => {
                  setMethodFilter(val);
                  setCurrentPage(1);
                },
                options: [
                  { value: 'ALL', label: 'All Methods' },
                  { value: 'WEBVIEW', label: 'WebView' },
                  { value: 'FLUTTER_PACKAGE', label: 'Flutter Package' },
                  { value: 'NATIVE_SDK', label: 'Native SDK' },
                  { value: 'DEEP_LINK', label: 'Deep Link' },
                ],
                dropdownWidth: 'w-52',
                align: 'right',
              },
              {
                id: 'releaseVersion',
                label: 'Release Version',
                value: releaseVersionFilter,
                onChange: (val) => {
                  setReleaseVersionFilter(val);
                  setCurrentPage(1);
                },
                options: releaseVersionOptions,
                dropdownWidth: 'w-56',
                align: 'right',
              },
            ]}
            isFiltered={searchQuery.trim() !== '' || methodFilter !== 'ALL' || releaseVersionFilter !== 'ALL'}
            onResetFilters={() => {
              setSearchQuery('');
              setMethodFilter('ALL');
              setReleaseVersionFilter('ALL');
              setCurrentPage(1);
            }}
          />

          {/* Collapsible Manifest & Checksum Attestation (shown only when filtered by a Release Version) */}
          {releaseVersionFilter !== 'ALL' && releaseVersionFilter !== 'PENDING' && (() => {
            const matchingResult = gate2Result?.releaseVersion === releaseVersionFilter ? gate2Result : null;
            const artifactRows: Array<{ id: string; packageName: string; verified: boolean }> =
              matchingResult?.verifiedApps?.length
                ? matchingResult.verifiedApps.map((a: any) => ({
                    id: a.id,
                    packageName: a.packageName,
                    verified: a.digestMatched !== false,
                  }))
                : filteredApps.map((a) => ({
                    id: a.id,
                    packageName: a.integrationConfig?.packageName || a.appId,
                    verified: true,
                  }));
            const sortedArtifacts = [...artifactRows].sort((a, b) => Number(a.verified) - Number(b.verified));
            const digest: string | undefined = matchingResult?.manifest?.integrityDigest;
            const permissions: string[] = matchingResult?.manifest?.consolidatedPermissions?.length
              ? matchingResult.manifest.consolidatedPermissions
              : Array.from(
                  new Set(
                    filteredApps.flatMap((a) =>
                      Array.isArray(a.permissions)
                        ? a.permissions.map((p: any) => (typeof p === 'string' ? p : p?.type)).filter(Boolean)
                        : [],
                    ),
                  ),
                );
            const verifiedCount = sortedArtifacts.filter((a) => a.verified).length;
            const visiblePerms = permissions.slice(0, 8);
            const extraPerms = permissions.length - visiblePerms.length;

            return (
              <div className="mt-4 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAttestationOpen((v) => !v)}
                  className="w-full px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>{verifiedCount}/{sortedArtifacts.length} Artifacts Verified</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      Release {releaseVersionFilter}
                    </span>
                    {digest && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          sha256:{digest.slice(0, 8)}…{digest.slice(-6)}
                        </span>
                      </>
                    )}
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {permissions.length} Permission{permissions.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {attestationOpen ? 'Hide details ▲' : 'Attestation details ▼'}
                  </span>
                </button>

                {attestationOpen && (
                  <div className="border-t border-slate-200/80 dark:border-slate-700/80 p-4 space-y-3 bg-white/80 dark:bg-slate-900/80">
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900">
                      {sortedArtifacts.map((art) => (
                        <div key={art.id} className="px-3 py-2 flex items-center justify-between text-xs">
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                            {art.packageName}
                          </span>
                          <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold shrink-0 ${
                            art.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            <CheckIcon className="w-3 h-3" />
                            <span>{art.verified ? 'Digest Matched' : 'Mismatch'}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {digest && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all">
                          sha256:{digest}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(`sha256:${digest}`);
                            setCopiedDigest(true);
                            setTimeout(() => setCopiedDigest(false), 1500);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                        >
                          {copiedDigest ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {permissions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
                          Permissions:
                        </span>
                        {visiblePerms.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70"
                          >
                            {perm}
                          </span>
                        ))}
                        {extraPerms > 0 && (
                          <span className="text-[11px] text-slate-500 font-medium">+{extraPerms} more</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">MiniApp</th>
                <th className="py-3.5 px-6">Live MA Version</th>
                <th className="py-3.5 px-6">Candidate Update Version</th>
                <th className="py-3.5 px-6">Integration Method</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {apps.length === 0
                      ? 'No approved mini apps queued for release.'
                      : 'No MiniApps match your search or filter criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedApps.map(app => {
                  const hasLiveVersion = Boolean(app.currentReleaseVersion || app.status === 'ACTIVE');
                  const liveVerStr = app.currentReleaseVersion || (hasLiveVersion ? '1.0.0' : '-');
                  const candidateVerStr = app.version || '0.0.2';
                  const isUpgraded = liveVerStr !== '-' && liveVerStr !== candidateVerStr;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AppLogoAvatar logo={app.logo} name={app.name} size="md" />
                          <div>
                            <Link href={`/miniapps/${app.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand-600 transition-colors">
                              {app.name || 'Unknown'}
                            </Link>
                            <div className="font-mono text-xs text-slate-400">
                              {app.integrationConfig?.packageName || app.appId || 'ma_flutter_trust_regulator'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hasLiveVersion ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <DotBadge color="bg-emerald-500" />
                            <span>Live: {liveVerStr}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium italic">
                            <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>New App (No Live Ver)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
                          isUpgraded
                            ? 'bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-300 border border-accent-200'
                            : 'bg-accent-50 text-accent-800 dark:bg-accent-950/40 dark:text-accent-300 border border-accent-200'
                        }`}>
                          <DotBadge color="bg-accent-500" />
                          <span>{isUpgraded ? 'Update:' : 'Candidate:'} v{candidateVerStr}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {app.integrationMethod}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AppStatusBadge app={app} showPrefix={true} />
                          {versionStageOf(app) && <VersionStageBadge app={app} showPrefix={true} />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/miniapps/${app.id}?tab=versions`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-accent-600 dark:text-accent-400 hover:underline"
                        >
                          <span>Compare MA</span>
                          <ArrowRightIcon className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredApps.length >= 5 && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredApps.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showPageSizeSelector
              showTotal
            />
          </div>
        )}
      </div>

      {/* SuperApp Release Comparator Modal */}
      <SuperAppReleaseCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        defaultBaseVersion={officialVer}
        defaultTargetVersion={releaseVersion}
      />
    </div>
  );
}

