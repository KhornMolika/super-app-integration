'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { ShieldCheckIcon, BuildingIcon } from '@/components/ui/Icons';
import { Pagination, PaginationProps } from '@/components/ui/Pagination';
import { OrganizationActionMenu } from './OrganizationActionMenu';

interface OrganizationsTableProps {
  organizations: Organization[];
  loading: boolean;
  onView: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onToggleStatus: (org: Organization) => void;
  paginationProps?: PaginationProps;
  userOrganizationId?: string | null;
}

export function OrganizationsTable({
  organizations,
  loading,
  onView,
  onEdit,
  onToggleStatus,
  paginationProps,
  userOrganizationId,
}: OrganizationsTableProps) {
  return (
    <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800/80 rounded-2xl">
      <div className="overflow-x-auto min-h-[340px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Organization Name</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Parent Authority</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
            {loading ? (
              // Sleek Skeleton Shimmer Rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-14" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-20" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
                  </td>
                </tr>
              ))
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <BuildingIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Organizations Found
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    No regulatory bodies match the selected filter or search keyword.
                  </p>
                </td>
              </tr>
            ) : (
              organizations.map((org) => {
                const isRoot = isRootOrganization(org);
                const isActive = org.status === 'ACTIVE';

                return (
                  <tr
                    key={org.id}
                    onClick={() => onView(org)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* 1. Organization Avatar & Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-transform group-hover:scale-105 ${
                            isRoot
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60'
                          }`}
                        >
                          {org.code || org.name.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-2">
                            <span className="truncate">{org.name}</span>
                            {isRoot && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                                <svg className="w-2.5 h-2.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                System Anchor
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Code */}
                    <td className="px-6 py-4">
                      {org.code ? (
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/50">
                          {org.code}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* 3. Parent Authority */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">
                          {org.parentAuthority || 'Non-Bank Financial Services Authority'}
                        </span>
                      </div>
                    </td>

                    {/* 4. Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>

                    {/* 5. Vertical ... Action Menu */}
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <OrganizationActionMenu
                        organization={org}
                        onView={onView}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        isOwnOrg={userOrganizationId === org.id}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Pagination */}
      {!loading && paginationProps && organizations.length > 0 && (
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <Pagination {...paginationProps} showPageSizeSelector />
        </div>
      )}
    </Card>
  );
}
