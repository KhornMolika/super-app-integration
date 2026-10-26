"use client";

import React from 'react';
import { DashboardInfrastructureCardProps } from './types';

export default function DashboardInfrastructureCard({
  storageLicenseType,
  storageEndpoint,
  botUsername,
  botUrl,
  nexusUrl,
  jenkinsUrl,
}: DashboardInfrastructureCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Ecosystem Services &amp; Infrastructure
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Operational status of object storage, messaging bots, artifact registries, and CI/CD pipelines.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
            4 Active Daemons
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
          {/* Storage Engine Status */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Storage Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
              {storageLicenseType || 'MinIO Object Storage'}
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
              {storageEndpoint}
            </p>
          </div>

          {/* Telegram Gateway Status */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Telegram Gateway</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
              Bot Gateway
            </div>
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-mono mt-0.5 block truncate"
            >
              @{botUsername}
            </a>
          </div>

          {/* Nexus Registry */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Nexus Registry</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
              Sonatype Pub Group
            </div>
            <a
              href={nexusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-accent-600 dark:text-accent-400 hover:underline font-mono mt-0.5 block truncate"
            >
              {nexusUrl}
            </a>
          </div>

          {/* CI/CD Automation */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">CI/CD Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
              Jenkins Pipeline
            </div>
            <a
              href={jenkinsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-mono mt-0.5 block truncate"
            >
              {jenkinsUrl}
            </a>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Infrastructure Health</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          All Core Daemons Online
        </span>
      </div>
    </div>
  );
}
