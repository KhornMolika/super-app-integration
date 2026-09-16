'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

export function NotificationEventsCard() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3.5 mb-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Automated Notification Events
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Active alerts dispatched directly to your connected Telegram channels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 text-sm">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-base">
              Security Scans &amp; DAST
            </span>
            <p className="text-slate-500 mt-1 text-sm leading-relaxed">
              Real-time scan results with CVE compliance scores and vulnerability counts.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-base">
              Test Build APK Generated
            </span>
            <p className="text-slate-500 mt-1 text-sm leading-relaxed">
              Instant direct APK download links whenever CI/CD pipeline completes a test build.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-start gap-3.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-base">
              Review &amp; Approval Decisions
            </span>
            <p className="text-slate-500 mt-1 text-sm leading-relaxed">
              Immediate notification when Super App Admin approves, rejects, or requests changes.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
