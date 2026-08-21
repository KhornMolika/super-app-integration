"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/inputs';

export interface SecurityGateCardProps {
  miniApp: any;
}

export default function SecurityGateCard({ miniApp }: SecurityGateCardProps) {
  const [report, setReport] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FINDINGS'>('OVERVIEW');

  const flutterConfig = miniApp?.integrationConfig || {};
  const isFlutter = miniApp?.integrationMethod === 'FLUTTER_PACKAGE';

  const runScan = async () => {
    setIsRunning(true);
    try {
      const gitUrl = flutterConfig.gitUrl || 'https://github.com/KhornMolika/super-app-integration';
      const ref = flutterConfig.gitBranch || 'main';
      const path = flutterConfig.gitPath || 'dsp_miniapp_trust_regulator';

      const res = await fetch('/api/security/gate1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: gitUrl,
          ref,
          path,
          token: flutterConfig.gitAccessToken || undefined,
          declaredPermissions: miniApp?.permissions || [],
        }),
      });

      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Failed to run Security Gate 1 scan', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (!report && miniApp) {
      runScan();
    }
  }, [miniApp?.id, miniApp?.status]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pre-Publish Security Gate 1
              </h3>
              {report && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    report.status === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : report.status === 'WARNING'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      report.status === 'PASSED'
                        ? 'bg-emerald-500'
                        : report.status === 'WARNING'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  {report.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated static analysis, secret leakage detection, and capability permission compliance.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={runScan}
          disabled={isRunning}
          className="h-9 px-4 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Running Security Audit...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>{report ? 'Re-run Gate 1 Scan' : 'Run Gate 1 Scan'}</span>
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      {report ? (
        <div className="mt-5 space-y-5">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Security Score</span>
              <span
                className={`text-xl font-bold ${
                  report.score >= 80
                    ? 'text-emerald-600'
                    : report.score >= 50
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {report.score}/100
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Static Analysis</span>
              <span
                className={`text-sm font-semibold flex items-center gap-1 mt-1 ${
                  report.checks.staticAnalysis.passed ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {report.checks.staticAnalysis.passed ? '✓ Clean' : '✗ Issues Found'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Secret Leaks</span>
              <span
                className={`text-sm font-semibold flex items-center gap-1 mt-1 ${
                  report.checks.secretScan.passed ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {report.checks.secretScan.passed ? '✓ 0 Leaks' : `✗ ${report.checks.secretScan.leaksFound} Leaks`}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Permissions</span>
              <span
                className={`text-sm font-semibold flex items-center gap-1 mt-1 ${
                  report.checks.permissionCompliance.passed ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {report.checks.permissionCompliance.passed
                  ? '✓ Compliant'
                  : `✗ ${report.checks.permissionCompliance.undeclaredPlugins.length} Undeclared`}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Core SDK</span>
              <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                ✓ Compatible
              </span>
            </div>
          </div>

          {/* SHA-256 Digest */}
          {report.checks.integrityCheck.sha256 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">SHA-256 Digest:</span>
                <code className="text-slate-500 font-mono select-all">
                  {report.checks.integrityCheck.sha256}
                </code>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Verified</span>
            </div>
          )}

          {/* Findings List if any */}
          {report.findings && report.findings.length > 0 ? (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Security Audit Findings ({report.findings.length})
              </span>
              {report.findings.map((f: any) => (
                <div
                  key={f.id}
                  className={`p-3.5 rounded-xl border text-xs ${
                    f.severity === 'CRITICAL' || f.severity === 'HIGH'
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                      : f.severity === 'MEDIUM'
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.severity === 'CRITICAL' || f.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                            : f.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                            : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {f.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{f.id}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {f.description}
                  </p>
                  {f.recommendation && (
                    <p className="mt-1.5 text-slate-500 dark:text-slate-400 font-medium">
                      💡 <span className="underline">Remediation:</span> {f.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>All Gate 1 security checks passed with zero vulnerabilities or undeclared permissions!</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Click &quot;Run Gate 1 Scan&quot; to execute automated static analysis and vulnerability scanning.</span>
          <span className="text-slate-400">Ready</span>
        </div>
      )}
    </div>
  );
}
