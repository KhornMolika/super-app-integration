'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import { API_URL } from '@/lib/config';
import SecurityValidationSelector, { ALL_SECURITY_CHECKS, getRecommendedChecksForMethod } from '@/components/forms/SecurityValidationSelector';

export interface ValidationReportProps {
  miniApp: any;
  onRefresh?: () => void;
}

interface StageCatalogItem {
  id: string;
  name: string;
  tool: string;
  icon: string;
  defaultTitle: string;
  description: string;
}

const STAGE_CATALOG: Record<string, StageCatalogItem> = {
  ingest: {
    id: 'ingest',
    name: 'Ingestion & Integrity Verification',
    tool: 'Cryptographic SHA-256 Digest',
    icon: '📦',
    defaultTitle: 'Source Unpack & SHA-256 Digest',
    description: 'Unpacks package source and verifies cryptographic checksum and manifest structure.',
  },
  ssrf: {
    id: 'ssrf',
    name: 'Pre-Flight & SSRF Defense',
    tool: 'DNS / IP Routing Filter',
    icon: '🌐',
    defaultTitle: 'DNS & IP Routing Audit',
    description: 'Resolves DNS and verifies routing to prevent server-side request forgery.',
  },
  dependency_scan: {
    id: 'dependency_scan',
    name: 'Dependency Vulnerability Scan (SCA / CVE)',
    tool: 'Trivy / OSV Audit',
    icon: '📦',
    defaultTitle: 'Dependency Vulnerability (CVE) Audit',
    description: 'Scans third-party packages and dependencies for known CVE vulnerabilities.',
  },
  secret_scan: {
    id: 'secret_scan',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: '🔑',
    defaultTitle: 'Gitleaks & API Key Scan',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens.',
  },
  sast: {
    id: 'sast',
    name: 'Static Application Security Testing (SAST)',
    tool: 'Semgrep / SonarQube / AST Guard',
    icon: '🛡️',
    defaultTitle: 'Dart AST & Sandbox Guard',
    description: 'Analyzes source code for security flaws, unsafe memory operations, and prohibited native calls.',
  },
  sbom: {
    id: 'sbom',
    name: 'Software Bill of Materials (SBOM)',
    tool: 'Syft / CycloneDX',
    icon: '📋',
    defaultTitle: 'CycloneDX & SPDX Manifest Generation',
    description: 'Generates cryptographic CycloneDX & SPDX SBOM manifests of all dependencies.',
  },
  domain_tls_audit: {
    id: 'domain_tls_audit',
    name: 'Domain TLS/SSL & Transport Security',
    tool: 'testssl.sh / SSL Labs',
    icon: '🔒',
    defaultTitle: 'SSL/TLS Cipher Suite Audit',
    description: 'Audits TLS 1.2/1.3 cipher suites, HTTPS certificates, HSTS headers, and SSRF routing.',
  },
  csp_headers_audit: {
    id: 'csp_headers_audit',
    name: 'Security Headers & CSP Audit',
    tool: 'SecurityHeaders / ZAP Audit',
    icon: '🛡️',
    defaultTitle: 'Security Headers & CSP Audit',
    description: 'Verifies Content-Security-Policy, X-Frame-Options, CORS origins, and cookie security flags.',
  },
  dast_zap: {
    id: 'dast_zap',
    name: 'Dynamic Application Security Scan (DAST)',
    tool: 'OWASP ZAP DAST',
    icon: '⚡',
    defaultTitle: 'DAST, XSS & CSP Audit',
    description: 'Dynamic probing for cross-site scripting (XSS), CSRF, and sensitive endpoint exposure.',
  },
  malware_scan: {
    id: 'malware_scan',
    name: 'Malware & Binary Signature Scan',
    tool: 'ClamAV / YARA',
    icon: '🦠',
    defaultTitle: 'Malware & Binary Signature Heuristics',
    description: 'Deep signature inspection of compiled binaries and assets for malicious payloads.',
  },
  license_compliance: {
    id: 'license_compliance',
    name: 'Open Source License Compliance',
    tool: 'FOSSA / License-Checker',
    icon: '📜',
    defaultTitle: 'License IP & Copyleft Compliance',
    description: 'Verifies dependency licenses against platform IP guidelines and copyleft restrictions.',
  },
  capability_gate: {
    id: 'capability_gate',
    name: 'Host Capability Gatekeeper Audit',
    tool: 'Super App Gatekeeper',
    icon: '🚪',
    defaultTitle: 'Super App Capability Boundary Verification',
    description: 'Verifies declared host capabilities against platform policies and app store guidelines.',
  },
  // Legacy aliases for backward compatibility with old reports
  secrets: {
    id: 'secrets',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: '🔑',
    defaultTitle: 'Gitleaks & API Key Scan',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens.',
  },
  malware_sast: {
    id: 'malware_sast',
    name: 'Malware & Static Code Analysis (SAST)',
    tool: 'Dart AST & Sandbox Guard',
    icon: '🛡️',
    defaultTitle: 'Dart AST & Sandbox Guard',
    description: 'Analyzes source code for security flaws and prohibited native calls.',
  },
  sca: {
    id: 'sca',
    name: 'Software Composition Analysis (SCA)',
    tool: 'Dependency Vulnerability (CVE) Audit',
    icon: '🔍',
    defaultTitle: 'Dependency Vulnerability (CVE) Audit',
    description: 'Scans third-party packages for known CVE vulnerabilities.',
  },
  tls: {
    id: 'tls',
    name: 'TLS & HTTPS Security',
    tool: 'SSL/TLS Cipher Suite Audit',
    icon: '🔒',
    defaultTitle: 'SSL/TLS Cipher Suite Audit',
    description: 'Audits TLS 1.2/1.3 cipher suites and HTTPS encryption.',
  },
  zap: {
    id: 'zap',
    name: 'OWASP ZAP DAST Scan',
    tool: 'OWASP ZAP DAST',
    icon: '⚡',
    defaultTitle: 'DAST, XSS & CSP Audit',
    description: 'Dynamic probing for cross-site scripting and security headers.',
  },
  nuclei: {
    id: 'nuclei',
    name: 'Exposure & Vulnerability Audit',
    tool: 'Secret & CVE Exposure Check',
    icon: '🔍',
    defaultTitle: 'Secret & CVE Exposure Check',
    description: 'Probes for exposed endpoints, secrets, and CVE vulnerabilities.',
  },
};

export default function ValidationReportTab({ miniApp, onRefresh }: ValidationReportProps) {
  const [isReScanning, setIsReScanning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reScanMessage, setReScanMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuredChecks, setConfiguredChecks] = useState<string[]>(miniApp.securityChecks || []);

  const report = miniApp.validationReport || null;
  const stages = miniApp.validationStages || {};
  const issues = miniApp.issues || [];
  const findings = report?.findings || [];
  const score = report?.score ?? (miniApp.validationStatus === 'PASSED' ? 100 : miniApp.validationStatus === 'FAILED' ? 45 : null);
  const valStatus = (miniApp.validationStatus || 'PENDING').toUpperCase();
  const isFlutterPackage = miniApp.integrationMethod === 'FLUTTER_PACKAGE';

  // Keep configured checks synced with miniApp prop
  useEffect(() => {
    if (miniApp.securityChecks && Array.isArray(miniApp.securityChecks)) {
      setConfiguredChecks(miniApp.securityChecks);
    }
  }, [miniApp.securityChecks]);

  // Combine findings from report & database issues
  const allFindings: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    recommendation?: string;
  }> = [...findings];

  issues.forEach((iss: any) => {
    if (!allFindings.some((f) => f.id === iss.metadata?.findingId || f.description === iss.description)) {
      allFindings.push({
        id: iss.metadata?.findingId || iss.type || 'ISSUE',
        severity: iss.severity || 'HIGH',
        title: iss.classification || iss.type || 'Platform Issue',
        description: iss.description || '',
        recommendation: iss.metadata?.recommendation || 'Remediate this finding in accordance with Super App security policies.',
      });
    }
  });

  // Dynamically resolve active validation stages
  const activeStages = useMemo(() => {
    const rawStageKeys = Object.keys(stages);
    let stageKeyOrder: string[] = [];

    if (rawStageKeys.length > 0) {
      stageKeyOrder = rawStageKeys;
    } else {
      const userSelected = miniApp.securityChecks && miniApp.securityChecks.length > 0
        ? miniApp.securityChecks
        : getRecommendedChecksForMethod(miniApp.integrationMethod);

      if (isFlutterPackage) {
        stageKeyOrder = ['ingest', ...userSelected];
        if (!stageKeyOrder.includes('capability_gate')) {
          stageKeyOrder.push('capability_gate');
        }
      } else {
        stageKeyOrder = ['ssrf', ...userSelected];
      }
      stageKeyOrder = Array.from(new Set(stageKeyOrder));
    }

    return stageKeyOrder.map((key, idx) => {
      const meta = STAGE_CATALOG[key] || {
        id: key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        tool: 'Security Engine',
        icon: '🔍',
        defaultTitle: 'Security Audit Check',
        description: 'Automated platform security audit.',
      };

      const recorded = stages[key] || null;
      return {
        id: key,
        index: idx + 1,
        name: recorded?.name || `${idx + 1}. ${meta.name.replace(/^\d+\.\s*/, '')}`,
        defaultTitle: meta.defaultTitle,
        icon: recorded?.icon || meta.icon,
        tool: recorded?.tool || meta.tool,
        description: meta.description,
        recorded,
      };
    });
  }, [stages, miniApp.securityChecks, miniApp.integrationMethod, isFlutterPackage]);

  const jenkinsJobUrl = isFlutterPackage
    ? 'http://localhost:8085/job/package-validation/'
    : 'http://localhost:8085/job/webview-validation/';

  const handleReScan = async (checksToRun?: string[]) => {
    setIsReScanning(true);
    setShowConfigModal(false);
    setReScanMessage('Initiating security scan...');
    try {
      const payload = checksToRun && checksToRun.length > 0 ? { securityChecks: checksToRun } : {};
      let res = await fetch(`/api/mini-apps/${miniApp.id}/rescan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/mini-apps/${miniApp.id}/rescan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setReScanMessage('Security scan initiated!');
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        setReScanMessage(data.message || 'Failed to trigger scan.');
      }
    } catch (err: any) {
      setReScanMessage('Error contacting server.');
    } finally {
      setIsReScanning(false);
    }
  };

  const handleCancelScan = async () => {
    setIsCancelling(true);
    setReScanMessage('Cancelling / resetting validation status...');
    try {
      let res = await fetch(`/api/mini-apps/${miniApp.id}/cancel-validation`, {
        method: 'POST',
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/mini-apps/${miniApp.id}/cancel-validation`, {
          method: 'POST',
        });
      }

      if (res.ok) {
        setReScanMessage('Scan cancelled. Status reset to FAILED.');
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        setReScanMessage(data.message || 'Failed to cancel scan.');
      }
    } catch (err: any) {
      setReScanMessage('Error contacting server.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Real-time WebSocket connection for instantaneous stage updates
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('miniapp.stage_updated', (data: any) => {
      if (data && data.miniAppId === miniApp.id) {
        if (onRefresh) onRefresh();
      }
    });

    socket.on('notification.created', (data: any) => {
      if (data && (data.miniAppId === miniApp.id || data.data?.miniAppId === miniApp.id)) {
        if (onRefresh) onRefresh();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [miniApp.id, onRefresh]);

  // Live polling while scan is running
  useEffect(() => {
    if (valStatus === 'RUNNING' || isReScanning) {
      const interval = setInterval(() => {
        if (onRefresh) onRefresh();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [valStatus, isReScanning, onRefresh]);

  const scoreColor = score === null
    ? 'text-slate-500'
    : score >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400';

  const scoreBg = score === null
    ? 'bg-slate-50 dark:bg-slate-800'
    : score >= 80
    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
    : score >= 50
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
    : 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800';

  const scannedTargetLabel = isFlutterPackage
    ? (miniApp.integrationConfig?.packageStoragePath
        ? `MinIO Package: ${miniApp.integrationConfig.packageStoragePath}`
        : miniApp.integrationConfig?.repoUrl
        ? `Git Repo: ${miniApp.integrationConfig.repoUrl}${miniApp.integrationConfig.commitSha ? ` @ ${miniApp.integrationConfig.commitSha.substring(0, 7)}` : ''}`
        : 'Flutter Package Ingestion')
    : (miniApp.integrationConfig?.productionUrl || miniApp.integrationConfigWebView?.productionUrl || 'N/A');

  // Selected Security Checks list for profile badges
  const activeProfileChecks = useMemo(() => {
    const checks = miniApp.securityChecks && miniApp.securityChecks.length > 0
      ? miniApp.securityChecks
      : getRecommendedChecksForMethod(miniApp.integrationMethod);

    return checks.map((cId: string) => {
      const checkMeta = ALL_SECURITY_CHECKS.find((c) => c.id === cId) || STAGE_CATALOG[cId];
      return {
        id: cId,
        name: checkMeta?.name || cId,
        tool: checkMeta?.tool || 'Security Engine',
        icon: STAGE_CATALOG[cId]?.icon || '🛡️',
      };
    });
  }, [miniApp.securityChecks, miniApp.integrationMethod]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Security Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center p-2 flex-shrink-0 ${scoreBg}`}>
              <span className={`text-2xl font-black ${scoreColor}`}>
                {score !== null ? score : '--'}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isFlutterPackage ? 'Package Security & Compliance Report' : 'Automated Security & Compliance Report'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider ${
                  valStatus === 'PASSED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : valStatus === 'RUNNING'
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300 animate-pulse'
                    : valStatus === 'FAILED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {valStatus === 'RUNNING' ? 'SCANNING IN PROGRESS' : valStatus}
                </span>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-400 mt-1">
                Target: <code className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {scannedTargetLabel}
                </code>
              </p>
              {report?.completedAt && (
                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                  <span>Report generated: {new Date(report.completedAt).toLocaleString()}</span>
                  {report?.reportPath?.startsWith('local-scan://') && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                      Local Security Engine
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3">
            {reScanMessage && (
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400 animate-fade-in">
                {reScanMessage}
              </span>
            )}
            {valStatus === 'RUNNING' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelScan}
                disabled={isCancelling}
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-sm px-3.5 py-2 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{isCancelling ? 'Stopping...' : 'Stop / Reset Scan'}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfigModal(true)}
              disabled={isReScanning || isCancelling}
              className="flex items-center gap-1.5 text-sm font-semibold h-10 px-3.5"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Configure Checks</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleReScan()}
              disabled={isReScanning || isCancelling}
              className="flex items-center gap-2 text-sm font-semibold h-10 px-4"
            >
              <svg className={`w-4 h-4 ${isReScanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isReScanning ? 'Running Security Scan...' : 'Re-Run Security Scan'}</span>
            </Button>
          </div>
        </div>

        {/* Active Security Profile Tags */}
        <div className="mt-4 pt-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>🛡️</span> Active Security Scan Profile ({activeProfileChecks.length} checks enabled)
            </span>
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Edit Checks
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeProfileChecks.map((chk: any) => (
              <span
                key={chk.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                <span>{chk.icon}</span>
                <span>{chk.name}</span>
                <span className="text-[10px] text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                  {chk.tool}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Security Controls Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {activeStages.map((st) => {
            const recorded = st.recorded;
            const checkData = report?.checks?.[st.id] || (st.id === 'sast' ? report?.checks?.malware_sast : null) || (st.id === 'dependency_scan' ? report?.checks?.sca : null) || (st.id === 'dast_zap' ? report?.checks?.dast : null) || (st.id === 'domain_tls_audit' ? report?.checks?.tls : null) || (st.id === 'secret_scan' ? report?.checks?.secrets : null);
            
            const isPassed = checkData?.passed === true || recorded?.status === 'COMPLETED';
            const isRunning = valStatus === 'RUNNING' && (recorded?.status === 'RUNNING' || !recorded);
            const isFailed = checkData?.passed === false || recorded?.status === 'FAILED' || (valStatus === 'FAILED' && !isPassed);

            return (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{st.icon}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {st.name.replace(/^\d+\.\s*/, '')}
                      </span>
                    </div>
                    {isPassed ? (
                      <span className="text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        PASSED
                      </span>
                    ) : isRunning ? (
                      <span className="text-brand-600 text-xs font-bold animate-pulse">
                        CHECKING...
                      </span>
                    ) : isFailed ? (
                      <span className="text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        FAILED
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        PENDING
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {recorded?.details || checkData?.details || (valStatus === 'FAILED' && isFailed ? 'Check failed or reported security concerns.' : st.description)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">{st.tool}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jenkins Offline Fallback Notice Banner */}
      {report?.fallbackFromJenkins && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-amber-900 dark:text-amber-200">
                  Jenkins CI Unreachable — Completed via Local Security Engine
                </h4>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">
                  Auto-Recovered
                </span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                The primary Jenkins CI controller (<code>http://localhost:8085</code>) could not be reached: <em>{report.fallbackReason || 'Connection Refused'}</em>. To prevent the pipeline from hanging, the security audit was automatically executed in-process using the Local Security Engine.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Failure Banner if pipeline or validation failed */}
      {valStatus === 'FAILED' && (
        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
              ⚠️
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Security Validation Pipeline Failed
              </h4>
              <p className="text-sm text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                The automated validation pipeline encountered an error or reported blocking security findings. Status has been stopped and reset to require remediation.
              </p>
            </div>
          </div>
          {!report?.reportPath?.startsWith('local-scan://') && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={jenkinsJobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-sm"
              >
                <span>Jenkins Logs</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Stage Execution Timeline */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <CardHeader
            className="mb-0"
            title={report?.reportPath?.startsWith('local-scan://') ? "Local Automated Security Audit Pipeline" : "Jenkins Automated Validation Pipeline"}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          />
          {report?.fallbackFromJenkins && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Fallback: Jenkins Offline
            </span>
          )}
        </div>
        <p className="text-base text-slate-600 dark:text-slate-400 mb-5">
          {report?.reportPath?.startsWith('local-scan://') ? 'Real-time execution log of the security audit stages:' : 'Real-time execution log of the security stages orchestrated by Jenkins:'}
        </p>

        <div className="space-y-3">
          {activeStages.map((st) => {
            const recorded = st.recorded;
            const stageStatus = recorded
              ? (valStatus === 'FAILED' && recorded.status === 'RUNNING' ? 'FAILED' : recorded.status)
              : (valStatus === 'PASSED' ? 'COMPLETED' : 'PENDING');
            const isCompleted = stageStatus === 'COMPLETED';
            const isRunning = stageStatus === 'RUNNING' && valStatus !== 'FAILED';
            const isFailed = stageStatus === 'FAILED' || (valStatus === 'FAILED' && recorded?.status === 'RUNNING');

            return (
              <div
                key={st.id}
                className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                  isRunning
                    ? 'bg-brand-50/70 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800'
                    : isCompleted
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                    : isFailed
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-xl">{st.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {st.name}
                      </h4>
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {st.tool}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {recorded?.details || (valStatus === 'FAILED' && isFailed ? 'Execution failed or scanner encountered an error.' : st.defaultTitle)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs sm:text-sm px-2.5 py-1 rounded font-mono font-semibold uppercase ${
                    isRunning
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : isFailed
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {stageStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Security Findings & Remediation */}
      <Card>
        <CardHeader
          title={`Identified Security Findings (${allFindings.length})`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <p className="text-base text-slate-600 dark:text-slate-400 mb-5">
          Detailed vulnerability discoveries and remediation guidelines:
        </p>

        {allFindings.length === 0 ? (
          <div className="flex items-center p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Zero Critical or High Vulnerabilities Found</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                The target endpoint complies with Super App transport encryption, SSRF protection, and DAST security standards.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-sm sm:text-base">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 w-[12%]">Severity</th>
                  <th className="px-4 py-3.5 w-[25%]">Vulnerability / ID</th>
                  <th className="px-4 py-3.5 w-[35%]">Description</th>
                  <th className="px-4 py-3.5 w-[28%]">Recommended Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {allFindings.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                        f.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : f.severity === 'HIGH'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                          : f.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-base text-slate-900 dark:text-white">{f.title}</div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">{f.id}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                      {f.description}
                    </td>
                    <td className="px-4 py-4 align-top text-sm sm:text-base text-slate-600 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-800/20 leading-relaxed">
                      {f.recommendation || 'Follow Super App integration security checklist.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Security Checks Re-Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg">
                  🛡️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Re-Configure Security Scan Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select the automated security audits to run for this Mini App ({miniApp.integrationMethod})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-2">
              <SecurityValidationSelector
                integrationMethod={miniApp.integrationMethod}
                selectedChecks={configuredChecks}
                onChange={setConfiguredChecks}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfigModal(false)}
                className="text-sm px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={configuredChecks.length === 0}
                onClick={() => handleReScan(configuredChecks)}
                className="text-sm px-5 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Run Custom Scan ({configuredChecks.length} checks)</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
