'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { miniappsApi, unwrapData } from '@/api';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';

interface MiniAppIssueItem {
  id: string;
  classification?: string;
  description?: string;
  severity?: string;
  status?: string;
  miniApp?: {
    id: string;
    name?: string;
    appId?: string;
  };
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<MiniAppIssueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    miniappsApi
      .getAllIssues()
      .then((data) => {
        const list = unwrapData<MiniAppIssueItem>(data);
        setIssues(Array.isArray(list) ? list : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Filtered Issues (Client-side search & filtering)
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const appName = issue.miniApp?.name?.toLowerCase() || '';
        const appId = issue.miniApp?.appId?.toLowerCase() || '';
        const desc = issue.description?.toLowerCase() || '';
        const classification = issue.classification?.toLowerCase() || '';
        if (
          !appName.includes(q) &&
          !appId.includes(q) &&
          !desc.includes(q) &&
          !classification.includes(q)
        ) {
          return false;
        }
      }

      // 2. Severity Filter
      if (severityFilter !== 'ALL' && issue.severity !== severityFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL' && issue.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [issues, searchQuery, severityFilter, statusFilter]);

  const columns: DataTableColumn<MiniAppIssueItem>[] = useMemo(
    () => [
      {
        key: 'miniApp',
        header: 'MiniApp',
        width: 'w-[20%]',
        cell: (issue) => (
          <div>
            <Link
              href={`/miniapps/${issue.miniApp?.id}`}
              className="font-semibold text-brand-600 dark:text-brand-400 hover:underline text-sm block truncate"
            >
              {issue.miniApp?.name || 'Unknown App'}
            </Link>
            {issue.miniApp?.appId && (
              <span className="text-[11px] font-mono text-slate-400 block truncate">
                {issue.miniApp.appId}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'classification',
        header: 'Classification',
        width: 'w-[16%]',
        cell: (issue) => (
          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {issue.classification || 'MINI_APP_ISSUE'}
          </span>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        width: 'w-[36%]',
        cell: (issue) => (
          <div
            className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-md"
            title={issue.description}
          >
            {issue.description || '—'}
          </div>
        ),
      },
      {
        key: 'severity',
        header: 'Severity',
        width: 'w-[10%]',
        cell: (issue) => {
          const isHigh = issue.severity === 'HIGH' || issue.severity === 'CRITICAL';
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full ${
                isHigh
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {issue.severity || 'LOW'}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        width: 'w-[10%]',
        cell: (issue) => (
          <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
            {issue.status || 'OPEN'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="block text-right">Actions</span>,
        width: 'w-[8%]',
        className: 'text-right',
        cell: (issue) => (
          <Link
            href={`/miniapps/${issue.miniApp?.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
          >
            View App
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Issues Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Centralized view of all validation, security, and integration failures across registered MiniApps.
        </p>
      </div>

      <DataTable<MiniAppIssueItem>
        data={filteredIssues}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        loadingMessage="Loading ecosystem issues..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search issues by MiniApp, appId, or description..."
        filters={[
          {
            id: 'severity',
            label: 'Severity',
            value: severityFilter,
            options: [
              { label: 'All Severities', value: 'ALL' },
              { label: 'High / Critical', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' },
            ],
            onChange: setSeverityFilter,
            dropdownWidth: 'w-48',
          },
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            options: [
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Open', value: 'OPEN' },
              { label: 'Resolved', value: 'RESOLVED' },
              { label: 'Dismissed', value: 'DISMISSED' },
            ],
            onChange: setStatusFilter,
            dropdownWidth: 'w-48',
          },
        ]}
        isFiltered={searchQuery.trim() !== '' || severityFilter !== 'ALL' || statusFilter !== 'ALL'}
        onResetFilters={() => {
          setSearchQuery('');
          setSeverityFilter('ALL');
          setStatusFilter('ALL');
        }}
        totalItemsCount={issues.length}
        emptyMessage="No issues match your criteria"
        emptySubMessage="All validation and security checks are currently clear for this selection."
      />
    </div>
  );
}
