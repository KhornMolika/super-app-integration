'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { miniappsApi, unwrapData } from '@/api';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { PaginationProps } from '@/components/ui/Pagination';

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

function IssuesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial query params from URL
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
  const initialSearch = searchParams.get('search') || '';
  const initialSeverity = searchParams.get('severity') || 'ALL';
  const initialStatus = searchParams.get('status') || 'ALL';

  const [issues, setIssues] = useState<MiniAppIssueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearch]);

  // Synchronize state with browser URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('limit', String(pageSize));
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (severityFilter !== 'ALL') params.set('severity', severityFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    if (typeof window !== 'undefined') {
      const currentFullUrl = window.location.pathname + window.location.search;
      if (currentFullUrl !== targetUrl && window.history?.replaceState) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  }, [currentPage, pageSize, debouncedSearch, severityFilter, statusFilter, pathname]);

  // Handle browser back/forward navigation smoothly via popstate
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const pageFromUrl = Math.max(1, parseInt(params.get('page') || '1', 10));
      const limitFromUrl = Math.max(1, parseInt(params.get('limit') || '10', 10));
      const searchFromUrl = params.get('search') || '';
      const severityFromUrl = params.get('severity') || 'ALL';
      const statusFromUrl = params.get('status') || 'ALL';

      setCurrentPage(pageFromUrl);
      setPageSize(limitFromUrl);
      setSeverityFilter(severityFromUrl);
      setStatusFilter(statusFromUrl);
      setSearchQuery(searchFromUrl);
      setDebouncedSearch(searchFromUrl);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filtered Issues (Client-side search & filtering)
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
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

      if (severityFilter !== 'ALL' && issue.severity !== severityFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && issue.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [issues, debouncedSearch, severityFilter, statusFilter]);

  // Paginate filtered issues
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage, pageSize]);

  const columns: DataTableColumn<MiniAppIssueItem>[] = useMemo(
    () => [
      {
        key: 'miniApp',
        header: 'MiniApp',
        width: 'w-[20%]',
        sortable: true,
        defaultSort: true,
        sortValue: (issue) => issue.miniApp?.name || 'Unknown App',
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
        sortable: true,
        sortValue: (issue) => issue.classification || 'MINI_APP_ISSUE',
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
        sortable: true,
        sortValue: (issue) => issue.description || '',
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
        sortable: true,
        sortValue: (issue) => issue.severity || 'LOW',
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
        sortable: true,
        sortValue: (issue) => issue.status || 'OPEN',
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
        sortable: false,
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

  const paginationProps: PaginationProps = {
    currentPage,
    totalPages: Math.max(1, Math.ceil(filteredIssues.length / pageSize)),
    totalItems: filteredIssues.length,
    pageSize,
    onPageChange: (newPage: number) => setCurrentPage(newPage),
    onPageSizeChange: (newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1);
    },
    showPageSizeSelector: true,
    showTotal: true,
  };

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
        data={paginatedIssues}
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
            onChange: (val) => {
              setSeverityFilter(val);
              setCurrentPage(1);
            },
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
            onChange: (val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            },
            dropdownWidth: 'w-48',
          },
        ]}
        isFiltered={searchQuery.trim() !== '' || severityFilter !== 'ALL' || statusFilter !== 'ALL'}
        onResetFilters={() => {
          setSearchQuery('');
          setDebouncedSearch('');
          setSeverityFilter('ALL');
          setStatusFilter('ALL');
          setCurrentPage(1);
        }}
        totalItemsCount={filteredIssues.length}
        defaultSortKey="miniApp"
        defaultSortDirection="asc"
        paginationProps={paginationProps}
        emptyMessage="No issues match your criteria"
        emptySubMessage="All validation and security checks are currently clear for this selection."
      />
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Issues...</div>}>
      <IssuesContent />
    </Suspense>
  );
}
