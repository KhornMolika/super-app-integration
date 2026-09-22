"use client";

import React, { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/inputs';
import {
  StarIcon,
  PackageIcon,
  GlobeIcon,
  ShieldCheckIcon,
  ShieldIcon,
  KeyIcon,
  LockIcon,
  ZapIcon,
  VirusIcon,
  DocumentTextIcon,
  ClipboardCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  XCircleIcon,
} from '@/components/ui/Icons';

export type CheckCategory = 'vulnerability' | 'access' | 'supply_chain';

export interface SecurityCheckItem {
  id: string;
  name: string;
  description: string;
  tool: string;
  category: CheckCategory;
  methods: ('WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK')[];
  isRecommended: (method: string) => boolean;
}

export const CATEGORY_DEFINITIONS: {
  id: CheckCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  {
    id: 'vulnerability',
    title: 'Vulnerability & Code Analysis',
    description: 'Deep static analysis, dependency scanning, and dynamic probing.',
    icon: ShieldCheckIcon,
    accentColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60',
  },
  {
    id: 'access',
    title: 'Secrets & Capability Controls',
    description: 'Credential leak protection and host device permission gating.',
    icon: LockIcon,
    accentColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
  },
  {
    id: 'supply_chain',
    title: 'Supply Chain & Governance',
    description: 'Cryptographic SBOM generation, binary forensics, and copyleft IP audit.',
    icon: ClipboardCheckIcon,
    accentColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
  },
];

export const ALL_SECURITY_CHECKS: SecurityCheckItem[] = [
  {
    id: 'sast',
    name: 'Static Application Security Testing (SAST)',
    description: 'Analyzes source code for security flaws, unsafe memory operations, and prohibited native calls.',
    tool: 'Semgrep / AST Guard',
    category: 'vulnerability',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK'].includes(method),
  },
  {
    id: 'dependency_scan',
    name: 'Dependency Vulnerability Scan',
    description: 'Scans third-party packages and libraries for known CVE vulnerabilities and outdated insecure dependencies.',
    tool: 'Trivy / OSV / Audit',
    category: 'vulnerability',
    methods: ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK', 'WEBVIEW'].includes(method),
  },
  {
    id: 'domain_tls_audit',
    name: 'Domain TLS/SSL & Transport Security',
    description: 'Audits TLS 1.2/1.3 cipher suites, HTTPS certificate validity, HSTS headers, and network routing.',
    tool: 'testssl.sh / SSL Labs',
    category: 'vulnerability',
    methods: ['WEBVIEW', 'DEEP_LINK'],
    isRecommended: (method) => ['WEBVIEW', 'DEEP_LINK'].includes(method),
  },
  {
    id: 'csp_headers_audit',
    name: 'Security Headers & CSP Audit',
    description: 'Verifies Content-Security-Policy, X-Frame-Options, CORS origins, and cookie security flags.',
    tool: 'OWASP ZAP / Header Audit',
    category: 'vulnerability',
    methods: ['WEBVIEW'],
    isRecommended: (method) => method === 'WEBVIEW',
  },
  {
    id: 'dast_zap',
    name: 'Dynamic Application Security Scan (DAST)',
    description: 'Dynamic probing for cross-site scripting (XSS), CSRF, directory traversal, and endpoint exposure.',
    tool: 'OWASP ZAP DAST',
    category: 'vulnerability',
    methods: ['WEBVIEW'],
    isRecommended: (method) => method === 'WEBVIEW',
  },
  {
    id: 'secret_scan',
    name: 'Secret & API Key Leak Detection',
    description: 'Detects exposed hardcoded private keys, JWT secrets, API tokens, and credentials in code and configs.',
    tool: 'Gitleaks / TruffleHog',
    category: 'access',
    methods: ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'],
    isRecommended: () => true,
  },
  {
    id: 'capability_gate',
    name: 'Host Capability Gatekeeper Audit',
    description: 'Verifies requested native capabilities and permissions against Super App security policies.',
    tool: 'Super App Gatekeeper',
    category: 'access',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'].includes(method),
  },
  {
    id: 'sbom',
    name: 'Software Bill of Materials (SBOM)',
    description: 'Generates cryptographic CycloneDX & SPDX SBOM manifests of all software packages and sub-dependencies.',
    tool: 'Syft / CycloneDX',
    category: 'supply_chain',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK'].includes(method),
  },
  {
    id: 'malware_scan',
    name: 'Malware & Binary Signature Scan',
    description: 'Deep signature and heuristic inspection of compiled binaries, archives, and assets for malicious payloads.',
    tool: 'ClamAV / YARA',
    category: 'supply_chain',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: () => false,
  },
  {
    id: 'license_compliance',
    name: 'Open Source License Compliance',
    description: 'Verifies dependency licenses against platform IP guidelines (flags restrictive AGPL/GPL copyleft licenses).',
    tool: 'FOSSA / License-Checker',
    category: 'supply_chain',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: () => false,
  },
];

export function getRecommendedChecksForMethod(method: string): string[] {
  const normMethod = (method || 'WEBVIEW').toUpperCase();
  return ALL_SECURITY_CHECKS.filter(
    (c) => c.methods.includes(normMethod as any) && c.isRecommended(normMethod)
  ).map((c) => c.id);
}

function renderCheckIcon(checkId: string, className = "w-5 h-5") {
  switch (checkId) {
    case 'sast':
      return <ShieldCheckIcon className={className} />;
    case 'dependency_scan':
      return <PackageIcon className={className} />;
    case 'secret_scan':
      return <KeyIcon className={className} />;
    case 'capability_gate':
      return <LockIcon className={className} />;
    case 'sbom':
      return <ClipboardCheckIcon className={className} />;
    case 'malware_scan':
      return <VirusIcon className={className} />;
    case 'license_compliance':
      return <DocumentTextIcon className={className} />;
    case 'domain_tls_audit':
      return <GlobeIcon className={className} />;
    case 'csp_headers_audit':
      return <ShieldIcon className={className} />;
    case 'dast_zap':
      return <ZapIcon className={className} />;
    default:
      return <ShieldIcon className={className} />;
  }
}

interface SecurityValidationSelectorProps {
  integrationMethod: string;
  selectedChecks: string[];
  onChange: (checks: string[]) => void;
  disabled?: boolean;
}

export default function SecurityValidationSelector({
  integrationMethod,
  selectedChecks = [],
  onChange,
  disabled = false,
}: SecurityValidationSelectorProps) {
  const normMethod = (integrationMethod || 'WEBVIEW').toUpperCase();

  const availableChecks = useMemo(() => {
    return ALL_SECURITY_CHECKS.filter((c) => c.methods.includes(normMethod as any));
  }, [normMethod]);

  const recommendedChecks = useMemo(() => {
    return availableChecks.filter((c) => c.isRecommended(normMethod)).map((c) => c.id);
  }, [availableChecks, normMethod]);

  // If selectedChecks is empty on first load, initialize with recommended checks
  useEffect(() => {
    if ((!selectedChecks || selectedChecks.length === 0) && recommendedChecks.length > 0) {
      onChange(recommendedChecks);
    }
  }, [normMethod]);

  const toggleCheck = (id: string) => {
    if (disabled) return;
    if (selectedChecks.includes(id)) {
      onChange(selectedChecks.filter((c) => c !== id));
    } else {
      onChange([...selectedChecks, id]);
    }
  };

  const handleSelectRecommended = () => {
    if (disabled) return;
    onChange(recommendedChecks);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(availableChecks.map((c) => c.id));
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const selectedCount = selectedChecks.filter((id) =>
    availableChecks.some((c) => c.id === id)
  ).length;

  const isAllSelected = availableChecks.length > 0 && selectedCount === availableChecks.length;
  const isRecommendedSelected =
    recommendedChecks.length > 0 &&
    recommendedChecks.length === selectedCount &&
    recommendedChecks.every((id) => selectedChecks.includes(id));

  return (
    <div className="space-y-5">
      {/* Header with description & quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Security Validation Profile</span>
            </h4>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isAllSelected
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300 border border-brand-300 dark:border-brand-700'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
            }`}>
              <CheckIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              {selectedCount} of {availableChecks.length} Selected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure automated CI/CD security audits and compliance gates for this Mini App.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleSelectRecommended}
            disabled={disabled}
            className={`text-xs sm:text-sm h-8 !px-3 font-semibold transition-all inline-flex items-center gap-1.5 shadow-none ${
              isRecommendedSelected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/50'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            }`}
          >
            <StarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Recommended</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSelectAll}
            disabled={disabled}
            className={`text-xs sm:text-sm h-8 !px-3 font-semibold transition-all inline-flex items-center gap-1.5 shadow-none ${
              isAllSelected
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300 border-brand-300 dark:border-brand-700 ring-1 ring-brand-400/50'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircleIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Select All</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            disabled={disabled || selectedCount === 0}
            className="text-xs sm:text-sm h-8 !px-3 font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-slate-200 dark:border-slate-700 shadow-none inline-flex items-center gap-1.5"
          >
            <XCircleIcon className="w-3.5 h-3.5" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* Mandatory Check Banner */}
      <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
            {normMethod === 'FLUTTER_PACKAGE' || normMethod === 'NATIVE_SDK' ? (
              <PackageIcon className="w-4 h-4" />
            ) : (
              <GlobeIcon className="w-4 h-4" />
            )}
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {normMethod === 'FLUTTER_PACKAGE' || normMethod === 'NATIVE_SDK'
                ? 'Stage 1: Source Ingestion & Integrity Verification (SHA-256 Digest)'
                : 'Stage 1: Pre-Flight & SSRF Defense (DNS & Private IP Scope)'}
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Automatically enforced pipeline baseline for all {normMethod.replace('_', ' ')} submissions.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] shrink-0 border border-slate-300 dark:border-slate-600">
          Enforced
        </span>
      </div>

      {/* Categorized Security Checks */}
      <div className="space-y-5">
        {CATEGORY_DEFINITIONS.map((category) => {
          const checksInCat = availableChecks.filter((c) => c.category === category.id);
          if (checksInCat.length === 0) return null;

          const selectedInCat = checksInCat.filter((c) => selectedChecks.includes(c.id)).length;
          const CategoryIcon = category.icon;

          return (
            <div
              key={category.id}
              className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/40 p-4 space-y-3"
            >
              {/* Category Subheader */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${category.accentColor}`}>
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {category.title}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {category.description}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {selectedInCat} of {checksInCat.length}
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {checksInCat.map((check) => {
                  const isChecked = selectedChecks.includes(check.id);
                  const isRec = check.isRecommended(normMethod);

                  return (
                    <div
                      key={check.id}
                      onClick={() => toggleCheck(check.id)}
                      className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                        isChecked
                          ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/50 dark:bg-brand-950/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                      } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="pt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(check.id)}
                          disabled={disabled}
                          className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </div>

                      {/* Icon Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isChecked
                          ? 'bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-700'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {renderCheckIcon(check.id, "w-4 h-4")}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-sm font-bold ${
                            isChecked
                              ? 'text-brand-950 dark:text-white'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {check.name}
                          </span>

                          {isRec && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <StarIcon className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              Recommended
                            </span>
                          )}

                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                            {check.tool}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {check.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
