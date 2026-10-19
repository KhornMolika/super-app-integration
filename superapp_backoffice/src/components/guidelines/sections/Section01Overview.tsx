"use client";

import React from "react";
import { UserIcon, ShieldIcon, SettingsIcon } from "@/components/ui/Icons";

export function Section01Overview() {
  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <p className="leading-relaxed">
        The SuperApp MiniApp ecosystem provides a high-performance, sandboxed runtime enabling autonomous delivery of vertical services. The platform strictly isolates third-party business logic while enabling standardized access to device features and SuperApp APIs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Role 1: MiniApp Developer */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <UserIcon />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-lg">MiniApp Developer (MA Manager)</h4>
          <span className="inline-block px-2.5 py-0.5 text-sm font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            External / MiniApp Team
          </span>
          <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
            <li>• Registers MiniApp metadata &amp; icon</li>
            <li>• Configures integration method &amp; source</li>
            <li>• Reviews declared capability claims</li>
            <li>• Resolves validation &amp; security findings</li>
            <li>• Performs acceptance testing on test builds</li>
          </ul>
        </div>

        {/* Role 2: SuperApp Admin */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldIcon />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-lg">SuperApp Admin (SA Admin)</h4>
          <span className="inline-block px-2.5 py-0.5 text-sm font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            SuperApp Platform Owner
          </span>
          <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
            <li>• Reviews integration contracts</li>
            <li>• Approves new capability requests</li>
            <li>• Audits automated security scans</li>
            <li>• Authorizes CI integration builds</li>
            <li>• Grants final release activation</li>
          </ul>
        </div>

        {/* Role 3: Automated CI/CD Engine */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <SettingsIcon />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-lg">Automated CI/CD Engine (Jenkins)</h4>
          <span className="inline-block px-2.5 py-0.5 text-sm font-semibold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Automated Engine
          </span>
          <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
            <li>• Runs backend and method validation</li>
            <li>• Resolves DAG capabilities and SBOM</li>
            <li>• Executes SAST and DAST security gates</li>
            <li>• Generates sandbox test APKs</li>
            <li>• Promotes trusted packages to Nexus</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
