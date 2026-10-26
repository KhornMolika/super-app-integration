'use client';

import React from 'react';
import { Organization } from '@/api';
import { Card } from '@/components/ui/card';
import { DocumentTextIcon, ShieldCheckIcon } from '@/components/ui/Icons';

export interface OrganizationOverviewCardProps {
  organization: Organization;
}

export function OrganizationOverviewCard({ organization: rawOrg }: OrganizationOverviewCardProps) {
  const organization = (rawOrg && typeof rawOrg === 'object' && 'data' in rawOrg && (rawOrg as any).data?.id)
    ? (rawOrg as any).data
    : rawOrg;

  if (!organization) return null;

  const isActive = organization.status === 'ACTIVE';
  const orgId = typeof organization.id === 'string' ? organization.id : '';

  return (
    <Card className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5 bg-white dark:bg-slate-900">
      {/* 1. Header with Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <DocumentTextIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Mandate & Regulatory Scope
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {orgId ? `ID: ${orgId.substring(0, 8)}...` : ''}
        </span>
      </div>

      {/* 2. Scope Description Quote Box */}
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border-l-2 border-brand-500 dark:border-brand-400 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {organization.description || (
          <span className="text-slate-400 italic">
            No official description or statutory scope registered for this regulatory body.
          </span>
        )}
      </div>

      {/* 3. Structured 4-Tile Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {/* Tile 1: Parent Authority */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-400">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Parent Authority</span>
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate" title={organization.parentAuthority || 'Non-Bank Financial Services Authority'}>
            {organization.parentAuthority || 'Non-Bank Financial Services Authority'}
          </p>
        </div>

        {/* Tile 2: Organization Code */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-400">
            <span className="font-mono text-[11px] font-bold">#</span>
            <span>Organization Code</span>
          </div>
          <div className="mt-1">
            {organization.code ? (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                {organization.code}
              </span>
            ) : (
              <span className="text-xs text-slate-400 italic">None assigned</span>
            )}
          </div>
        </div>

        {/* Tile 3: Registered Date */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-400">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Registered Date</span>
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {organization.createdAt
              ? new Date(organization.createdAt).toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })
              : '—'}
          </p>
        </div>

        {/* Tile 4: Governance Status */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Governance Status</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {organization.status}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
