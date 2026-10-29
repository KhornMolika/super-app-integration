'use client';

import React from 'react';
import Link from 'next/link';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { BackButton } from '@/components/ui/BackButton';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { AlertTriangleIcon } from '@/components/ui/Icons';

export interface OrganizationDetailHeaderProps {
  organization: Organization;
  isSuperOrAdmin: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  isOwnOrg?: boolean;
}

export function OrganizationDetailHeader({
  organization,
  isSuperOrAdmin,
  onToggleStatus,
  onEdit,
  onDelete,
  isOwnOrg = false,
}: OrganizationDetailHeaderProps) {
  const isActive = organization.status === 'ACTIVE';
  const isRoot = isRootOrganization(organization);

  const actionItems: ActionMenuItem[] = [
    {
      label: 'Edit Organization',
      onClick: onEdit,
      icon: (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      label: isRoot
        ? 'Primary Authority (Protected)'
        : isActive && isOwnOrg
        ? 'Disable (Assigned Org)'
        : isActive
        ? 'Disable Organization'
        : 'Enable Organization',
      variant: isRoot ? 'default' : isActive ? 'warning' : 'primary',
      disabled: isRoot || (isActive && isOwnOrg),
      divider: true,
      onClick: onToggleStatus,
      icon: isRoot ? (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : isActive && isOwnOrg ? (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ) : isActive ? (
        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    ...(!isRoot && onDelete
      ? [
          {
            label: 'Delete Organization',
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
  ];

  return (
    <div className="space-y-4">
      {/* Top Navigation & Actions Bar */}
      <div className="flex justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          <BackButton href={isSuperOrAdmin ? '/organizations' : '/miniapps'} />
          <div className="min-w-0">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link
                href={isSuperOrAdmin ? '/organizations' : '/miniapps'}
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Organizations
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                {organization.name}
              </span>
            </div>

            {/* Organization Name */}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {organization.name}
            </h1>
          </div>
        </div>

        {/* Management Actions Menu (Super Admins & Admins only) */}
        {isSuperOrAdmin && (
          <div className="shrink-0">
            <ActionMenu
              items={actionItems}
              ariaLabel={`Actions for ${organization.name}`}
              trigger={
                <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 shadow-xs transition-colors flex items-center justify-center cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Inactive Warning Alert */}
      {!isActive && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Organization Inactive</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              This organization is currently inactive. Active platform operations and new mini-app submissions under this regulatory authority are temporarily suspended.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
