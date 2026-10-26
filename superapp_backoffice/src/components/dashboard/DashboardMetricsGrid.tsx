"use client";

import React from 'react';
import Link from 'next/link';
import { DashboardMetricsGridProps } from './types';

export default function DashboardMetricsGrid({
  isManager,
  metrics,
  miniAppsCount,
  myPendingAppsCount,
  myPublishedAppsCount,
  isTelegramConnected,
  telegramUsername,
  canReadUsers,
}: DashboardMetricsGridProps) {
  if (!isManager) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {/* Total MiniApps */}
        <Link
          href="/miniapps"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-brand-500/50 transition-all relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            {metrics.pendingReviews > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {metrics.pendingReviews} pending
              </span>
            )}
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Total MiniApps
          </h3>
          <div className="mt-1 flex items-baseline space-x-2">
            <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalMiniApps}</p>
          </div>
        </Link>

        {/* Platform Users */}
        {canReadUsers ? (
          <Link
            href="/users"
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-indigo-500/50 transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {metrics.pendingUsersCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {metrics.pendingUsersCount} unapproved
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300">
                  Active
                </span>
              )}
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              Platform Users
            </h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalUsers}</p>
              <span className="text-xs text-slate-400">({metrics.developerCount} devs)</span>
            </div>
          </Link>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              Developer Community
            </h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.developerCount || miniAppsCount}</p>
            </div>
          </div>
        )}

        {/* Partner Organizations */}
        <Link
          href="/organizations"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-sky-500/50 transition-all relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              Regulators
            </span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Authorities &amp; Orgs
          </h3>
          <div className="mt-1 flex items-baseline space-x-2">
            <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalOrganizations}</p>
          </div>
        </Link>

        {/* Supported Permissions */}
        <Link
          href="/capabilities"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-emerald-500/50 transition-all relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              RBAC
            </span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Capabilities
          </h3>
          <div className="mt-1 flex items-baseline space-x-2">
            <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.supportedPermissions}</p>
          </div>
        </Link>

        {/* SuperApp Test Build Version */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800/40 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Testing
            </span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Test Build APK
          </h3>
          <div className="mt-1 flex items-baseline space-x-2">
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.superAppTestVersion}</p>
          </div>
        </div>

        {/* Official Release Version */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-accent-200 dark:border-accent-800/40 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent-50 text-accent-800 dark:bg-accent-950 dark:text-accent-300 border border-accent-300 dark:border-accent-800">
              Production
            </span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Official Release
          </h3>
          <div className="mt-1 flex items-baseline space-x-2">
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.officialReleaseVersion}</p>
          </div>
        </div>
      </div>
    );
  }

  // MA Developer View
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* My Total MiniApps */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
          My MiniApps
        </h3>
        <div className="mt-2 flex items-baseline space-x-2">
          <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{miniAppsCount}</p>
        </div>
        <p className="text-xs text-slate-400 mt-1">Total registered packages</p>
      </div>

      {/* In Review / Submitted */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/50 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
            In Review
          </h3>
          {myPendingAppsCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Awaiting Approval
            </span>
          )}
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{myPendingAppsCount}</p>
        </div>
        <p className="text-xs text-slate-400 mt-1">Submissions undergoing review</p>
      </div>

      {/* Published / Active */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/50 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
          Active &amp; Published
        </h3>
        <div className="mt-2 flex items-baseline space-x-2">
          <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{myPublishedAppsCount}</p>
        </div>
        <p className="text-xs text-slate-400 mt-1">Live in SuperApp ecosystem</p>
      </div>

      {/* Direct Telegram Alerts */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-sky-200 dark:border-sky-900/50 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center mb-4 text-sky-600 dark:text-sky-400">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
            Telegram Alerts
          </h3>
          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              isTelegramConnected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {isTelegramConnected ? 'Active' : 'Unlinked'}
          </span>
        </div>
        <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
          {isTelegramConnected
            ? (telegramUsername ? `@${telegramUsername}` : 'Direct Chat Linked')
            : 'Not Linked'}
        </div>
        <Link href="/settings" className="text-xs text-sky-600 dark:text-sky-400 hover:underline mt-1 block">
          {isTelegramConnected ? 'Manage notifications →' : 'Connect now (1-Click) →'}
        </Link>
      </div>
    </div>
  );
}
