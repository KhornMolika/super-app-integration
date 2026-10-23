'use client';

import React from 'react';
import Link from 'next/link';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/inputs';
import {
  ShieldCheckIcon,
  BanIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/components/ui/Icons';

export interface OrganizationDetailHeaderProps {
  organization: Organization;
  isSuperOrAdmin: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
}

export function OrganizationDetailHeader({
  organization,
  isSuperOrAdmin,
  onToggleStatus,
  onEdit,
}: OrganizationDetailHeaderProps) {
  const isActive = organization.status === 'ACTIVE';
  const isRoot = isRootOrganization(organization);

  return (
    <div className="space-y-4">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          <BackButton href={isSuperOrAdmin ? '/organizations' : '/miniapps'} />
          <div className="min-w-0">
            {/* Breadcrumb hint */}
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

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {organization.name}
              </h1>
              {organization.code && (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                  {organization.code}
                </span>
              )}
              {isRoot && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Root Authority
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                <span>{isActive ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{organization.parentAuthority || 'Non-Bank Financial Services Authority'}</span>
            </p>
          </div>
        </div>

        {/* Management Actions (Super Admins & Admins only) */}
        {isSuperOrAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Edit Organization */}
            <Button
              variant="outline"
              onClick={onEdit}
              className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Organization</span>
            </Button>

            {/* Toggle Status: Disable / Enable */}
            {isActive ? (
              <Button
                variant="outline"
                onClick={onToggleStatus}
                className="border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
              >
                <BanIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Disable Organization</span>
              </Button>
            ) : (
              <Button
                onClick={onToggleStatus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-sm"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>Enable Organization</span>
              </Button>
            )}
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
