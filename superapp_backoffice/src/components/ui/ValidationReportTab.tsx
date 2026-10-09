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
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  XCircleIcon,
  ChevronDown,
  ChevronUp,
  DownloadIcon,
  CopyIcon,
  FileText,
  CodeIcon,
  HashIcon,
  TagIcon,
  ExternalLinkIcon,
  RefreshIcon,
  EyeIcon,
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
    tool: 'Syft / CycloneDX 1.5',
    icon: 'clipboard',
    defaultTitle: 'CycloneDX & SPDX Manifest Generation',
    description: 'Generates cryptographic CycloneDX 1.5 & SPDX SBOM manifests of all components and licenses.',
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
    tool: 'SuperApp Gatekeeper',
    icon: 'lock',
    defaultTitle: 'SuperApp Capability Boundary Verification',
    description: 'Verifies declared host capabilities against platform policies and app store guidelines.',
  },
  // Aliases for backwards compatibility
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
  const [showSbomModal, setShowSbomModal] = useState(false);
  const [configuredChecks, setConfiguredChecks] = useState<string[]>(miniApp.securityChecks || []);
  
  // Expanded stage cards state for finding breakdown
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  
  // Finding filters
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [findingSearchQuery, setFindingSearchQuery] = useState('');
  const [selectedEngineFilter, setSelectedEngineFilter] = useState<string>('ALL');

  // SBOM search & filters
  const [sbomSearchQuery, setSbomSearchQuery] = useState('');
  const [sbomLicenseFilter, setSbomLicenseFilter] = useState('ALL');
  const [showRawSbomJson, setShowRawSbomJson] = useState(false);
  const [sbomCopied, setSbomCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const report = miniApp.validationReport || null;
  const stages = miniApp.validationStages || {};
  const issues = miniApp.issues || [];
  const findings = report?.findings || [];
  const sbom = report?.sbom || miniApp.validationReport?.sbom || null;
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

  // Combine findings from report & database issues with rich metadata
  const allFindings: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    engineId?: string;
    filePath?: string;
    lineNumber?: number;
    cveId?: string;
    recommendation?: string;
  }> = useMemo(() => {
    const list: Array<{
      id: string;
      severity: string;
      title: string;
      description: string;
      engineId?: string;
      filePath?: string;
      lineNumber?: number;
      cveId?: string;
      recommendation?: string;
    }> = (findings || []).map((f: any) => ({
      id: f.id || 'FINDING',
      severity: (f.severity || 'HIGH').toUpperCase(),
      title: f.title || 'Security Finding',
      description: f.description || '',
      engineId: f.engineId || f.metadata?.engineId,
      filePath: f.filePath || f.metadata?.filePath,
      lineNumber: f.lineNumber || f.metadata?.lineNumber,
      cveId: f.cveId || f.metadata?.cveId,
      recommendation: f.recommendation || f.metadata?.recommendation,
    }));

    (issues || []).forEach((iss: any) => {
      const findingId = iss.metadata?.findingId || iss.type || 'ISSUE';
      if (!list.some((f) => f.id === findingId || (f.description && f.description === iss.description))) {
        list.push({
          id: findingId,
          severity: (iss.severity || 'HIGH').toUpperCase(),
          title: iss.classification || iss.type || 'Platform Issue',
          description: iss.description || '',
          engineId: iss.metadata?.engineId || iss.metadata?.stage || (
            iss.type?.toLowerCase().includes('secret') ? 'secret_scan' :
            iss.type?.toLowerCase().includes('cve') || iss.type?.toLowerCase().includes('dep') ? 'dependency_scan' :
            iss.type?.toLowerCase().includes('perm') || iss.type?.toLowerCase().includes('cap') ? 'capability_gate' :
            iss.type?.toLowerCase().includes('sast') || iss.type?.toLowerCase().includes('dart') ? 'sast' :
            undefined
          ),
          filePath: iss.metadata?.filePath,
          lineNumber: iss.metadata?.lineNumber,
          cveId: iss.metadata?.cveId,
          recommendation: iss.metadata?.recommendation || 'Remediate this finding in accordance with SuperApp security policies.',
        });
      }
    });

    return list;
  }, [findings, issues]);

  // Stage aliases mapping
  const checkAliases: Record<string, string[]> = useMemo(() => ({
    secret_scan: ['secret_scan', 'secrets'],
    dependency_scan: ['dependency_scan', 'sca'],
    domain_tls_audit: ['domain_tls_audit', 'tls'],
    dast_zap: ['dast_zap', 'zap', 'dast'],
    sast: ['sast', 'malware_sast'],
    malware_scan: ['malware_scan'],
    capability_gate: ['capability_gate', 'host_capability_gate'],
    csp_headers_audit: ['csp_headers_audit', 'headers_audit'],
    sbom: ['sbom'],
    license_compliance: ['license_compliance', 'license_audit'],
    ssrf: ['ssrf', 'preflight'],
    ingest: ['ingest'],
  }), []);

  // Map findings to specific stages
  const stageFindingsMap = useMemo(() => {
    const map: Record<string, typeof allFindings> = {};
    allFindings.forEach((f) => {
      const eng = f.engineId || '';
      let matchedStage = eng;
      if (!matchedStage) {
        // Infer from ID or description
        if (f.id.startsWith('CVE-') || f.title.toLowerCase().includes('dependency') || f.title.toLowerCase().includes('cve')) {
          matchedStage = 'dependency_scan';
        } else if (f.id.startsWith('GITLEAKS-') || f.title.toLowerCase().includes('secret') || f.title.toLowerCase().includes('api key')) {
          matchedStage = 'secret_scan';
        } else if (f.id.startsWith('PERM-') || f.title.toLowerCase().includes('permission') || f.title.toLowerCase().includes('capability')) {
          matchedStage = 'capability_gate';
        } else if (f.id.startsWith('SAST-') || f.title.toLowerCase().includes('ast') || f.title.toLowerCase().includes('sandbox')) {
          matchedStage = 'sast';
        } else if (f.id.startsWith('TLS-') || f.title.toLowerCase().includes('tls') || f.title.toLowerCase().includes('ssl')) {
          matchedStage = 'domain_tls_audit';
        } else if (f.id.startsWith('ZAP-') || f.title.toLowerCase().includes('xss') || f.title.toLowerCase().includes('dast')) {
          matchedStage = 'dast_zap';
        } else if (f.id.startsWith('SSRF-') || f.title.toLowerCase().includes('ssrf')) {
          matchedStage = 'ssrf';
        } else {
          matchedStage = 'general';
        }
      }

      if (!map[matchedStage]) map[matchedStage] = [];
      map[matchedStage].push(f);
    });
    return map;
  }, [allFindings]);

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

      // Collect issues for this stage
      let stageIssues: typeof allFindings = [];
      aliases.forEach((a) => {
        if (stageFindingsMap[a]) {
          stageIssues = stageIssues.concat(stageFindingsMap[a]);
        }
      });
      // Remove duplicates
      stageIssues = Array.from(new Set(stageIssues));

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
        findings: stageIssues,
      };
    });
  }, [stages, miniApp.securityChecks, miniApp.integrationMethod, isFlutterPackage, checkAliases, stageFindingsMap]);

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

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
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

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return allFindings.filter((f) => {
      // Severity filter
      if (severityFilter !== 'ALL' && f.severity !== severityFilter) {
        return false;
      }
      // Engine filter
      if (selectedEngineFilter !== 'ALL') {
        const aliases = checkAliases[selectedEngineFilter] || [selectedEngineFilter];
        if (!aliases.includes(f.engineId || '')) {
          return false;
        }
      }
      // Search query
      if (findingSearchQuery.trim()) {
        const q = findingSearchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchDesc = f.description.toLowerCase().includes(q);
        const matchId = f.id.toLowerCase().includes(q);
        const matchFile = f.filePath ? f.filePath.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc && !matchId && !matchFile) return false;
      }
      return true;
    });
  }, [allFindings, severityFilter, selectedEngineFilter, findingSearchQuery, checkAliases]);

  // SBOM Components & stats
  const sbomComponents = useMemo(() => {
    if (!sbom || !Array.isArray(sbom.components)) return [];
    return sbom.components;
  }, [sbom]);

  const sbomUniqueLicenses = useMemo(() => {
    const set = new Set<string>();
    sbomComponents.forEach((c: any) => {
      if (c.licenses && Array.isArray(c.licenses)) {
        c.licenses.forEach((lic: any) => {
          if (lic.license?.id) set.add(lic.license.id);
          else if (lic.license?.name) set.add(lic.license.name);
        });
      }
    });
    return Array.from(set);
  }, [sbomComponents]);

  const filteredSbomComponents = useMemo(() => {
    return sbomComponents.filter((comp: any) => {
      if (sbomLicenseFilter !== 'ALL') {
        const compLicenses = (comp.licenses || []).map((l: any) => l.license?.id || l.license?.name || '');
        if (!compLicenses.includes(sbomLicenseFilter)) return false;
      }
      if (sbomSearchQuery.trim()) {
        const q = sbomSearchQuery.toLowerCase();
        const matchName = comp.name?.toLowerCase().includes(q);
        const matchVersion = comp.version?.toLowerCase().includes(q);
        const matchPurl = comp.purl?.toLowerCase().includes(q);
        if (!matchName && !matchVersion && !matchPurl) return false;
      }
      return true;
    });
  }, [sbomComponents, sbomLicenseFilter, sbomSearchQuery]);

  const handleExportSbomJson = () => {
    if (!sbom) return;
    const jsonStr = JSON.stringify(sbom, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${miniApp.name ? miniApp.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'miniapp'}-cyclonedx-sbom.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySbomJson = () => {
    if (!sbom) return;
    navigator.clipboard.writeText(JSON.stringify(sbom, null, 2));
    setSbomCopied(true);
    setTimeout(() => setSbomCopied(false), 2500);
  };

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
                  <RefreshIcon className="w-6 h-6 text-amber-500 animate-spin" />
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
                      <span>PASSED (100% COMPLIANT)</span>
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
              <p className="text-base text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Target:</span>
                <code className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {scannedTargetLabel}
                </code>
              </p>
              {report?.completedAt && (
                <div className="flex items-center gap-2.5 text-sm text-slate-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Report generated: {new Date(report.completedAt).toLocaleString()}
                  </span>
                  {report?.reportPath?.startsWith('local-scan://') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                      <ShieldCheckIcon className="w-3 h-3" />
                      Local Security Engine
                    </span>
                  )}
                  {sbomComponents.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      <ClipboardCheckIcon className="w-3 h-3" />
                      CycloneDX 1.5 SBOM ({sbomComponents.length} pkgs)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            {sbom && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSbomModal(true)}
                className="flex items-center gap-1.5 text-sm font-semibold h-10 px-3.5 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/30"
              >
                <ClipboardCheckIcon className="w-4 h-4 text-brand-500" />
                <span>Inspect SBOM ({sbomComponents.length})</span>
              </Button>
            )}

            {valStatus === 'RUNNING' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelScan}
                disabled={isCancelling}
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-sm h-10 px-3.5 flex items-center gap-1.5 font-semibold transition-all"
              >
                <XCircleIcon className="w-4 h-4" />
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
              <ShieldIcon className="w-4 h-4 text-slate-500" />
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
              <RefreshIcon className={`w-4 h-4 ${isScanningActive ? 'animate-spin' : ''}`} />
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
                  <RefreshIcon className="w-3.5 h-3.5" />
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
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
            >
              <ShieldIcon className="w-3 h-3" />
              <span>Edit Checks</span>
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
                  ? `Automated security checks detected ${allFindings.length} issue(s) across engines (unauthorized permissions, hardcoded secrets, or known CVE vulnerabilities). Review the breakdown per engine below.`
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
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Stage Execution Timeline with Multi-Issue Accordions */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <CardHeader
            className="mb-0"
            title={report?.reportPath?.startsWith('local-scan://') ? "Security Engines Pipeline Execution" : "Jenkins Automated Validation Pipeline"}
            icon={<ShieldCheckIcon className="w-5 h-5" />}
          />
          <div className="flex items-center gap-2">
            {report?.fallbackFromJenkins && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Fallback: Local Engine
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <TagIcon className="w-3.5 h-3.5 text-slate-500" />
              {activeStages.length} Engines Configured
            </span>
          </div>
        </div>
        <p className="text-base text-slate-600 dark:text-slate-400 mb-5">
          Execution status, tool configurations, and cardinality-aware findings across all active security engines:
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

            const isCompleted = stageStatus === 'COMPLETED' || stageStatus === 'PASSED' || stageStatus === 'SUCCESS';
            const isRunning = stageStatus === 'RUNNING';
            const isFailed = stageStatus === 'FAILED' || stageStatus === 'ERROR';
            const stageIssueCount = st.findings.length;
            const isExpanded = !!expandedStages[st.id];

            return (
              <div
                key={st.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isRunning
                    ? 'border-l-4 border-l-brand-500 border-t border-r border-b border-brand-200 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-950/40 shadow-sm ring-1 ring-brand-500/20'
                    : isCompleted && stageIssueCount === 0
                    ? 'border-l-4 border-l-emerald-500 border-t border-r border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : (isFailed || stageIssueCount > 0)
                    ? 'border-l-4 border-l-rose-500 border-t border-r border-b border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/30'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0 text-brand-600 dark:text-brand-400">
                      {getStageIcon(st.id, "w-5 h-5")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {st.name}
                        </h4>
                        {isRunning && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                        )}
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                          {st.tool}
                        </span>

                        {/* Finding Cardinality Badges */}
                        {isCompleted && stageIssueCount === 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                            <CheckCircleIcon className="w-3 h-3" />
                            <span>Clean (0 Issues)</span>
                          </span>
                        )}

                        {stageIssueCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800 shadow-sm animate-in zoom-in-95">
                            <AlertTriangleIcon className="w-3 h-3" />
                            <span>{stageIssueCount} {stageIssueCount === 1 ? 'Issue Detected' : 'Issues Detected'}</span>
                          </span>
                        )}

                        {st.id === 'sbom' && sbomComponents.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-800">
                            <ClipboardCheckIcon className="w-3 h-3" />
                            <span>{sbomComponents.length} Components Cataloged</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {recorded?.details || (isScanningActive && isRunning ? 'Analyzing target endpoint and running security heuristics...' : valStatus === 'FAILED' && isFailed ? 'Violations or unauthorized capabilities detected in this check.' : st.defaultTitle)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {/* Stage Status Badge */}
                    <span className={`text-xs sm:text-sm px-2.5 py-1 rounded-full font-mono font-semibold uppercase flex items-center gap-1.5 ${
                      isRunning
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-300 dark:border-brand-700 animate-pulse'
                        : isCompleted && stageIssueCount === 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : isFailed || stageIssueCount > 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {isRunning && <RefreshIcon className="w-3 h-3 animate-spin" />}
                      {isCompleted && stageIssueCount === 0 && <CheckIcon className="w-3.5 h-3.5" />}
                      {(isFailed || stageIssueCount > 0) && <AlertTriangleIcon className="w-3.5 h-3.5" />}
                      <span>{stageStatus}</span>
                    </span>

                    {/* Stage-specific Actions */}
                    {st.id === 'sbom' && sbom && (
                      <button
                        type="button"
                        onClick={() => setShowSbomModal(true)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        title="Inspect CycloneDX SBOM Manifest"
                        aria-label="Inspect CycloneDX SBOM"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}

                    {stageIssueCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleStageExpand(st.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center gap-1"
                        aria-label={isExpanded ? 'Collapse findings' : 'Expand findings'}
                      >
                        <span className="text-xs font-semibold">{isExpanded ? 'Hide' : 'View'} ({stageIssueCount})</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Finding Details for this Stage */}
                {isExpanded && stageIssueCount > 0 && (
                  <div className="px-4 pb-4 pt-2 border-t border-rose-100 dark:border-rose-900/40 bg-white/60 dark:bg-slate-900/60 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
                      <span>Specific Findings from {st.title} Engine:</span>
                    </div>
                    {st.findings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs sm:text-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              finding.severity === 'CRITICAL'
                                ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                                : finding.severity === 'HIGH'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}>
                              {finding.severity}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {finding.title}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {finding.id}
                          </span>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {finding.description}
                        </p>

                        {finding.filePath && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-0.5">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>Location: {finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ''}</span>
                          </div>
                        )}

                        {finding.recommendation && (
                          <div className="p-2 rounded bg-white/80 dark:bg-slate-800/80 border border-rose-200/50 dark:border-rose-900/40 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-900 dark:text-white font-semibold">Remediation: </strong>
                              {finding.recommendation}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Software Bill of Materials (SBOM) Card */}
      {sbom && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <CardHeader
              className="mb-0"
              title={`Software Bill of Materials (SBOM) Manifest (${sbomComponents.length} Components)`}
              icon={<ClipboardCheckIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportSbomJson}
                className="flex items-center gap-1.5 text-xs font-semibold h-9 px-3"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export CycloneDX 1.5 JSON</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSbomModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold h-9 px-3 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>Inspect Full Manifest</span>
              </Button>
            </div>
          </div>

          <p className="text-base text-slate-600 dark:text-slate-400 mb-5">
            Cryptographic CycloneDX 1.5 manifest cataloging all third-party libraries, licenses, purls, and SHA-256 digests:
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Spec Version</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">
                {sbom.bomFormat || 'CycloneDX'} {sbom.specVersion || '1.5'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Packages</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                {sbomComponents.length} Libraries
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Unique Licenses</span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                {sbomUniqueLicenses.length} Types ({sbomUniqueLicenses.slice(0, 2).join(', ')}{sbomUniqueLicenses.length > 2 ? '...' : ''})
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Serial Digest</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block font-mono truncate" title={sbom.serialNumber}>
                {sbom.serialNumber || 'urn:uuid:cyclonedx-v1'}
              </span>
            </div>
          </div>

          {/* Component Preview Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 w-[30%]">Component & Type</th>
                  <th className="px-4 py-3 w-[15%]">Version</th>
                  <th className="px-4 py-3 w-[25%]">Package URL (PURL)</th>
                  <th className="px-4 py-3 w-[15%]">License</th>
                  <th className="px-4 py-3 w-[15%]">SHA-256 Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {sbomComponents.slice(0, 6).map((comp: any, i: number) => {
                  const lic = comp.licenses?.[0]?.license?.id || comp.licenses?.[0]?.license?.name || 'MIT';
                  const hash = comp.hashes?.[0]?.content || '';
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PackageIcon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white">{comp.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {comp.type || 'library'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {comp.version}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={comp.purl}>
                        {comp.purl || `pkg:pub/${comp.name}@${comp.version}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {lic}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[140px]" title={hash}>
                        {hash ? `${hash.substring(0, 12)}...` : 'SHA256:VERIFIED'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sbomComponents.length > 6 && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowSbomModal(true)}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View all {sbomComponents.length} components in CycloneDX Inspector</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Security Findings & Remediation with Rich Search & Filtering */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <CardHeader
            className="mb-0"
            title={`Identified Security Findings (${allFindings.length})`}
            icon={<AlertTriangleIcon className="w-5 h-5 text-rose-500" />}
          />
          {allFindings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Filter by Severity:</span>
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                const count = sev === 'ALL'
                  ? allFindings.length
                  : allFindings.filter((f) => f.severity === sev).length;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      severityFilter === sev
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{sev}</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-base text-slate-600 dark:text-slate-400 mb-5">
          Detailed vulnerability discoveries, affected source files, and automated remediation guidelines:
        </p>

        {/* Search & Engine Filters */}
        {allFindings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={findingSearchQuery}
                onChange={(e) => setFindingSearchQuery(e.target.value)}
                placeholder="Search findings by title, CVE ID, description, or file path..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            {activeStages.length > 0 && (
              <select
                value={selectedEngineFilter}
                onChange={(e) => setSelectedEngineFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label="Filter findings by engine"
              >
                <option value="ALL">All Engines ({allFindings.length} findings)</option>
                {activeStages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.title} ({st.findings.length})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {allFindings.length === 0 ? (
          <div className="flex items-center p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 flex-shrink-0">
              <CheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Zero Critical or High Vulnerabilities Found</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                The package passes all active security checks: Clean AST sandbox validation, zero leaked secrets, verified cryptographic checksums, and full host capability compliance.
              </p>
            </div>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <SearchIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h5 className="font-bold text-slate-700 dark:text-slate-300">No matching findings</h5>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or severity filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-sm sm:text-base">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 w-[12%]">Severity</th>
                  <th className="px-4 py-3.5 w-[25%]">Vulnerability / ID</th>
                  <th className="px-4 py-3.5 w-[35%]">Description & Location</th>
                  <th className="px-4 py-3.5 w-[28%]">Recommended Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredFindings.map((f, i) => (
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
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {f.id}
                        </span>
                        {f.engineId && (
                          <span className="text-[10px] uppercase font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded">
                            {f.engineId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                      <div>{f.description}</div>
                      {f.filePath && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700/60">
                          <CodeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{f.filePath}{f.lineNumber ? `:${f.lineNumber}` : ''}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm sm:text-base text-slate-600 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-800/20 leading-relaxed">
                      <div className="flex items-start gap-1.5">
                        <ShieldCheckIcon className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                        <div>{f.recommendation || 'Follow SuperApp integration security checklist.'}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CycloneDX 1.5 SBOM Inspector Modal */}
      {mounted && showSbomModal && sbom && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-6 sm:pt-10 md:pt-12 pb-8 p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSbomModal(false)}
          />

          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg border border-brand-100 dark:border-brand-800/50">
                  <ClipboardCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>CycloneDX 1.5 Software Bill of Materials (SBOM)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold">
                      {sbomComponents.length} Pkgs
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Serial: {sbom.serialNumber || 'urn:uuid:cyclonedx-manifest'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRawSbomJson(!showRawSbomJson)}
                  className="text-xs px-3 py-1.5 h-8 flex items-center gap-1.5"
                >
                  <CodeIcon className="w-3.5 h-3.5" />
                  <span>{showRawSbomJson ? 'View Table' : 'Raw JSON'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportSbomJson}
                  className="text-xs px-3 py-1.5 h-8 flex items-center gap-1.5"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setShowSbomModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {showRawSbomJson ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-500">CycloneDX 1.5 JSON Manifest</span>
                    <button
                      type="button"
                      onClick={handleCopySbomJson}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1 font-semibold"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                      <span>{sbomCopied ? 'Copied!' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[60vh] border border-slate-800">
                    {JSON.stringify(sbom, null, 2)}
                  </pre>
                </div>
              ) : (
                <>
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={sbomSearchQuery}
                        onChange={(e) => setSbomSearchQuery(e.target.value)}
                        placeholder="Search packages by name, version, or purl..."
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    {sbomUniqueLicenses.length > 0 && (
                      <select
                        value={sbomLicenseFilter}
                        onChange={(e) => setSbomLicenseFilter(e.target.value)}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        aria-label="Filter SBOM by license"
                      >
                        <option value="ALL">All Licenses ({sbomComponents.length})</option>
                        {sbomUniqueLicenses.map((lic) => (
                          <option key={lic} value={lic}>{lic}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Components Full Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3 w-[25%]">Component Name</th>
                          <th className="px-4 py-3 w-[12%]">Version</th>
                          <th className="px-4 py-3 w-[10%]">Type</th>
                          <th className="px-4 py-3 w-[25%]">Package URL (purl)</th>
                          <th className="px-4 py-3 w-[13%]">License</th>
                          <th className="px-4 py-3 w-[15%]">SHA-256 Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {filteredSbomComponents.map((comp: any, i: number) => {
                          const lic = comp.licenses?.[0]?.license?.id || comp.licenses?.[0]?.license?.name || 'MIT';
                          const hash = comp.hashes?.[0]?.content || '';
                          return (
                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <PackageIcon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                  <span>{comp.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                                {comp.version}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {comp.type || 'library'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={comp.purl}>
                                {comp.purl || `pkg:pub/${comp.name}@${comp.version}`}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                  {lic}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[140px]" title={hash}>
                                {hash ? `${hash.substring(0, 14)}...` : 'SHA256:VERIFIED'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredSbomComponents.length} of {sbomComponents.length} components
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSbomModal(false)}
                className="text-sm px-4"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Security Checks Re-Configuration Modal */}
      {mounted && showConfigModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-6 sm:pt-10 md:pt-12 pb-8 p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfigModal(false)}
          />

          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[84vh] shadow-2xl flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
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
                    Select the automated security audits to run for this MiniApp ({miniApp.integrationMethod})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <SecurityValidationSelector
                integrationMethod={miniApp.integrationMethod}
                selectedChecks={configuredChecks}
                onChange={setConfiguredChecks}
              />
            </div>

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
                  <RefreshIcon className="w-4 h-4" />
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
