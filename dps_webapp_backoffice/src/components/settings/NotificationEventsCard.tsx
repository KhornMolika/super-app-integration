'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ShieldCheckIcon, PackageIcon, ClipboardCheckIcon, BellIcon } from '@/components/ui/Icons';

export function NotificationEventsCard() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3.5 mb-3">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
          <BellIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Automated Notification Events
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status-coded alerts dispatched directly to your connected Telegram channels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 text-sm">
        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
            <ShieldCheckIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-base flex items-center gap-2">
              <span>Security Scans &amp; SAST</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                PASSED / FAILED
              </span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm leading-relaxed">
              Live scan results with CVE compliance score, secret detection, and remediation steps.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
            <PackageIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-base flex items-center gap-2">
              <span>Test Build APK &amp; Sandbox</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                READY
              </span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm leading-relaxed">
              Instant direct APK download links and interactive Web Sandbox launch triggers upon build completion.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-950/20 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/30">
            <ClipboardCheckIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-base flex items-center gap-2">
              <span>Review Decisions</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300">
                APPROVALS
              </span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm leading-relaxed">
              Immediate alerts when administrators approve, request revisions, or reject Mini App submissions.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
