"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import { superAppApi, miniappsApi, MiniApp } from '@/api';
import { SuperAppReleaseCompareModal } from '@/components/releases/SuperAppReleaseCompareModal';
import { ShieldIcon, DevicePhoneIcon, CheckIcon, SparklesIcon, ArrowRightIcon, DotBadge } from '@/components/ui/Icons';

export default function ReleasesPage() {
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [releaseVersion, setReleaseVersion] = useState('v0.0.3');
  const [isAssembling, setIsAssembling] = useState(false);
  const [gate2Result, setGate2Result] = useState<any>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [ecosystemStatus, setEcosystemStatus] = useState<any>(null);

  const fetchNextVersion = () => {
    superAppApi.getNextVersion()
      .then(data => {
        if (data?.nextVersion) {
          setReleaseVersion(data.nextVersion);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    superAppApi.getEcosystemStatus()
      .then(data => setEcosystemStatus(data))
      .catch(() => {});
    miniappsApi.getAll()
      .then(data => {
        if (Array.isArray(data)) {
          // Filter to show Approved, Published, or Active apps
          setApps(data.filter(app => ['APPROVED', 'PUBLISHED', 'ACTIVE', 'Approved', 'Published'].includes(app.status || '')));
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    fetchNextVersion();
  }, []);

  const handleRunGate2 = async () => {
    setIsAssembling(true);
    try {
      const payload = {
        releaseVersion,
        miniApps: apps.map(a => ({
          id: a.id,
          name: a.name || 'Mini App',
          packageName: a.integrationConfig?.packageName || (a.integrationMethod === 'FLUTTER_PACKAGE' ? 'dps_miniapp_mobile_trust_regulator' : a.integrationMethod === 'DEEP_LINK' ? (a.integrationConfig?.urlScheme || a.appId) : 'webview_package'),
          version: a.version || '0.0.2',
          declaredPermissions: a.permissions || [{ type: 'NFC' }],
        })),
      };

      const data = await superAppApi.verifyReleaseAssembly(payload);
      setGate2Result(data);
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

  const officialVer = ecosystemStatus?.officialReleaseVersion || 'v0.0.2';
  const testVer = ecosystemStatus?.superAppVersion || releaseVersion || 'v0.0.3';

  return (
    <div className="w-full py-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Super App Release Pipeline</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Security Gate 2
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Execute Security Gate 2 checksum verification, compare releases, and assemble official Super App releases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Compare Button */}
          <button
            type="button"
            onClick={() => setCompareModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Compare SA Releases (SA vs SA)</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-medium">Next Release:</span>
            <input
              type="text"
              value={releaseVersion}
              onChange={e => setReleaseVersion(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white w-20 outline-none font-mono"
            />
          </div>

          <Button
            onClick={handleRunGate2}
            disabled={isAssembling}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center space-x-2"
          >
            {isAssembling ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Assembling Gate 2...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Run Gate 2 & Assemble Super App</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Super App Release Classification Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Live SA Official Build */}
        <div className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              <DotBadge color="bg-emerald-500 animate-pulse" />
              <span>LIVE SA VERSION</span>
            </span>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">Official Production</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              {officialVer}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active master build serving end users with approved Mini Apps and verified security baseline.
            </p>
          </div>
          <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status: <strong className="text-emerald-700 dark:text-emerald-400">Deployed</strong></span>
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View Bundle</span>
              <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Next SA Candidate Assembly */}
        <div className="p-5 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/20 dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
              <DotBadge color="bg-purple-500" />
              <span>SA NEW UPDATE BUILD</span>
            </span>
            <span className="text-xs font-mono text-purple-700 dark:text-purple-400 font-bold">Candidate / Test</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              {releaseVersion}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              New release compilation queued to package {apps.length} approved Mini App updates and new bridge capabilities.
            </p>
          </div>
          <div className="pt-3 border-t border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs">
            <span className="text-slate-500">Queue: <strong className="text-purple-700 dark:text-purple-400">{apps.length} MAs Eligible</strong></span>
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Compare Diff</span>
              <ArrowRightIcon className="w-3 h-3" />
            </button>
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
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1"
            >
              <span>View History</span>
              <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Security Gate 2 Live Audit Card */}
      {gate2Result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-fade-in space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                <ShieldIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Security Gate 2: Release Verification Result
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {gate2Result.releaseVersion} • Timestamp: {gate2Result.timestamp}
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

          {/* Verified Checksum Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Verified Nexus Artifacts</div>
              <div className="space-y-2">
                {gate2Result.verifiedApps?.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-700/50 last:border-0">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{app.packageName}</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckIcon className="w-3 h-3" />
                      <span>Digest Matched</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Signed Release Manifest Digest</div>
              <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 break-all p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                SHA256: {gate2Result.manifest?.integrityDigest}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                Consolidated Permissions: {gate2Result.manifest?.consolidatedPermissions?.join(', ') || 'NFC, NETWORK'}
              </div>
            </div>
          </div>

          {/* APK Build Status & Download Button */}
          {gate2Result.apkUrl && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  <DevicePhoneIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Super App Android APK Ready
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                      {releaseVersion} • Sonatype Nexus Trusted Registry
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Compiled with approved Mini Apps and native bridges. Ready for MA Manager & SA Admin dual testing.
                  </p>
                </div>
              </div>
              <a
                href={gate2Result.apkUrl}
                download="superapp-debug.apk"
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>Download Test APK (92.8 MB)</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Approved Mini Apps List Table with Clear Version Badging */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Bundled Mini App Candidates for Assembly</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Approved Mini Apps eligible to be bundled into Super App candidate release {releaseVersion}.
            </p>
          </div>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {apps.length} Mini Apps Queued
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Mini App</th>
                <th className="py-3.5 px-6">Live MA Version</th>
                <th className="py-3.5 px-6">Candidate Update Version</th>
                <th className="py-3.5 px-6">Integration Method</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No approved mini apps queued for release.</td>
                </tr>
              ) : (
                apps.map(app => {
                  const hasLiveVersion = Boolean(app.currentReleaseVersion || app.status === 'ACTIVE');
                  const liveVerStr = app.currentReleaseVersion || (hasLiveVersion ? '1.0.0' : '-');
                  const candidateVerStr = app.version || '0.0.2';
                  const isUpgraded = liveVerStr !== '-' && liveVerStr !== candidateVerStr;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/miniapps/${app.id}`} className="font-bold text-slate-900 dark:text-white hover:text-brand-600 transition-colors">
                          {app.name || 'Unknown'}
                        </Link>
                        <div className="font-mono text-xs text-slate-400">
                          {app.integrationConfig?.packageName || app.appId || 'dps_miniapp_mobile_trust_regulator'}
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
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200'
                        }`}>
                          <DotBadge color={isUpgraded ? "bg-amber-500" : "bg-purple-500"} />
                          <span>{isUpgraded ? 'Update:' : 'Candidate:'} v{candidateVerStr}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {app.integrationMethod}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/miniapps/${app.id}?tab=versions`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
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
      </div>

      {/* Super App Release Comparator Modal */}
      <SuperAppReleaseCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        defaultBaseVersion={officialVer}
        defaultTargetVersion={releaseVersion}
      />
    </div>
  );
}

