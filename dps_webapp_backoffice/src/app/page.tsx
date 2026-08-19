"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const { can } = useAuth();
  const [metrics, setMetrics] = useState({
    totalMiniApps: 0,
    pendingReviews: 0,
    supportedPermissions: 0,
    superAppVersion: 'v2.4.0', // Still hardcoded as there's no endpoint for this yet
  });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [miniAppsRes, proposalsRes, permissionsRes] = await Promise.all([
          fetch(`${API_URL}/mini-apps`).catch(() => null),
          fetch(`${API_URL}/permission-proposals`).catch(() => null),
          fetch(`${API_URL}/permissions`).catch(() => null),
        ]);

        const [miniApps, proposals, permissions] = await Promise.all([
          miniAppsRes?.ok ? miniAppsRes.json() : [],
          proposalsRes?.ok ? proposalsRes.json() : [],
          permissionsRes?.ok ? permissionsRes.json() : [],
        ]);

        const pendingProposals = proposals.filter((p: any) => p.status === 'PENDING_REVIEW' || p.status === 'Pending').length;

        setMetrics({
          totalMiniApps: miniApps.length || 0,
          pendingReviews: pendingProposals || 0,
          supportedPermissions: permissions.length || 0,
          superAppVersion: 'v2.4.0',
        });
      } catch (e) {
        console.error('Failed to fetch metrics', e);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard Overview</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Monitor your Super App ecosystem metrics in real-time.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Mini Apps */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Total Mini Apps</h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalMiniApps}</p>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/50 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Pending Reviews</h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.pendingReviews}</p>
          </div>
        </div>

        {/* Supported Permissions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Supported Permissions</h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.supportedPermissions}</p>
          </div>
        </div>

        {/* Active Super App Version */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-wider">Super App Version</h3>
          <div className="mt-2 flex items-baseline space-x-2">
            <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.superAppVersion}</p>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex gap-4">
        {can('miniapp:create') && (
          <Link href="/miniapps/register" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700">
            Register Mini App
          </Link>
        )}
        {can('permission_proposal:read') && (
          <Link href="/review" className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
            Review Pending Items
          </Link>
        )}
      </div>

    </div>
  );
}
