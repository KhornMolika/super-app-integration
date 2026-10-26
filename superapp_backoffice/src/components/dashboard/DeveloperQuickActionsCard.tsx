"use client";

import React from 'react';
import Link from 'next/link';

export default function DeveloperQuickActionsCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Developer Guidelines &amp; Quick Links
          </h3>
          <Link
            href="/guidelines"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            View Guidelines →
          </Link>
        </div>

        <div className="space-y-3 mt-4 text-xs">
          <Link
            href="/miniapps/register"
            className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-center justify-between transition-colors group block"
          >
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                1. Register MiniApp Package
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Define basic info, team telegram chat, and upload your Flutter or Web package.
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/capabilities"
            className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-center justify-between transition-colors group block"
          >
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                2. Propose System Capabilities
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Request high-risk device capabilities (Camera, Location, Biometrics) with justification.
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
        <span>SuperApp Platform SDK Compliance: Version 1.0.0</span>
      </div>
    </div>
  );
}
