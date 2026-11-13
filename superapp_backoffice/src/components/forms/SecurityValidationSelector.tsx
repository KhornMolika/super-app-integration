"use client";

import React, { useMemo, useEffect } from 'react';
import { ShieldCheckIcon, LockIcon, ClipboardCheckIcon } from '@/components/ui/Icons';

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
    accentColor: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800/60',
  },
  {
    id: 'access',
    title: 'Secrets & Capability Controls',
    description: 'Credential leak protection and host device capability gating.',
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
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK'].includes(method),
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
    description: 'Verifies requested native capabilities against SuperApp security policies.',
    tool: 'SuperApp Gatekeeper',
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

  const isPackage = normMethod === 'FLUTTER_PACKAGE' || normMethod === 'NATIVE_SDK';
  const linkClass =
    'font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {selectedCount} of {availableChecks.length}
          </span>{' '}
          scans on
        </p>
        <div className="flex items-center gap-4 text-xs">
          <button type="button" onClick={handleSelectRecommended} disabled={disabled || isRecommendedSelected} className={linkClass}>
            Use recommended
          </button>
          <button type="button" onClick={handleSelectAll} disabled={disabled || isAllSelected} className={linkClass}>
            Turn all on
          </button>
          <button type="button" onClick={handleClearAll} disabled={disabled || selectedCount === 0} className={linkClass}>
            Turn all off
          </button>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <LockIcon className="w-3.5 h-3.5 shrink-0" />
        {isPackage
          ? 'Always runs: package integrity check (SHA-256).'
          : 'Always runs: domain and network safety check.'}
      </p>

      {CATEGORY_DEFINITIONS.map((category) => {
        const checksInCat = availableChecks.filter((c) => c.category === category.id);
        if (checksInCat.length === 0) return null;

        return (
          <section key={category.id} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {category.title}
            </h3>
            <ul className="rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 overflow-hidden">
              {checksInCat.map((check) => {
                const isChecked = selectedChecks.includes(check.id);
                const isRec = check.isRecommended(normMethod);
                const inputId = `scan-${check.id}`;
                return (
                  <li key={check.id}>
                    <label
                      htmlFor={inputId}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(check.id)}
                        disabled={disabled}
                        className="mt-0.5 w-4 h-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{check.name}</span>
                          {isRec && <span className="text-xs text-slate-500 dark:text-slate-400">Recommended</span>}
                        </span>
                        <span className="block mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {check.description}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
