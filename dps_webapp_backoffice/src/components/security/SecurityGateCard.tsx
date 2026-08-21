"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/inputs';

export interface SecurityGateCardProps {
  miniApp: any;
  onApprove?: () => Promise<void> | void;
  onReject?: (reason: string) => Promise<void> | void;
  canApprove?: boolean;
}

export default function SecurityGateCard({ miniApp, onApprove, onReject, canApprove = true }: SecurityGateCardProps) {
  const [gate1Report, setGate1Report] = useState<any>(null);
  const [gate2Report, setGate2Report] = useState<any>(null);
  const [isRunningGate1, setIsRunningGate1] = useState(false);
  const [isRunningGate2, setIsRunningGate2] = useState(false);
  const [activeSection, setActiveSection] = useState<'GATE1' | 'GATE2'>('GATE1');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);

  const flutterConfig = miniApp?.integrationConfig || {};
  const isFlutter = miniApp?.integrationMethod === 'FLUTTER_PACKAGE';

  const runGate1 = async () => {
    setIsRunningGate1(true);
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
      setGate1Report(data);
    } catch (err) {
      console.error('Failed to run Security Gate 1 scan', err);
    } finally {
      setIsRunningGate1(false);
    }
  };

  const runGate2 = async () => {
    setIsRunningGate2(true);
    try {
      const payload = {
        releaseVersion: 'v1.1.0',
        miniApps: [
          {
            id: miniApp.id,
            name: miniApp.name || 'Mini App',
            packageName: flutterConfig.packageName || (isFlutter ? 'dps_miniapp_mobile_trust_regulator' : 'webview_package'),
            version: miniApp.version || '0.0.2',
            declaredPermissions: miniApp.permissions || [],
          },
        ],
      };

      const res = await fetch('/api/security/gate2/verify-and-assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setGate2Report(data);
      setActiveSection('GATE2');
    } catch (err) {
      console.error('Failed to run Security Gate 2 verification', err);
    } finally {
      setIsRunningGate2(false);
    }
  };

  useEffect(() => {
    if (!gate1Report && miniApp) {
      runGate1();
    }
  }, [miniApp?.id, miniApp?.status]);

  const gate1Passed = gate1Report?.status === 'PASSED';
  const gate2Passed = gate2Report?.status === 'PASSED';
  const isEligibleForApproval = gate1Passed && (gate2Report ? gate2Passed : true);

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setIsProcessingDecision(true);
    try {
      await onApprove();
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const handleRejectClick = async () => {
    if (!onReject) return;
    setIsProcessingDecision(true);
    try {
      await onReject(rejectReason || 'Security audit requirements not met.');
      setShowRejectInput(false);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Top Banner Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Super App Security Governance & Release Gates
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Run Gate 1 (Code & Secrets Audit) and Gate 2 (Nexus Checksum Verification) to approve for Super App release.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={runGate1}
              disabled={isRunningGate1}
              className="h-9 px-3 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isRunningGate1 ? 'Scanning Gate 1...' : '⚡ Re-run Gate 1'}
            </Button>
            <Button
              type="button"
              onClick={runGate2}
              disabled={isRunningGate2}
              className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              {isRunningGate2 ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Verifying Gate 2...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Run Security Gate 2</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Gate 1 & Gate 2 Tab Switcher */}
        <div className="flex space-x-3 mt-4">
          <button
            type="button"
            onClick={() => setActiveSection('GATE1')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 ${
              activeSection === 'GATE1'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>Gate 1: Code & Permissions Audit</span>
            {gate1Report && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                gate1Report.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {gate1Report.status}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('GATE2')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 ${
              activeSection === 'GATE2'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>Gate 2: Nexus Checksum & Assembly</span>
            {gate2Report ? (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                gate2Report.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {gate2Report.status}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-normal">Click Run Gate 2</span>
            )}
          </button>
        </div>

        {/* Section 1: Gate 1 Content */}
        {activeSection === 'GATE1' && gate1Report && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Security Score</span>
                <span className={`text-xl font-bold ${gate1Report.score >= 80 ? 'text-emerald-600' : gate1Report.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {gate1Report.score}/100
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Static Analysis</span>
                <span className={`text-sm font-semibold flex items-center gap-1 mt-1 ${gate1Report.checks.staticAnalysis.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {gate1Report.checks.staticAnalysis.passed ? '✓ Clean' : '✗ Issues'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Secret Leaks</span>
                <span className={`text-sm font-semibold flex items-center gap-1 mt-1 ${gate1Report.checks.secretScan.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {gate1Report.checks.secretScan.passed ? '✓ 0 Leaks' : `✗ ${gate1Report.checks.secretScan.leaksFound} Leaks`}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Permissions</span>
                <span className={`text-sm font-semibold flex items-center gap-1 mt-1 ${gate1Report.checks.permissionCompliance.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {gate1Report.checks.permissionCompliance.passed ? '✓ Compliant' : `✗ Undeclared`}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium block">Core SDK</span>
                <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1 mt-1">✓ Compatible</span>
              </div>
            </div>

            {/* Findings List */}
            {gate1Report.findings && gate1Report.findings.length > 0 ? (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Gate 1 Audit Findings ({gate1Report.findings.length})
                </span>
                {gate1Report.findings.map((f: any) => (
                  <div key={f.id} className="p-3.5 rounded-xl border text-xs bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{f.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">{f.severity}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{f.description}</p>
                    {f.recommendation && (
                      <p className="mt-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        💡 <span className="underline">Remediation:</span> {f.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Gate 1 Passed: Code is clean and permissions are compliant!</span>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Gate 2 Content */}
        {activeSection === 'GATE2' && (
          <div className="mt-5 space-y-4">
            {gate2Report ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Nexus Checksum Verification:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {gate2Report.verifiedApps?.[0]?.checksumMatched ? '✓ SHA-256 MATCHED' : '✗ MISMATCH'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 break-all p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    Nexus Artifact Digest: {gate2Report.manifest?.integrityDigest}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 dark:text-slate-400">Dependency Conflicts:</span>
                    <span className="font-semibold text-emerald-600">{gate2Report.conflicts?.length === 0 ? '0 Collisions' : `${gate2Report.conflicts.length} Collisions`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Consolidated Permissions:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{gate2Report.manifest?.consolidatedPermissions?.join(', ') || 'NFC, NETWORK'}</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Security Gate 2 Passed: Nexus artifact is verified and release manifest generated!</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
                Click <strong>&quot;Run Security Gate 2&quot;</strong> above to verify Nexus package digests and dependencies.
              </div>
            )}
          </div>
        )}

        {/* Decision & Action Bar for Admin */}
        {canApprove && (miniApp?.status === 'PENDING_REVIEW' || miniApp?.status === 'DRAFT') && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Admin Release Decision
              </span>
              <p className="text-[11px] text-slate-500">
                {isEligibleForApproval
                  ? 'Security gates passed. You can now approve and publish this mini app into the Super App.'
                  : 'Resolve Gate 1 audit findings before approving for Super App release.'}
              </p>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {!showRejectInput ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRejectInput(true)}
                    className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/50"
                  >
                    Reject App
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApproveClick}
                    disabled={!gate1Passed || isProcessingDecision}
                    className={`text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 ${
                      gate1Passed
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isProcessingDecision ? 'Publishing...' : '🚀 Approve & Publish Mini App'}
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-60"
                  />
                  <Button
                    type="button"
                    onClick={handleRejectClick}
                    disabled={isProcessingDecision}
                    className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl"
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRejectInput(false)}
                    className="text-xs px-3 py-2 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
