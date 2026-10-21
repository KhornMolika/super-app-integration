"use client";

import React from "react";

export function Section07SecurityCheckpoints() {
  const scanners = [
    {
      name: "Gitleaks",
      type: "Secrets Detection",
      desc: "Scans for API keys, AWS/GCP credentials, and JWT private secrets.",
    },
    {
      name: "Semgrep",
      type: "SAST Engine",
      desc: "Enforces sandbox rules, detects SQLi, and blocks disallowed Dart syntax.",
    },
    {
      name: "Trivy",
      type: "Dependency SCA",
      desc: "Audits transitive dependencies against official CVE vulnerability databases.",
    },
    {
      name: "OWASP ZAP",
      type: "DAST Scanner",
      desc: "Performs dynamic web scans for CSP compliance, open redirects, and SSRF.",
    },
  ];

  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <p className="leading-relaxed">
        Security validation is fully automated. Submissions failing Critical or High severity gates are immediately blocked with actionable line-by-line remediation logs.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scanners.map((scanner) => (
          <div
            key={scanner.name}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
          >
            <div className="flex items-center justify-between mb-1.5">
              <h5 className="font-bold text-slate-900 dark:text-white text-base">
                {scanner.name}
              </h5>
              <span className="text-xs uppercase font-bold text-brand-600 dark:text-brand-400">
                Hard Gate
              </span>
            </div>
            <span className="text-sm font-medium text-slate-500 block mb-2">
              {scanner.type}
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {scanner.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
