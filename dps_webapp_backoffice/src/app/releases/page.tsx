"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';

export default function ReleasesPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [releaseVersion, setReleaseVersion] = useState('v1.1.0');
  const [isAssembling, setIsAssembling] = useState(false);
  const [gate2Result, setGate2Result] = useState<any>(null);

  useEffect(() => {
    fetch('/api/mini-apps')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter to show Approved, Published, or Active apps
          setApps(data.filter(app => ['APPROVED', 'PUBLISHED', 'ACTIVE', 'Approved', 'Published'].includes(app.status)));
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleRunGate2 = async () => {
    setIsAssembling(true);
    try {
      const payload = {
        releaseVersion,
        miniApps: apps.map(a => ({
          id: a.id,
          name: a.name || 'Mini App',
          packageName: a.integrationConfig?.packageName || (a.integrationMethod === 'FLUTTER_PACKAGE' ? 'dps_miniapp_mobile_trust_regulator' : 'webview_package'),
          version: a.version || '0.0.2',
          declaredPermissions: a.permissions || [{ type: 'NFC' }],
        })),
      };

      const res = await fetch('/api/security/gate2/verify-and-assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setGate2Result(data);
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

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Super App Release Pipeline</h1>
          <p className="text-slate-500 mt-1">Execute Security Gate 2 checksum verification and assemble official Super App releases.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-medium">Release Tag:</span>
            <input
              type="text"
              value={releaseVersion}
              onChange={e => setReleaseVersion(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white w-20 outline-none"
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
                <span>🚀 Run Gate 2 & Assemble Super App</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Security Gate 2 Live Audit Card */}
      {gate2Result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-fade-in space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                🛡️
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
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Digest Matched</span>
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
        </div>
      )}

      {/* Approved Mini Apps List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Bundled Mini App Candidates</h2>
          <span className="text-xs text-slate-500">{apps.length} Mini Apps Eligible</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Mini App</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Package / Version</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Integration Method</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No approved mini apps queued for release.</td>
                </tr>
              ) : (
                apps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <Link href={`/miniapps/${app.id}`} className="font-medium text-slate-900 dark:text-white hover:text-brand-600 transition-colors">
                        {app.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {app.integrationConfig?.packageName || app.appId || 'dps_miniapp_mobile_trust_regulator'} ({app.version || '0.0.2'})
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {app.integrationMethod}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/miniapps/${app.id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Audit Gate 1
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
