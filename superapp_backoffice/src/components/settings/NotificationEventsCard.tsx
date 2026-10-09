'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ShieldCheckIcon, PackageIcon, ClipboardCheckIcon, BellIcon } from '@/components/ui/Icons';

export function NotificationEventsCard() {
  return (
    <Card className="p-6 sm:p-7 border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl">
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
          <BellIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Automated Notification Events</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
              Live Triggers
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status-coded alerts dispatched directly to your connected Telegram channels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 flex-wrap">
              <span>Security Scans &amp; SAST</span>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                PASSED / FAILED
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs leading-relaxed">
              Live scan results with CVE compliance score, secret detection, and remediation steps.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
            <PackageIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 flex-wrap">
              <span>Test Build APK &amp; Sandbox</span>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300">
                READY
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs leading-relaxed">
              Instant direct APK download links and interactive Web Sandbox launch triggers upon build completion.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-950/20 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/30">
            <ClipboardCheckIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 flex-wrap">
              <span>Review Decisions</span>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-md bg-violet-500/20 text-violet-700 dark:text-violet-300">
                APPROVALS
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs leading-relaxed">
              Immediate alerts when administrators approve, request revisions, or reject MiniApp submissions.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
