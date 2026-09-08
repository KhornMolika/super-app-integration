"use client";

import React, { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/inputs';

export interface SecurityCheckItem {
  id: string;
  name: string;
  description: string;
  tool: string;
  methods: ('WEBVIEW' | 'FLUTTER_PACKAGE' | 'NATIVE_SDK' | 'DEEP_LINK')[];
  isRecommended: (method: string) => boolean;
}

export const ALL_SECURITY_CHECKS: SecurityCheckItem[] = [
  {
    id: 'dependency_scan',
    name: 'Dependency Vulnerability Scan',
    description: 'Scans third-party packages and libraries for known CVE vulnerabilities and outdated insecure dependencies.',
    tool: 'Trivy / OSV / Audit',
    methods: ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK', 'WEBVIEW'].includes(method),
  },
  {
    id: 'secret_scan',
    name: 'Secret & API Key Leak Detection',
    description: 'Detects exposed hardcoded private keys, JWT secrets, API tokens, and credentials in code and configs.',
    tool: 'Gitleaks / TruffleHog',
    methods: ['WEBVIEW', 'FLUTTER_PACKAGE', 'NATIVE_SDK', 'DEEP_LINK'],
    isRecommended: () => true,
  },
  {
    id: 'sbom',
    name: 'Software Bill of Materials (SBOM)',
    description: 'Generates cryptographic CycloneDX & SPDX SBOM manifests of all software packages and sub-dependencies.',
    tool: 'Syft / CycloneDX',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK'].includes(method),
  },
  {
    id: 'sast',
    name: 'Static Application Security Testing (SAST)',
    description: 'Analyzes source code for security flaws, unsafe memory operations, and OWASP Top 10 vulnerabilities.',
    tool: 'Semgrep / SonarQube',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: (method) => ['FLUTTER_PACKAGE', 'NATIVE_SDK'].includes(method),
  },
  {
    id: 'domain_tls_audit',
    name: 'Domain TLS/SSL & Transport Security',
    description: 'Audits TLS 1.2/1.3 cipher suites, HTTPS certificate validity, HSTS headers, and SSRF routing.',
    tool: 'testssl.sh / SSL Labs',
    methods: ['WEBVIEW', 'DEEP_LINK'],
    isRecommended: (method) => ['WEBVIEW', 'DEEP_LINK'].includes(method),
  },
  {
    id: 'csp_headers_audit',
    name: 'Security Headers & CSP Audit',
    description: 'Verifies Content-Security-Policy, X-Frame-Options, CORS origins, and cookie security flags.',
    tool: 'OWASP ZAP / Header Audit',
    methods: ['WEBVIEW'],
    isRecommended: (method) => method === 'WEBVIEW',
  },
  {
    id: 'dast_zap',
    name: 'Dynamic Application Security Scan (DAST)',
    description: 'Dynamic probing for cross-site scripting (XSS), CSRF, directory traversal, and endpoint exposure.',
    tool: 'OWASP ZAP DAST',
    methods: ['WEBVIEW'],
    isRecommended: (method) => method === 'WEBVIEW',
  },
  {
    id: 'malware_scan',
    name: 'Malware & Binary Signature Scan',
    description: 'Deep signature and heuristic inspection of compiled binaries, archives, and assets for malicious payloads.',
    tool: 'ClamAV / YARA',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: () => false, // Optional deep scan
  },
  {
    id: 'license_compliance',
    name: 'Open Source License Compliance',
    description: 'Verifies dependency licenses against platform IP guidelines (flags restrictive AGPL/GPL copyleft licenses).',
    tool: 'FOSSA / License-Checker',
    methods: ['FLUTTER_PACKAGE', 'NATIVE_SDK'],
    isRecommended: () => false, // Optional governance scan
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

  return (
    <div className="space-y-4">
      {/* Header with description & quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Security Validation Profile</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50">
              {selectedCount} of {availableChecks.length} Selected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure the automated security checks Jenkins will execute for this Mini App.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleSelectRecommended}
            disabled={disabled}
            className="text-xs h-7 !px-2.5 !py-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-none"
          >
            ★ Select Recommended
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs h-7 !px-2.5 !py-0 text-slate-700 dark:text-slate-300 shadow-none"
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            disabled={disabled}
            className="text-xs h-7 !px-2.5 !py-0 text-slate-500 dark:text-slate-400 shadow-none"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Security Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableChecks.map((check) => {
          const isChecked = selectedChecks.includes(check.id);
          const isRec = check.isRecommended(normMethod);

          return (
            <div
              key={check.id}
              onClick={() => toggleCheck(check.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                isChecked
                  ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/40 dark:bg-brand-950/20'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600'
              } ${disabled ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCheck(check.id)}
                  disabled={disabled}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-600 focus:ring-brand-500 cursor-pointer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {check.name}
                  </span>

                  {isRec && (
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Recommended
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-auto">
                    {check.tool}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {check.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
