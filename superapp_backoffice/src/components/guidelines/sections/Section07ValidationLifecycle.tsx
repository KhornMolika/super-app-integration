"use client";

import React from "react";
import LifecycleFlow from "@/components/ui/LifecycleFlow";

export function Section07ValidationLifecycle() {
  return (
    <div className="space-y-6 text-base text-slate-600 dark:text-slate-300">
      <p className="leading-relaxed">
        MiniApp integrations transition through a strictly governed 10-state finite state machine. Every stage enforces automated security gates, role-based authorizations, and end-to-end audit logging.
      </p>

      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <LifecycleFlow />
      </div>

      {/* State Progression Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 font-semibold">
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4">Trigger / Actor</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Next Available States</th>
              <th className="py-3 px-4">Developer Action / Remedy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">DRAFT</td>
              <td className="py-2.5 px-4">MA Manager saves registration draft</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Manual</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-brand-600 dark:text-brand-400">SUBMITTED</td>
              <td className="py-2.5 px-4 text-xs">Fill out metadata, verify integration URL, and click &quot;Submit for Review&quot;.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">SUBMITTED</td>
              <td className="py-2.5 px-4">MA Manager submits MiniApp</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Automated</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400">IN_REVIEW</td>
              <td className="py-2.5 px-4 text-xs">System automatically executes pre-flight checks and queues app for admin audit.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">IN_REVIEW</td>
              <td className="py-2.5 px-4">SuperApp Admin initiates governance audit</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Manual</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-amber-600 dark:text-amber-400">APPROVED, REJECTED</td>
              <td className="py-2.5 px-4 text-xs">Admin evaluates capability justifications, security scan reports, and contracts.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">APPROVED</td>
              <td className="py-2.5 px-4">SA Admin approves architectural contract</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">Manual</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">BUILDING</td>
              <td className="py-2.5 px-4 text-xs">Approval triggers automated release CI/CD pipeline in Jenkins.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">BUILDING</td>
              <td className="py-2.5 px-4">Jenkins CI/CD compiles sandbox test bundle</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">Automated</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">TESTING, REJECTED</td>
              <td className="py-2.5 px-4 text-xs">Builds signed test APK artifact; pushes package to internal Sonatype Nexus repository.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">TESTING</td>
              <td className="py-2.5 px-4">MA Manager &amp; SA Operator perform sandbox QA</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">Manual</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-cyan-600 dark:text-cyan-400">ACTIVE, REJECTED</td>
              <td className="py-2.5 px-4 text-xs">Download test APK, verify functionality on physical device, and submit sign-off.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</td>
              <td className="py-2.5 px-4">SA Admin publishes MiniApp to live catalog</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Live</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">SUSPENDED, ARCHIVED</td>
              <td className="py-2.5 px-4 text-xs">MiniApp is live to millions of SuperApp end-users in production.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">REJECTED</td>
              <td className="py-2.5 px-4">Admin or CI scanner detects security violation</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">Terminal</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-rose-600 dark:text-rose-400">DRAFT (via Re-submission)</td>
              <td className="py-2.5 px-4 text-xs">Review rejection reason, resolve flagged vulnerabilities or contract issues, and re-submit.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">SUSPENDED</td>
              <td className="py-2.5 px-4">SA Admin revokes live access due to policy violation</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">Revoked</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-orange-600 dark:text-orange-400">ACTIVE, ARCHIVED</td>
              <td className="py-2.5 px-4 text-xs">Contact SuperApp platform compliance team to remediate suspension triggers.</td>
            </tr>
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400">ARCHIVED</td>
              <td className="py-2.5 px-4">Organization decommissions MiniApp</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Closed</span></td>
              <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">None</td>
              <td className="py-2.5 px-4 text-xs">Read-only historical audit record. Cannot be re-activated.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
