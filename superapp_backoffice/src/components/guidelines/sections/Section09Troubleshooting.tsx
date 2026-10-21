"use client";

import React from "react";

export function Section09Troubleshooting() {
  const issues = [
    {
      issue: "BUILD_FAILED: Multiple conflicting versions of Flutter SDK",
      cause: "MiniApp pubspec.yaml specifies an incompatible SDK range.",
      fix: 'Align environment constraint to match SuperApp runtime (e.g. sdk: ">=3.2.0 <4.0.0").',
    },
    {
      issue: "SECURITY_CHECK_FAILED: Gitleaks detected sensitive key in assets",
      cause: "Hardcoded staging/dev API secret or private key committed in source repository.",
      fix: "Remove token from Git history, rotate credential, and retrieve keys via SuperAppSDK auth context.",
    },
    {
      issue: "WEBVIEW_SSRF_DETECTED: Destination points to RFC 1918 private IP",
      cause: "Target URL resolves to private internal subnets (e.g. 192.168.x.x or 10.x.x.x).",
      fix: "Provide a publicly reachable HTTPS domain with valid TLS certificates.",
    },
  ];

  return (
    <div className="space-y-3 text-base text-slate-600 dark:text-slate-300">
      {issues.map((item, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2"
        >
          <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
            {item.issue}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-900 dark:text-white">Cause: </span>
            {item.cause}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Fix: </span>
            {item.fix}
          </p>
        </div>
      ))}
    </div>
  );
}
