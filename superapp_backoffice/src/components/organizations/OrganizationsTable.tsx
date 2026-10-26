'use client';

import React, { useMemo } from 'react';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { ShieldCheckIcon, BuildingIcon } from '@/components/ui/Icons';
import { PaginationProps } from '@/components/ui/Pagination';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
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
  const columns: DataTableColumn<Organization>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Organization Name',
        width: 'w-[40%]',
        sortable: true,
        defaultSort: true,
        sortValue: (org) => org.name,
        cell: (org) => {
          const isRoot = isRootOrganization(org);
          return (
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
                      <svg
                        className="w-2.5 h-2.5 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      System Anchor
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'code',
        header: 'Code',
        width: 'w-[15%]',
        sortable: true,
        sortValue: (org) => org.code || '',
        cell: (org) =>
          org.code ? (
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/50">
              {org.code}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        key: 'parentAuthority',
        header: 'Parent Authority',
        width: 'w-[25%]',
        sortable: true,
        sortValue: (org) => org.parentAuthority || 'Non-Bank Financial Services Authority',
        cell: (org) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-xs">
              {org.parentAuthority || 'Non-Bank Financial Services Authority'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 'w-[12%]',
        sortable: true,
        sortValue: (org) => org.status,
        cell: (org) => {
          const isActive = org.status === 'ACTIVE';
          return (
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
          );
        },
      },
      {
        key: 'actions',
        header: <span className="block text-right">Actions</span>,
        width: 'w-[8%]',
        className: 'text-right',
        sortable: false,
        cell: (org) => (
          <div onClick={(e) => e.stopPropagation()}>
            <OrganizationActionMenu
              organization={org}
              onView={onView}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              isOwnOrg={userOrganizationId === org.id}
            />
          </div>
        ),
      },
    ],
    [onView, onEdit, onToggleStatus, userOrganizationId],
  );

  return (
    <DataTable<Organization>
      data={organizations}
      columns={columns}
      keyExtractor={(org) => org.id}
      loading={loading}
      loadingMessage="Loading regulatory bodies..."
      emptyMessage="No Organizations Found"
      emptySubMessage="No regulatory bodies match the selected filter or search keyword."
      defaultSortKey="name"
      defaultSortDirection="asc"
      paginationProps={paginationProps}
      onRowClick={(org) => onView(org)}
      rowClassName="group"
    />
  );
}
