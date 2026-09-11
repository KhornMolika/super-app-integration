"use client";

import { API_URL } from '@/lib/config';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { can, role } = useAuth();
  const isManager = role === 'MINI_APP_MANAGER' || role === 'DEVELOPER';

  const [metrics, setMetrics] = useState({
    totalMiniApps: 0,
    pendingReviews: 0,
    supportedPermissions: 0,
    superAppTestVersion: 'v0.1.0',
    officialReleaseVersion: 'v0.0.1',
  });
  const [miniAppsList, setMiniAppsList] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ configured: boolean; licenseType: string; endpoint: string } | null>(null);
  const [telegramInfo, setTelegramInfo] = useState<{ isConnected?: boolean; botUsername?: string; user?: any } | null>(null);
  const [ecosystemData, setEcosystemData] = useState<any>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [miniAppsRes, proposalsRes, permissionsRes, ecosystemRes, storageRes, telegramRes] = await Promise.all([
          fetch(`${API_URL}/mini-apps`).catch(() => null),
          fetch(`${API_URL}/permission-proposals`).catch(() => null),
          fetch(`${API_URL}/permissions`).catch(() => null),
          fetch(`${API_URL}/super-app/ecosystem-status`).catch(() => null),
          fetch(`${API_URL}/storage/license-status`).catch(() => null),
          fetch('/api/telegram/status').catch(() => fetch(`${API_URL}/telegram/status`)),
        ]);

        const [miniApps, proposals, permissions, ecosystem, storage, telegram] = await Promise.all([
          miniAppsRes?.ok ? miniAppsRes.json() : [],
          proposalsRes?.ok ? proposalsRes.json() : [],
          permissionsRes?.ok ? permissionsRes.json() : [],
          ecosystemRes?.ok ? ecosystemRes.json() : null,
          storageRes?.ok ? storageRes.json() : null,
          telegramRes?.ok ? telegramRes.json() : null,
        ]);

        const rawApps = Array.isArray(miniApps) ? miniApps : [];
        setMiniAppsList(rawApps);

        // Pending Mini Apps needing review
        const pendingApps = rawApps.filter(
          (a: any) => a.status === 'IN_REVIEW' || a.status === 'SUBMITTED' || a.status === 'PENDING_REVIEW',
        );

        // Pending Permission Proposals needing review
        const rawProposals = Array.isArray(proposals) ? proposals : [];
        const pendingProposals = rawProposals.filter(
          (p: any) => p.status === 'PENDING_REVIEW' || p.status === 'Pending',
        );

        setMetrics({
          totalMiniApps: rawApps.length,
          pendingReviews: pendingApps.length + pendingProposals.length,
          supportedPermissions: Array.isArray(permissions) ? permissions.length : 0,
          superAppTestVersion: ecosystem?.superAppTestVersion || ecosystem?.superAppVersion || 'v0.1.0',
          officialReleaseVersion: ecosystem?.officialReleaseVersion || 'v0.0.1',
        });

        if (ecosystem) setEcosystemData(ecosystem);
        if (storage) setStorageInfo(storage);
        if (telegram) setTelegramInfo(telegram);
      } catch (e) {
        console.error('Failed to fetch metrics', e);
      }
    }
    fetchMetrics();
  }, []);

  const nexusUrl = ecosystemData?.integratedServices?.nexusRegistry?.url || 'http://localhost:8081';
  const jenkinsUrl = ecosystemData?.integratedServices?.jenkinsCiCd?.url || 'http://localhost:8085';
  const botUsername = telegramInfo?.botUsername || ecosystemData?.integratedServices?.telegramBot?.username || 'superapp_notification_bot';
  const botUrl = `https://t.me/${botUsername}`;
  const storageEndpoint = storageInfo?.endpoint || ecosystemData?.integratedServices?.minioStorage?.endpoint || 'localhost:9000';

  const isTelegramConnected = Boolean(telegramInfo?.user?.isConnected || telegramInfo?.isConnected);

  // MA Manager specific counts
  const myPendingAppsCount = miniAppsList.filter((a: any) =>
    ['IN_REVIEW', 'SUBMITTED', 'PENDING_REVIEW'].includes(a.status),
  ).length;
  const myPublishedAppsCount = miniAppsList.filter((a: any) =>
    ['APPROVED', 'PUBLISHED', 'ACTIVE'].includes(a.status),
  ).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {isManager ? 'Mini App Workspace' : 'Super App Administration'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isManager
              ? 'Monitor your registered Mini Apps, review statuses, security verification, and direct notifications.'
              : 'Global ecosystem metrics, pending submissions, release versions, and platform infrastructure.'}
          </p>
        </div>

        {/* Action shortcuts */}
        <div className="flex flex-wrap gap-3">
          {can('miniapp:create') && (
            <Link
              href="/miniapps/register"
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Register Mini App</span>
            </Link>
          )}

          {!isManager && can('permission_proposal:read') && (
            <Link
              href="/review"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Review Pending ({metrics.pendingReviews})</span>
            </Link>
          )}

          {!isManager && can('super_app:read') && (
            <Link
              href="/super-app"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Ecosystem Architecture</span>
            </Link>
          )}

          {isManager && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span>{isTelegramConnected ? 'Telegram Active' : 'Setup Telegram Alerts'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SA ADMIN DASHBOARD METRICS */}
      {/* ------------------------------------------------------------- */}
      {!isManager ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* Total Mini Apps */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Total Mini Apps</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalMiniApps}</p>
            </div>
          </div>

          {/* Pending Reviews */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/50 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Pending Reviews</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.pendingReviews}</p>
            </div>
          </div>

          {/* Supported Permissions */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Supported Permissions</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.supportedPermissions}</p>
            </div>
          </div>

          {/* Super App Test Build Version */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800/40 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Test Build Version</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Testing
              </span>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.superAppTestVersion}</p>
            </div>
          </div>

          {/* Official Release Version */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-800/40 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Official Release</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                Production
              </span>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.officialReleaseVersion}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MA MANAGER DASHBOARD METRICS */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* My Total Mini Apps */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">My Mini Apps</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{miniAppsList.length}</p>
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
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">In Review</h3>
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
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Active &amp; Published</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{myPublishedAppsCount}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Live in Super App ecosystem</p>
          </div>

          {/* Direct Telegram Alerts */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-sky-200 dark:border-sky-900/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center mb-4 text-sky-600 dark:text-sky-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Telegram Alerts</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                isTelegramConnected
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {isTelegramConnected ? 'Active' : 'Unlinked'}
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {isTelegramConnected
                ? (telegramInfo?.user?.telegramUsername ? `@${telegramInfo.user.telegramUsername}` : 'Direct Chat Linked')
                : 'Not Linked'}
            </div>
            <Link href="/settings" className="text-xs text-sky-600 dark:text-sky-400 hover:underline mt-1 block">
              {isTelegramConnected ? 'Manage notifications →' : 'Connect now (1-Click) →'}
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MA MANAGER VIEW: Mini Apps Overview Table & Status */}
      {/* ------------------------------------------------------------- */}
      {isManager && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                My Mini Apps Lifecycle
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Status of your submitted packages, automated security scans, and build revisions.
              </p>
            </div>
            <Link
              href="/miniapps"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 inline-flex items-center gap-1.5"
            >
              <span>View All Mini Apps</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {miniAppsList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Mini Apps Registered Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Get started by registering your Flutter or Web Mini App into the Super App ecosystem.
              </p>
              <Link
                href="/miniapps/register"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm"
              >
                Register Mini App
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Mini App</th>
                    <th className="py-3 px-4">App ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {miniAppsList.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {app.name}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{app.description || 'No description'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {app.appId || app.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {app.type || 'FLUTTER_PACKAGE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {app.version || 'v1.0.0'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                            app.status === 'APPROVED' || app.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : app.status === 'IN_REVIEW' || app.status === 'SUBMITTED' || app.status === 'PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {app.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/miniapps/${app.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-block"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SA ADMIN VIEW: Integrated Ecosystem Services & Infrastructure */}
      {/* ------------------------------------------------------------- */}
      {!isManager && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Ecosystem Services &amp; Infrastructure
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Operational status of object storage, messaging bots, artifact registries, and CI/CD pipelines.
                </p>
              </div>
            </div>

            {can('super_app:read') && (
              <Link
                href="/super-app"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 inline-flex items-center gap-1.5"
              >
                <span>Manage Infrastructure</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Storage Engine Status */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Storage Engine</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                {storageInfo?.licenseType || 'MinIO AIStor'}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1 truncate">
                {storageEndpoint}
              </p>
            </div>

            {/* Telegram Gateway Status */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Telegram Gateway</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                Bot Gateway
              </div>
              <a
                href={botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-mono mt-1 block truncate"
              >
                @{botUsername}
              </a>
            </div>

            {/* Nexus Registry */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Nexus Registry</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                Sonatype Repository
              </div>
              <a
                href={nexusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono mt-1 block truncate"
              >
                {nexusUrl}
              </a>
            </div>

            {/* CI/CD Automation */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">CI/CD Engine</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                Jenkins Automation
              </div>
              <a
                href={jenkinsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-mono mt-1 block truncate"
              >
                {jenkinsUrl}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
