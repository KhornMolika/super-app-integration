'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import { miniappsApi } from '@/api';
import SecurityValidationSelector, { ALL_SECURITY_CHECKS, getRecommendedChecksForMethod } from '@/components/forms/SecurityValidationSelector';
import {
  PackageIcon,
  GlobeIcon,
  KeyIcon,
  ShieldIcon,
  ShieldCheckIcon,
  ClipboardCheckIcon,
  LockIcon,
  ZapIcon,
  VirusIcon,
  SearchIcon,
  CheckIcon,
  AlertTriangleIcon,
  XIcon,
} from '@/components/ui/Icons';

export interface ValidationReportProps {
  miniApp: any;
  onRefresh?: () => void;
}

export interface StageCatalogItem {
  id: string;
  name: string;
  tool: string;
  icon: string;
  defaultTitle: string;
  description: string;
}

export function getStageIcon(stageId: string, className = "w-4 h-4") {
  switch (stageId) {
    case 'ingest':
    case 'dependency_scan':
      return <PackageIcon className={className} />;
    case 'ssrf':
    case 'domain_tls_audit':
    case 'tls':
      return <GlobeIcon className={className} />;
    case 'secret_scan':
    case 'secrets':
      return <KeyIcon className={className} />;
    case 'sast':
    case 'malware_sast':
    case 'csp_headers_audit':
      return <ShieldIcon className={className} />;
    case 'sbom':
    case 'license_compliance':
      return <ClipboardCheckIcon className={className} />;
    case 'dast_zap':
    case 'zap':
      return <ZapIcon className={className} />;
    case 'malware_scan':
      return <VirusIcon className={className} />;
    case 'capability_gate':
      return <LockIcon className={className} />;
    case 'sca':
    case 'nuclei':
      return <SearchIcon className={className} />;
    default:
      return <ShieldIcon className={className} />;
  }
}

export const STAGE_CATALOG: Record<string, StageCatalogItem> = {
  ingest: {
    id: 'ingest',
    name: 'Ingestion & Integrity Verification',
    tool: 'Cryptographic SHA-256 Digest',
    icon: 'package',
    defaultTitle: 'Source Unpack & SHA-256 Digest',
    description: 'Unpacks package source and verifies cryptographic checksum and manifest structure.',
  },
  ssrf: {
    id: 'ssrf',
    name: 'Pre-Flight & SSRF Defense',
    tool: 'DNS / IP Routing Filter',
    icon: 'globe',
    defaultTitle: 'DNS & IP Routing Audit',
    description: 'Resolves DNS and verifies routing to prevent server-side request forgery.',
  },
  dependency_scan: {
    id: 'dependency_scan',
    name: 'Dependency Vulnerability Scan (SCA / CVE)',
    tool: 'Trivy / OSV Audit',
    icon: 'package',
    defaultTitle: 'Dependency Vulnerability (CVE) Audit',
    description: 'Scans third-party packages and dependencies for known CVE vulnerabilities.',
  },
  secret_scan: {
    id: 'secret_scan',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: 'key',
    defaultTitle: 'Gitleaks & API Key Scan',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens.',
  },
  sast: {
    id: 'sast',
    name: 'Static Application Security Testing (SAST)',
    tool: 'Semgrep / SonarQube / AST Guard',
    icon: 'shield',
    defaultTitle: 'Dart AST & Sandbox Guard',
    description: 'Analyzes source code for security flaws, unsafe memory operations, and prohibited native calls.',
  },
  sbom: {
    id: 'sbom',
    name: 'Software Bill of Materials (SBOM)',
    tool: 'Syft / CycloneDX',
    icon: 'clipboard',
    defaultTitle: 'CycloneDX & SPDX Manifest Generation',
    description: 'Generates cryptographic CycloneDX & SPDX SBOM manifests of all dependencies.',
  },
  domain_tls_audit: {
    id: 'domain_tls_audit',
    name: 'Domain TLS/SSL & Transport Security',
    tool: 'testssl.sh / SSL Labs',
    icon: 'lock',
    defaultTitle: 'SSL/TLS Cipher Suite Audit',
    description: 'Audits TLS 1.2/1.3 cipher suites, HTTPS certificates, HSTS headers, and SSRF routing.',
  },
  csp_headers_audit: {
    id: 'csp_headers_audit',
    name: 'Security Headers & CSP Audit',
    tool: 'SecurityHeaders / ZAP Audit',
    icon: 'shield',
    defaultTitle: 'Security Headers & CSP Audit',
    description: 'Verifies Content-Security-Policy, X-Frame-Options, CORS origins, and cookie security flags.',
  },
  dast_zap: {
    id: 'dast_zap',
    name: 'Dynamic Application Security Scan (DAST)',
    tool: 'OWASP ZAP DAST',
    icon: 'zap',
    defaultTitle: 'DAST, XSS & CSP Audit',
    description: 'Dynamic probing for cross-site scripting (XSS), CSRF, and sensitive endpoint exposure.',
  },
  malware_scan: {
    id: 'malware_scan',
    name: 'Malware & Binary Signature Scan',
    tool: 'ClamAV / YARA',
    icon: 'virus',
    defaultTitle: 'Malware & Binary Signature Heuristics',
    description: 'Deep signature inspection of compiled binaries and assets for malicious payloads.',
  },
  license_compliance: {
    id: 'license_compliance',
    name: 'Open Source License Compliance',
    tool: 'FOSSA / License-Checker',
    icon: 'document',
    defaultTitle: 'License IP & Copyleft Compliance',
    description: 'Verifies dependency licenses against platform IP guidelines and copyleft restrictions.',
  },
  capability_gate: {
    id: 'capability_gate',
    name: 'Host Capability Gatekeeper Audit',
    tool: 'Super App Gatekeeper',
    icon: 'lock',
    defaultTitle: 'Super App Capability Boundary Verification',
    description: 'Verifies declared host capabilities against platform policies and app store guidelines.',
  },
  // Legacy aliases for backward compatibility with old reports
  secrets: {
    id: 'secrets',
    name: 'Secret & API Key Leak Detection',
    tool: 'Gitleaks / TruffleHog',
    icon: 'key',
    defaultTitle: 'Gitleaks & API Key Scan',
    description: 'Detects exposed private keys, JWT secrets, and hardcoded API tokens.',
  },
  malware_sast: {
    id: 'malware_sast',
    name: 'Malware & Static Code Analysis (SAST)',
    tool: 'Dart AST & Sandbox Guard',
    icon: 'shield',
    defaultTitle: 'Dart AST & Sandbox Guard',
    description: 'Analyzes source code for security flaws and prohibited native calls.',
  },
  sca: {
    id: 'sca',
    name: 'Software Composition Analysis (SCA)',
    tool: 'Dependency Vulnerability (CVE) Audit',
    icon: 'search',
    defaultTitle: 'Dependency Vulnerability (CVE) Audit',
    description: 'Scans third-party packages for known CVE vulnerabilities.',
  },
  tls: {
    id: 'tls',
    name: 'TLS & HTTPS Security',
    tool: 'SSL/TLS Cipher Suite Audit',
    icon: 'lock',
    defaultTitle: 'SSL/TLS Cipher Suite Audit',
    description: 'Audits TLS 1.2/1.3 cipher suites and HTTPS encryption.',
  },
  zap: {
    id: 'zap',
    name: 'OWASP ZAP DAST Scan',
    tool: 'OWASP ZAP DAST',
    icon: 'zap',
    defaultTitle: 'DAST, XSS & CSP Audit',
    description: 'Dynamic probing for cross-site scripting and security headers.',
  },
  nuclei: {
    id: 'nuclei',
    name: 'Exposure & Vulnerability Audit',
    tool: 'Secret & CVE Exposure Check',
    icon: 'search',
    defaultTitle: 'Secret & CVE Exposure Check',
    description: 'Probes for exposed endpoints, secrets, and CVE vulnerabilities.',
  },
};

export default function ValidationReportTab({ miniApp, onRefresh }: ValidationReportProps) {
  const [mounted, setMounted] = useState(false);
  const [isReScanning, setIsReScanning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reScanMessage, setReScanMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuredChecks, setConfiguredChecks] = useState<string[]>(miniApp.securityChecks || []);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Auto-dismiss reScanMessage toast after 4 seconds
  useEffect(() => {
    if (reScanMessage) {
      const timer = setTimeout(() => {
        setReScanMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [reScanMessage]);

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

  // Dynamically resolve active validation stages based strictly on active security profile
  const activeStages = useMemo(() => {
    const userSelected = miniApp.securityChecks && miniApp.securityChecks.length > 0
      ? miniApp.securityChecks
      : getRecommendedChecksForMethod(miniApp.integrationMethod);

    let allowedKeys: string[] = [];
    if (isFlutterPackage || miniApp.integrationMethod === 'NATIVE_SDK') {
      allowedKeys = ['ingest', ...userSelected];
      if (!allowedKeys.includes('capability_gate')) {
        allowedKeys.push('capability_gate');
      }
    } else {
      allowedKeys = ['ssrf', ...userSelected];
    }
    allowedKeys = Array.from(new Set(allowedKeys));

    // Map of check aliases for backward compatibility or alternative IDs
    const checkAliases: Record<string, string[]> = {
      secret_scan: ['secret_scan', 'secrets'],
      dependency_scan: ['dependency_scan', 'sca'],
      domain_tls_audit: ['domain_tls_audit', 'tls'],
      dast_zap: ['dast_zap', 'zap', 'dast'],
      sast: ['sast', 'malware_sast'],
      malware_scan: ['malware_scan'],
      capability_gate: ['capability_gate', 'host_capability_gate'],
      csp_headers_audit: ['csp_headers_audit'],
      sbom: ['sbom'],
      license_compliance: ['license_compliance'],
      ssrf: ['ssrf', 'preflight'],
      ingest: ['ingest'],
    };

    // Sort allowedKeys based on recorded order in stages if present, otherwise preserve logical sequence
    const sortedKeys = [...allowedKeys].sort((a, b) => {
      const getOrder = (key: string) => {
        const aliases = checkAliases[key] || [key];
        for (const alias of aliases) {
          if (stages[alias]?.order !== undefined) {
            return Number(stages[alias].order);
          }
          if (typeof stages[alias]?.name === 'string') {
            const m = stages[alias].name.match(/^(\d+)\./);
            if (m) return parseInt(m[1], 10);
          }
        }
        return allowedKeys.indexOf(key) + 1;
      };
      return getOrder(a) - getOrder(b);
    });

    return sortedKeys.map((key, idx) => {
      const meta = STAGE_CATALOG[key] || {
        id: key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        tool: 'Security Engine',
        icon: 'search',
        defaultTitle: 'Security Audit Check',
        description: 'Automated platform security audit.',
      };

      const aliases = checkAliases[key] || [key];
      let recorded = stages[key] || null;
      if (!recorded) {
        for (const a of aliases) {
          if (stages[a]) {
            recorded = stages[a];
            break;
          }
        }
      }

      const cleanTitle = (recorded?.name || meta.name).replace(/^\d+\.\s*/, '');
      return {
        id: key,
        index: idx + 1,
        name: `${idx + 1}. ${cleanTitle}`,
        title: cleanTitle,
        defaultTitle: meta.defaultTitle,
        icon: recorded?.icon || meta.icon,
        tool: recorded?.tool || meta.tool,
        description: meta.description,
        recorded,
      };
    });
  }, [stages, miniApp.securityChecks, miniApp.integrationMethod, isFlutterPackage]);

  const jenkinsBaseUrl = (process.env.NEXT_PUBLIC_JENKINS_URL || 'http://localhost:8085').replace(/\/+$/, '');
  const jenkinsJobUrl = `${jenkinsBaseUrl}/job/miniapp-validation/`;

  const handleReScan = async (checksToRun?: string[]) => {
    setIsReScanning(true);
    setShowConfigModal(false);
    setReScanMessage('Initiating security scan...');
    try {
      await miniappsApi.rescan(miniApp.id, checksToRun);
      setReScanMessage('Security scan initiated!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setReScanMessage(err.message || 'Failed to trigger scan.');
    } finally {
      setIsReScanning(false);
    }
  };

  const handleCancelScan = async () => {
    setIsCancelling(true);
    setReScanMessage('Cancelling / resetting validation status...');
    try {
      await miniappsApi.cancelValidation(miniApp.id);
      setReScanMessage('Scan cancelled. Status reset to FAILED.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setReScanMessage(err.message || 'Failed to cancel scan.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Real-time WebSocket connection for instantaneous stage updates
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000');
    const socket = io(socketUrl, {
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
      }, 2000);
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
        icon: STAGE_CATALOG[cId]?.icon || 'shield',
      };
    });
  }, [miniApp.securityChecks, miniApp.integrationMethod]);

  const isScanningActive = valStatus === 'RUNNING' || isReScanning;
  const completedStagesCount = activeStages.filter((st) => st.recorded?.status === 'COMPLETED').length;
  const runningStage = activeStages.find((st) => st.recorded?.status === 'RUNNING' || (!st.recorded && st.index === 1 && isScanningActive));
  const totalStagesCount = activeStages.length;
  const scanProgressPercent = totalStagesCount > 0
    ? Math.round((completedStagesCount / totalStagesCount) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Floating Toast Notification for Re-Scan / Status Actions */}
      {mounted && reScanMessage && createPortal(
        <div className="fixed bottom-6 right-6 z-[120] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
            <span className="text-sm font-semibold tracking-wide">{reScanMessage}</span>
            <button
              type="button"
              onClick={() => setReScanMessage(null)}
              className="ml-2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Executive Security Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center p-2 flex-shrink-0 transition-all ${
              isScanningActive
                ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/15 dark:border-amber-500/40 ring-2 ring-amber-500/20 animate-pulse'
                : scoreBg
            }`}>
              {isScanningActive ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <svg className="w-6 h-6 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span className="text-[9px] font-black tracking-wider text-amber-600 dark:text-amber-400 mt-1 uppercase">AUDITING</span>
                </div>
              ) : (
                <>
                  <span className={`text-2xl font-black ${scoreColor}`}>
                    {score !== null ? score : '--'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</span>
                </>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isFlutterPackage ? 'Package Security & Compliance Report' : 'Automated Security & Compliance Report'}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                  valStatus === 'PASSED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : valStatus === 'RUNNING'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-sm animate-pulse'
                    : valStatus === 'FAILED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}>
                  {valStatus === 'RUNNING' ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>SCANNING IN PROGRESS</span>
                    </>
                  ) : valStatus === 'PASSED' ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>PASSED</span>
                    </>
                  ) : valStatus === 'FAILED' ? (
                    <>
                      <XIcon className="w-3.5 h-3.5" />
                      <span>SECURITY AUDIT FAILED</span>
                    </>
                  ) : (
                    valStatus
                  )}
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

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {valStatus === 'RUNNING' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelScan}
                disabled={isCancelling}
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-sm h-10 px-3.5 flex items-center gap-1.5 font-semibold transition-all"
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
              className={`flex items-center gap-2 text-sm font-semibold h-10 px-4 transition-all ${
                isScanningActive ? 'opacity-90 shadow-md ring-2 ring-brand-500/20' : ''
              }`}
            >
              <svg className={`w-4 h-4 ${isScanningActive ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isScanningActive ? 'Running Security Scan...' : 'Re-Run Security Scan'}</span>
            </Button>
          </div>
        </div>

        {/* Live Scan Progress Bar Banner (when scan is active) */}
        {isScanningActive && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/5 dark:bg-slate-800/40 border border-brand-200/80 dark:border-brand-800/60 flex flex-col gap-2.5 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs font-bold animate-spin flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Security Pipeline Executing
                  </span>
                  {runningStage && (
                    <span className="text-xs font-medium text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-800">
                      Stage {runningStage.index} of {totalStagesCount}: {runningStage.title}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                {completedStagesCount}/{totalStagesCount} Checks Completed ({scanProgressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(scanProgressPercent, 8)}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Security Profile Tags */}
        <div className="mt-4 pt-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-slate-500" />
              <span>Active Security Scan Profile ({activeProfileChecks.length} checks enabled)</span>
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
                {getStageIcon(chk.id, "w-3.5 h-3.5 text-slate-500")}
                <span>{chk.name}</span>
                <span className="text-[10px] text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                  {chk.tool}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Jenkins Offline Fallback Notice Banner */}
      {report?.fallbackFromJenkins && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
              <ZapIcon className="w-5 h-5" />
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
                The primary Jenkins CI controller (<code>{jenkinsBaseUrl}</code>) could not be reached: <em>{report.fallbackReason || 'Connection Refused'}</em>. To prevent the pipeline from hanging, the security audit was automatically executed in-process using the Local Security Engine.
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
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-rose-900 dark:text-rose-200">
                {allFindings.length > 0
                  ? 'Security Audit: Action Required (Violations Detected)'
                  : 'Automated Security Pipeline Encountered an Error'}
              </h4>
              <p className="text-sm text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                {allFindings.length > 0
                  ? `Automated security checks detected ${allFindings.length} issue(s) (such as unauthorized permissions or policy violations). Please review the findings below and update the package to resolve them before resubmitting.`
                  : 'The automated validation pipeline encountered an execution error. Please check the Jenkins CI logs for details.'}
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
                <span>View CI Logs</span>
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
            let stageStatus = 'PENDING';
            if (isScanningActive) {
              if (recorded?.status === 'COMPLETED') stageStatus = 'COMPLETED';
              else if (recorded?.status === 'RUNNING') stageStatus = 'RUNNING';
              else if (recorded?.status === 'FAILED') stageStatus = 'FAILED';
              else if (!recorded && st.index === 1) stageStatus = 'RUNNING';
              else stageStatus = 'PENDING';
            } else {
              if (recorded?.status) stageStatus = valStatus === 'FAILED' && recorded.status === 'RUNNING' ? 'FAILED' : recorded.status;
              else stageStatus = valStatus === 'PASSED' ? 'COMPLETED' : 'PENDING';
            }

            const isCompleted = stageStatus === 'COMPLETED';
            const isRunning = stageStatus === 'RUNNING';
            const isFailed = stageStatus === 'FAILED';

            return (
              <div
                key={st.id}
                className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                  isRunning
                    ? 'border-l-4 border-l-brand-500 border-t border-r border-b border-brand-200 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-950/40 shadow-sm ring-1 ring-brand-500/20'
                    : isCompleted
                    ? 'border-l-4 border-l-emerald-500 border-t border-r border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : isFailed
                    ? 'border-l-4 border-l-rose-500 border-t border-r border-b border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/30'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 text-brand-600 dark:text-brand-400">{getStageIcon(st.id, "w-5 h-5")}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {st.name}
                      </h4>
                      {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                      )}
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {st.tool}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {recorded?.details || (isScanningActive && isRunning ? 'Analyzing target endpoint and running security checks...' : valStatus === 'FAILED' && isFailed ? 'Violations or unauthorized capabilities detected in this check.' : st.defaultTitle)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-xs sm:text-sm px-2.5 py-1 rounded-full font-mono font-semibold uppercase flex items-center gap-1.5 ${
                    isRunning
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-300 dark:border-brand-700 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : isFailed
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {isRunning && (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    )}
                    {isCompleted && <CheckIcon className="w-3.5 h-3.5" />}
                    <span>{stageStatus}</span>
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
      {mounted && showConfigModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-6 sm:pt-10 md:pt-12 pb-8 p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfigModal(false)}
          />

          {/* Modal Dialog Card */}
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[84vh] shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (pinned at top) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg border border-brand-100 dark:border-brand-800/50">
                  <ShieldIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Re-Configure Security Scan Profile
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select the automated security audits to run for this Mini App ({miniApp.integrationMethod})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <SecurityValidationSelector
                integrationMethod={miniApp.integrationMethod}
                selectedChecks={configuredChecks}
                onChange={setConfiguredChecks}
              />
            </div>

            {/* Footer (sticky at bottom) */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700">
                  {configuredChecks.length} {configuredChecks.length === 1 ? 'Check' : 'Checks'} Selected
                </span>
              </div>

              <div className="flex items-center gap-3">
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
        </div>,
        document.body
      )}
    </div>
  );
}
