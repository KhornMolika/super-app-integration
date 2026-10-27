'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { User } from '@/api/users.api';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/inputs';
import ActionMenu from '@/components/ui/ActionMenu';
import { toast } from '@/components/ui/Toast';
import {
  BuildingIcon,
  ShieldCheckIcon,
  CheckIcon,
  XIcon,
} from '@/components/ui/Icons';
import { getRoleTheme, getUserEffectiveStatus, getUserRoles } from './types';

export interface UserDetailHeaderProps {
  user: User;
  canManage: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onApprove?: () => void;
  onDelete: () => void;
}

const TAB_TITLES: Record<string, string> = {
  overview: 'Overview & Identity',
  permissions: 'Roles & Permissions',
  miniapps: 'Associated MiniApps',
  activity: 'Audit Activity',
};

export function UserDetailHeader({
  user,
  canManage,
  onEdit,
  onToggleStatus,
  onApprove,
  onDelete,
}: UserDetailHeaderProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get('tab') || 'overview';
  const effectiveStatus = getUserEffectiveStatus(user);
  const isPending = effectiveStatus === 'PENDING_APPROVAL';
  const isActive = effectiveStatus === 'ACTIVE';

  const userRoles = getUserRoles(user);
  const primaryRole = userRoles[0]?.name || user.role?.name || 'USER';
  const roleTheme = getRoleTheme(primaryRole);

  const initials = (user.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const statusBadgeStyle = isActive
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
    : isPending
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  const statusDotStyle = isActive
    ? 'bg-emerald-500'
    : isPending
    ? 'bg-amber-500 animate-pulse'
    : 'bg-slate-400';

  const statusLabel = isActive
    ? 'Active'
    : isPending
    ? 'Pending Approval'
    : 'Inactive';

  return (
    <div className="space-y-3">
      {/* Breadcrumb Navigation Line */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <BackButton href="/users" />
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href="/users"
            className="hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
          >
            Users Directory
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-xs">
            {user.name}
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-brand-600 dark:text-brand-400 font-bold capitalize">
            {TAB_TITLES[activeTab] || 'Overview & Identity'}
          </span>
        </div>
      </div>

      {/* Unified Profile Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all">
        {/* Left: Avatar + Identity Info */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
          {/* Avatar with Initials */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold flex items-center justify-center text-xl shadow-md ring-4 ring-slate-100 dark:ring-slate-800 shrink-0 select-none">
            {initials}
          </div>

          <div className="min-w-0 space-y-2">
            {/* Primary Row: Name, ID, Status, Role, Org */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {user.name}
              </h1>

              {/* ID Chip with Click to Copy */}
              <button
                type="button"
                onClick={() => handleCopy(user.id, 'User ID')}
                title="Click to copy UUID"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <span>#{user.id.slice(0, 8)}</span>
                <svg
                  className="w-3 h-3 opacity-60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeStyle}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotStyle}`} />
                <span>{statusLabel}</span>
              </span>

              {/* Primary Role Pill */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${roleTheme.badge}`}
              >
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>{roleTheme.label}</span>
              </span>

              {/* Organization Pill */}
              {user.organization && (
                <Link
                  href={`/organizations/${user.organization.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  title={`View Organization: ${user.organization.name}`}
                >
                  <BuildingIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[150px] font-semibold">
                    {user.organization.code || user.organization.name}
                  </span>
                </Link>
              )}
            </div>

            {/* Sub-row: Email, Telegram, SSO, Member Since, Last Updated */}
            <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {/* Email with copy */}
              <button
                type="button"
                onClick={() => handleCopy(user.email, 'Email address')}
                className="hover:text-brand-600 dark:hover:text-brand-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
                title="Click to copy email"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span>{user.email}</span>
              </button>

              {/* Telegram Badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <svg
                  className="w-3.5 h-3.5 text-sky-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {user.telegramUsername ? (
                  <a
                    href={`https://t.me/${user.telegramUsername.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 dark:text-sky-400 hover:underline font-mono font-medium"
                  >
                    @{user.telegramUsername.replace('@', '')}
                  </a>
                ) : user.telegramChatId ? (
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    ID: {user.telegramChatId}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Telegram: Not Linked</span>
                )}
              </div>

              {/* External SSO ID if present */}
              {user.externalId && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(user.externalId!, 'SSO ID')}
                    className="hover:text-brand-600 dark:hover:text-brand-400 font-mono transition-colors flex items-center gap-1 cursor-pointer"
                    title="Click to copy SSO ID"
                  >
                    <span>SSO: {user.externalId}</span>
                  </button>
                </div>
              )}

              {/* Member Since */}
              {user.createdAt && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>
                    Member since{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-medium">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>
              )}

              {/* Last Updated */}
              {user.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>
                    Updated{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-medium">
                      {new Date(user.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Management Actions */}
        {canManage && (
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            {/* Quick Approve button if pending */}
            {isPending && onApprove && (
              <Button
                variant="primary"
                onClick={onApprove}
                className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckIcon className="w-4 h-4" />
                <span>Approve Account</span>
              </Button>
            )}

            {/* Edit User Button */}
            <Button
              variant="outline"
              onClick={onEdit}
              className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Edit Account</span>
            </Button>

            {/* Action Menu (•••) */}
            <ActionMenu
              ariaLabel="More account actions"
              items={[
                {
                  label: isActive ? 'Deactivate Account' : 'Activate Account',
                  onClick: onToggleStatus,
                  icon: isActive ? (
                    <XIcon className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                  ),
                },
                {
                  label: 'Delete Account',
                  variant: 'danger',
                  divider: true,
                  onClick: onDelete,
                  icon: (
                    <svg
                      className="w-4 h-4 text-rose-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
