'use client';

import React from 'react';
import Link from 'next/link';
import { User } from '@/api/users.api';
import { BuildingIcon, ShieldCheckIcon, ClockIcon } from '@/components/ui/Icons';
import { getRoleTheme, getUserEffectiveStatus, getUserRoles } from '../types';

export interface UserOverviewTabProps {
  user: User;
  miniAppsCount?: number;
  auditLogsCount?: number;
}

export function UserOverviewTab({
  user,
  miniAppsCount = 0,
  auditLogsCount = 0,
}: UserOverviewTabProps) {
  const effectiveStatus = getUserEffectiveStatus(user);
  const userRoles = getUserRoles(user);
  const primaryRole = userRoles[0]?.name || user.role?.name || 'USER';
  const roleTheme = getRoleTheme(primaryRole);

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Account Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              effectiveStatus === 'ACTIVE'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                : effectiveStatus === 'PENDING_APPROVAL'
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-current" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Account Status
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {effectiveStatus === 'ACTIVE'
                ? 'Active'
                : effectiveStatus === 'PENDING_APPROVAL'
                ? 'Pending Review'
                : 'Suspended'}
            </span>
          </div>
        </div>

        {/* Metric 2: Assigned Role */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${roleTheme.iconBg}`}>
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Security Role
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate block">
              {roleTheme.label}
            </span>
          </div>
        </div>

        {/* Metric 3: Associated MiniApps */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Owned MiniApps
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {miniAppsCount} Apps
            </span>
          </div>
        </div>

        {/* Metric 4: Telegram Connected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              user.telegramChatId || user.telegramUsername
                ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Telegram Alerts
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {user.telegramChatId || user.telegramUsername ? 'Connected' : 'Unlinked'}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Detail Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Account & Identity Details */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Identity & Security Profile</span>
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Full Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Primary Email</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{user.email}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">User ID (UUID)</span>
              <span className="font-mono text-slate-600 dark:text-slate-400 select-all">{user.id}</span>
            </div>

            {user.externalId && (
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">External SSO ID</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 select-all">{user.externalId}</span>
              </div>
            )}

            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Created Date</span>
              <span className="text-slate-700 dark:text-slate-300">
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Last Modified</span>
              <span className="text-slate-700 dark:text-slate-300">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Telegram Notifications & Delivery Channel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Telegram Alert Integration</span>
            </h3>
            {user.telegramChatId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Linked
              </span>
            )}
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Telegram Username</span>
              {user.telegramUsername ? (
                <a
                  href={`https://t.me/${user.telegramUsername.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-brand-600 dark:text-brand-400 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>@{user.telegramUsername.replace('@', '')}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Telegram Chat ID</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {user.telegramChatId || <span className="text-slate-400 italic">Not linked</span>}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Alert Routing</span>
              <span className="text-slate-700 dark:text-slate-300">
                {user.telegramChatId
                  ? 'Realtime bot delivery enabled'
                  : 'Fallback to platform notification feed'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              When linked, security gate warnings, review decisions, and incident alerts will be delivered directly to the operator&apos;s Telegram handle.
            </div>
          </div>
        </div>

        {/* Card 3: Organization & Regulatory Anchor */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BuildingIcon className="w-4 h-4 text-emerald-500" />
              <span>Assigned Organization</span>
            </h3>
            {user.organization && (
              <Link
                href={`/organizations/${user.organization.id}`}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              >
                View Organization →
              </Link>
            )}
          </div>

          {user.organization ? (
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400">Organization Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {user.organization.name}
                </span>
              </div>

              {user.organization.code && (
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Regulatory Code</span>
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                    {user.organization.code}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Regulatory Authority</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {user.organization.parentAuthority || 'Non-Bank Financial Services Authority'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              <BuildingIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p>This user is an independent platform member with no assigned tenant organization.</p>
            </div>
          )}
        </div>

        {/* Card 4: Governance & Audit Summary */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-violet-500" />
              <span>Audit & Compliance Governance</span>
            </h3>
            <Link
              href={`/audit-logs?search=${encodeURIComponent(user.email)}`}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Full Audit Logs →
            </Link>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Recent Audit Actions</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{auditLogsCount} Recorded</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Compliance Audit Scope</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                100% Immutable Trail
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Every sensitive action (MiniApp registration, lifecycle changes, configuration updates, and permission approvals) triggered by this operator is permanently recorded in the immutable regulatory audit register.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
