"use client";

import React from 'react';
import Link from 'next/link';
import { Organization, getOrganizationCode } from '@/api/organizations.api';

interface OrgStatItem {
  id: string;
  name: string;
  code?: string;
  parentAuthority?: string;
  status: 'ACTIVE' | 'INACTIVE';
  miniAppsCount: number;
}

interface OrganizationsOverviewCardProps {
  organizations: OrgStatItem[];
  totalOrganizations: number;
  isManager?: boolean;
  myOrganization?: Organization | null;
}

export default function OrganizationsOverviewCard({
  organizations,
  totalOrganizations,
  isManager = false,
  myOrganization,
}: OrganizationsOverviewCardProps) {
  const maxApps = Math.max(...organizations.map((o) => o.miniAppsCount), 1);

  if (isManager && myOrganization) {
    const orgCode = getOrganizationCode(myOrganization.code || myOrganization.name);
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-full">
        <div>
          {/* Consistent Header with Icon Chip */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold font-mono text-sm shrink-0">
                {orgCode}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {myOrganization.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {myOrganization.parentAuthority || 'Partner Organization'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              {myOrganization.status || 'ACTIVE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Assigned MiniApps
              </span>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                {myOrganization.miniApps?.length || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Team Members
              </span>
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                {myOrganization.users?.length || 1}
              </p>
            </div>
          </div>
        </div>

        {/* Consistent Anchored Bottom Footer */}
        <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Organization Settings &amp; API Keys</span>
          <Link
            href="/settings"
            className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 inline-flex items-center gap-1"
          >
            <span>Manage Team</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-full">
      <div>
        {/* Consistent Header with Icon Chip */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Regulatory Authorities &amp; Ministries
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Active government bodies and partner organizations operating MiniApps.
              </p>
            </div>
          </div>

          <Link
            href="/organizations"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 inline-flex items-center gap-1 shrink-0"
          >
            <span>View All ({totalOrganizations})</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* List of Orgs with Clean Progress Bars */}
        <div className="space-y-4 mt-5">
          {organizations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              No registered organizations found.
            </p>
          ) : (
            organizations.slice(0, 4).map((org) => {
              const code = getOrganizationCode(org.code || org.name);
              const hasApps = org.miniAppsCount > 0;
              const percentage = hasApps
                ? Math.max(Math.round((org.miniAppsCount / maxApps) * 100), 12)
                : 0;

              return (
                <div key={org.id} className="group">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/40 shrink-0">
                        {code}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                        {org.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span
                        className={`font-bold font-mono ${
                          hasApps
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {org.miniAppsCount}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {org.miniAppsCount === 1 ? 'app' : 'apps'}
                      </span>
                    </div>
                  </div>

                  {/* Clean Horizontal Track: single minimal color, no multi-color gradient */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700/40 h-1.5 rounded-full overflow-hidden">
                    {hasApps ? (
                      <div
                        className="h-full rounded-full bg-brand-600 dark:bg-brand-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    ) : (
                      <div className="h-full w-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Consistent Anchored Bottom Footer */}
      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Active Platform Authorities</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Multi-Tenant RBAC Enforced
        </span>
      </div>
    </div>
  );
}
