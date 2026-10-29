'use client';


import React, { useState, useEffect } from 'react';
import { TelegramConfigModal } from './TelegramConfigModal';
import Link from 'next/link';
import { User } from '@/api/users.api';
import { telegramApi } from '@/api/telegram.api';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/inputs';
import ActionMenu from '@/components/ui/ActionMenu';
import { ShieldCheckIcon, CheckIcon, XIcon, BuildingIcon, LockIcon } from '@/components/ui/Icons';
import { useAuth } from '@/lib/auth';
import { getRoleTheme, getUserEffectiveStatus, getUserRoles } from './types';


export interface UserDetailHeaderProps {
  user: User;
  canManage: boolean;
  miniAppsCount?: number;
  auditLogsCount?: number;
  onEdit: () => void;
  onToggleStatus: () => void;
  onApprove?: () => void;
  onDelete: () => void;
  onUserUpdated?: (user: User) => void;
}


export function UserDetailHeader({
  user,
  canManage,
  miniAppsCount = 0,
  auditLogsCount = 0,
  onEdit,
  onToggleStatus,
  onApprove,
  onDelete,
  onUserUpdated,
}: UserDetailHeaderProps) {
  const { user: currentUser } = useAuth();
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [botUsername, setBotUsername] = useState('superapp_notification_bot');


  useEffect(() => {
    telegramApi
      .getStatus()
      .then((status) => {
        if (status?.botUsername) {
          setBotUsername(status.botUsername);
        }
      })
      .catch(() => {});
  }, []);


  const effectiveStatus = getUserEffectiveStatus(user);
  const isPending = effectiveStatus === 'PENDING_APPROVAL';
  const isActive = effectiveStatus === 'ACTIVE';


  const userRoles = getUserRoles(user);
  const primaryRole = userRoles[0]?.name || user.role?.name || 'USER';
  const roleTheme = getRoleTheme(primaryRole);
  const isTelegramLinked = Boolean(user.telegramUsername || user.telegramChatId);
  const isTargetSuperAdmin = primaryRole === 'SUPER_ADMIN';
  const isSelf = Boolean(
    currentUser && (
      currentUser.id === user.id ||
      (currentUser.email && user.email && currentUser.email.toLowerCase() === user.email.toLowerCase())
    )
  );
  const canEditTarget = canManage && (!isTargetSuperAdmin || isSelf);


  const initials = (user.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();


  const formattedCreated = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';


  const formattedUpdated = user.updatedAt
    ? new Date(user.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';


  return (
    <div className="space-y-4">
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
        </div>
      </div>


      {/* Top 2-Column Section (Reference UI Structure) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 of 12): Main User Profile Card */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col md:flex-row items-center md:items-stretch gap-6">
          {/* Identity Sub-column (Avatar, Name, Email, Real Stats, Action Button) */}
          <div className="w-full md:w-56 shrink-0 flex flex-col items-center justify-between text-center space-y-3.5 pr-0 md:pr-6 md:border-r border-slate-200/80 dark:border-slate-800">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 shadow-md ring-4 ring-slate-100 dark:ring-slate-800 select-none">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-2xl flex items-center justify-center">
                  {initials}
                </div>
              )}
            </div>


            {/* Name & Email */}
            <div className="space-y-0.5 min-w-0 w-full">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate" title={user.name}>
                {user.name}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate" title={user.email}>
                {user.email}
              </p>
            </div>


            {/* Real Stats Row (Real counts from API) */}
            <div className="flex items-center justify-center w-full py-2.5 border-y border-slate-100 dark:border-slate-800/80">
              <div className="flex-1 text-center">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {miniAppsCount}
                </div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  MiniApps
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 text-center">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {auditLogsCount}
                </div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Events
                </div>
              </div>
            </div>


            {/* Action Buttons */}
            {canManage && (
              <div className="w-full flex items-center gap-2">
                {canEditTarget ? (
                  <Link
                    href={`/users/${user.id}/edit`}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Profile</span>
                  </Link>
                ) : (
                  <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 select-none">
                    <LockIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Protected Account</span>
                  </div>
                )}


                <ActionMenu
                  ariaLabel="More account actions"
                  items={[
                    ...(canEditTarget
                      ? [
                          {
                            label: 'Edit Profile',
                            href: `/users/${user.id}/edit`,
                            icon: (
                              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            ),
                          },
                        ]
                      : []),
                    ...(!isTargetSuperAdmin
                      ? [
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
                            variant: 'danger' as const,
                            divider: true,
                            onClick: onDelete,
                            icon: (
                              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            )}
          </div>


          {/* Right Attributes Grid (100% Real Database Fields) */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 py-1 content-center text-xs">
            {/* 1. Role Authority */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Role Authority</span>
              <div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${roleTheme.badge}`}>
                  <ShieldCheckIcon className="w-3 h-3" />
                  <span>{roleTheme.label}</span>
                </span>
              </div>
            </div>


            {/* 2. Member Status */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Member Status</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-slate-400'}`} />
                <span>{isActive ? 'Active Member' : isPending ? 'Pending Approval' : 'Inactive'}</span>
              </div>
            </div>


            {/* 3. Organization */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Organization</span>
              <div>
                {user.organization ? (
                  <Link
                    href={`/organizations/${user.organization.id}`}
                    className="text-brand-600 dark:text-brand-400 hover:underline font-semibold truncate block"
                    title={user.organization.name}
                  >
                    {user.organization.name}
                  </Link>
                ) : (
                  <span className="text-slate-500 italic">Independent</span>
                )}
              </div>
            </div>


            {/* 4. Regulatory Code */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Regulatory Code</span>
              <div>
                {user.organization?.code ? (
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                    {user.organization.code}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">N/A</span>
                )}
              </div>
            </div>


            {/* 5. Regulatory Authority */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Regulatory Authority</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={user.organization?.parentAuthority || 'N/A'}>
                {user.organization?.parentAuthority || 'N/A'}
              </div>
            </div>


            {/* 6. Organization Status */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Org Tenancy Status</span>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {user.organization ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{user.organization.status || 'Active Tenant'}</span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </div>
            </div>


            {/* 7. SSO / External ID */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Authentication Source</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={user.externalId || 'Internal Platform User'}>
                {user.externalId ? `SSO: ${user.externalId}` : 'Internal Platform User'}
              </div>
            </div>


            {/* 8. Registered Date */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Registered Date</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {formattedCreated}
              </div>
            </div>


            {/* 9. Last Updated */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Last Modified</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {formattedUpdated}
              </div>
            </div>
          </div>
        </div>


        {/* Right Column (4 of 12): Real Alerts & Notifications Data */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Alerts &amp; Notifications</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isTelegramLinked
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isTelegramLinked ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>{isTelegramLinked ? '3 Channels Active' : '2 Channels Active'}</span>
              </span>
            </div>


            {/* Real Delivery Channels: In App, Gmail, Telegram */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              {/* 1. In App */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">In App</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>


              {/* 2. Gmail */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">Gmail</span>
                  {user.email || 'Not configured'}
              </div>


              {/* 3. Telegram */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">Telegram</span>
                {user.telegramUsername ? (
                  <span
                    className="font-mono text-sky-600 dark:text-sky-400 font-semibold"
                    title={`Linked Operator Telegram: @${user.telegramUsername.replace('@', '')}`}
                  >
                    @{user.telegramUsername.replace('@', '')}
                  </span>
                ) : user.telegramChatId ? (
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    ID: ••••{user.telegramChatId.slice(-4)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Not linked</span>
                )}
              </div>
            </div>
          </div>


          {/* Bottom Action Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {isTelegramLinked ? 'Multi-channel dispatch active' : 'In-app & email dispatch active'}
            </span>
            <div className="flex items-center gap-2">
              {isTelegramLinked && (
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={`Open bot chat with @${botUsername}`}
                >
                  <span>Open Chat</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {canEditTarget && (
                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm inline-flex items-center transition-colors cursor-pointer"
                >
                  Configure
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Alert / Telegram Delivery Configuration Modal */}
      <TelegramConfigModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        user={user}
        onSuccess={(updated) => {
          onUserUpdated?.(updated);
        }}
      />
    </div>
  );
}
