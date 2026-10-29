'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { auditLogsApi, AuditLog, unwrapData, unwrapMeta, PaginationMeta } from '@/api';
import { PaginationProps } from '@/components/ui/Pagination';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import {
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  GlobeIcon,
  EyeIcon,
  TagIcon,
  TargetIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

const COMMON_AUDIT_ACTIONS = [
  'ALL',
  'USER_LOGIN',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DELETE',
  'USER_APPROVE',
  'ORGANIZATION_CREATE',
  'ORGANIZATION_UPDATE',
  'MINIAPP_CREATE',
  'MINIAPP_UPDATE',
  'MINIAPP_STATUS_CHANGE',
  'CAPABILITY_PROPOSAL_APPROVE',
  'ROLE_CREATE',
  'ROLE_UPDATE',
  'ROLE_DELETE',
];

function AuditLogsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { can } = useAuth();
  const hasAuditRead = can('audit_log:read');

  // Read initial query params from URL
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
  const initialSearch = searchParams.get('search') || '';
  const initialAction = searchParams.get('action') || 'ALL';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-Driven Pagination & Filters State
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [actionFilter, setActionFilter] = useState<string>(initialAction);

  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: initialPage,
    limit: initialLimit,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search input to avoid spamming the backend
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
    params.set('page', String(currentPage));
    params.set('limit', String(pageSize));
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (actionFilter !== 'ALL') params.set('action', actionFilter);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    const currentQueryStr = searchParams.toString();
    const currentUrl = currentQueryStr ? `${pathname}?${currentQueryStr}` : pathname;

    if (targetUrl !== currentUrl) {
      router.replace(targetUrl, { scroll: false });
    }
  }, [currentPage, pageSize, debouncedSearch, actionFilter, pathname, router, searchParams]);

  // Sync state from URL searchParams (e.g. browser back/forward or pasting a bookmark URL)
  useEffect(() => {
    const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitFromUrl = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const searchFromUrl = searchParams.get('search') || '';
    const actionFromUrl = searchParams.get('action') || 'ALL';

    setCurrentPage((prev) => (prev !== pageFromUrl ? pageFromUrl : prev));
    setPageSize((prev) => (prev !== limitFromUrl ? limitFromUrl : prev));
    setActionFilter((prev) => (prev !== actionFromUrl ? actionFromUrl : prev));
    if (searchFromUrl !== debouncedSearch) {
      setSearchQuery(searchFromUrl);
      setDebouncedSearch(searchFromUrl);
    }
  }, [searchParams, debouncedSearch]);

  // Fetch audit logs via Server-Driven Query API
  const fetchLogs = useCallback(async () => {
    if (!can('audit_log:read')) return;
    try {
      setLoading(true);
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      }
      if (actionFilter !== 'ALL') {
        queryParams.action = actionFilter;
      }

      const res = await auditLogsApi.getAll(queryParams);
      const logList = unwrapData<AuditLog>(res);
      setLogs(logList);

      const meta = unwrapMeta(res);
      if (meta) {
        setPaginationMeta(meta);
      } else {
        setPaginationMeta({
          page: currentPage,
          limit: pageSize,
          totalItems: logList.length,
          totalPages: Math.max(1, Math.ceil(logList.length / pageSize)),
          hasNextPage: false,
          hasPreviousPage: currentPage > 1,
        });
      }
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.error('Failed to load audit logs:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [can, currentPage, pageSize, debouncedSearch, actionFilter]);

  useEffect(() => {
    if (hasAuditRead) {
      fetchLogs();
    }
  }, [hasAuditRead, fetchLogs]);

  const handleActionChange = (val: string) => {
    setActionFilter(val);
    setCurrentPage(1);
  };

  const parseDate = (d?: string | Date): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return d;
    const str = d.endsWith('Z') || d.includes('+') ? d : `${d.replace(' ', 'T')}Z`;
    return new Date(str);
  };

  const getActionBadgeClass = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('FAIL') || act.includes('REJECT')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    if (act.includes('CREATE') || act.includes('APPROVE') || act.includes('SUCCESS') || act.includes('BOOTSTRAP')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (act.includes('UPDATE') || act.includes('STATUS') || act.includes('SYNC')) {
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  const getActionDotClass = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('FAIL') || act.includes('REJECT')) {
      return 'bg-rose-500';
    }
    if (act.includes('CREATE') || act.includes('APPROVE') || act.includes('SUCCESS') || act.includes('BOOTSTRAP')) {
      return 'bg-emerald-500';
    }
    if (act.includes('UPDATE') || act.includes('STATUS') || act.includes('SYNC')) {
      return 'bg-sky-500';
    }
    return 'bg-slate-400';
  };

  // Audit Log Table Columns for Generic DataTable
  const auditColumns: DataTableColumn<AuditLog>[] = useMemo(() => [
    {
      key: 'timestamp',
      header: (
        <div className="flex items-center gap-1.5">
          <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Timestamp</span>
        </div>
      ),
      width: 'w-[18%]',
      sortable: true,
      defaultSort: true,
      sortValue: (log) => parseDate(log.createdAt).getTime(),
      cell: (log) => {
        const date = parseDate(log.createdAt);
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
              {date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actor',
      header: (
        <div className="flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Actor Name</span>
        </div>
      ),
      width: 'w-[26%]',
      sortable: true,
      sortValue: (log) =>
        log.actorName ||
        log.newValue?.owner?.name ||
        (log.actorId === 'admin'
          ? 'System Administrator'
          : log.actorId === 'system'
          ? 'System Engine'
          : 'Operator'),
      cell: (log) => {
        const actorName =
          log.actorName ||
          log.newValue?.owner?.name ||
          (log.actorId === 'admin'
            ? 'System Administrator'
            : log.actorId === 'system'
            ? 'System Engine'
            : 'Operator');
        const actorEmail = log.actorEmail || log.newValue?.owner?.email;
        const isSystem = log.actorId === 'admin' || log.actorId === 'system' || !log.actorId;
        const initials = ((actorName || 'U') as string)
          .split(' ')
          .map((p: string) => p[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                isSystem
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-2xs'
              }`}
            >
              {isSystem ? (
                <ShieldCheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              ) : (
                <span>{initials || 'U'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate"
                title={actorName}
              >
                {actorName}
              </div>
              <div
                className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate"
                title={actorEmail || log.actorId || ''}
              >
                {actorEmail || (log.actorId ? `ID: ${log.actorId.substring(0, 8)}...` : 'System')}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: (
        <div className="flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Action Event</span>
        </div>
      ),
      width: 'w-[22%]',
      sortable: true,
      sortValue: (log) => log.action,
      cell: (log) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border uppercase tracking-wider ${getActionBadgeClass(
            log.action
          )}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getActionDotClass(log.action)}`} />
          <span className="truncate">{log.action}</span>
        </span>
      ),
    },
    {
      key: 'resource',
      header: (
        <div className="flex items-center gap-1.5">
          <TargetIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Resource Target</span>
        </div>
      ),
      width: 'w-[22%]',
      sortable: true,
      sortValue: (log) =>
        `${log.resourceType || ''} ${
          log.newValue?.name ||
          log.oldValue?.name ||
          log.metadata?.appName ||
          log.metadata?.title ||
          ''
        }`.trim(),
      cell: (log) => {
        const targetName =
          log.newValue?.name ||
          log.oldValue?.name ||
          log.metadata?.appName ||
          log.metadata?.title;
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {log.resourceType}
              </span>
              {targetName && (
                <span
                  className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]"
                  title={targetName}
                >
                  {targetName}
                </span>
              )}
            </div>
            {log.resourceId && (
              <div
                className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[150px] mt-0.5"
                title={log.resourceId}
              >
                {log.resourceId}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'ip',
      header: (
        <div className="flex items-center gap-1.5">
          <GlobeIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>IP Address</span>
        </div>
      ),
      width: 'w-[12%]',
      sortable: true,
      sortValue: (log) => log.ipAddress || '127.0.0.1',
      cell: (log) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
          {log.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
  ], []);

  // Pagination Props for Card Footer
  const paginationProps: PaginationProps = {
    currentPage: paginationMeta.page || currentPage,
    totalPages: paginationMeta.totalPages,
    totalItems: paginationMeta.totalItems,
    pageSize: paginationMeta.limit || pageSize,
    onPageChange: (newPage: number) => {
      setCurrentPage(newPage);
    },
    onPageSizeChange: (newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1);
    },
    showPageSizeSelector: true,
    showTotal: true,
  };

  return (
    <ProtectedRoute permission="audit_log:read">
      <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Audit Logs & Security Events
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Immutable ledger of platform actions, capability approvals, pipeline runs, and security events.
          </p>
        </div>

        {/* Universal DataTable */}
        <DataTable<AuditLog>
          data={logs}
          columns={auditColumns}
          keyExtractor={(log) => log.id}
          loading={loading}
          loadingMessage="Loading audit trail..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search audit trail by actor, resource..."
          onRowClick={(log) => setSelectedLog(log)}
          filters={[
            {
              id: 'action',
              label: 'Action',
              value: actionFilter,
              options: [
                { label: `All Actions (${paginationMeta.totalItems})`, value: 'ALL' },
                ...COMMON_AUDIT_ACTIONS.filter((act) => act !== 'ALL').map((act) => ({
                  label: act,
                  value: act,
                })),
              ],
              onChange: handleActionChange,
              dropdownWidth: 'w-72',
            },
          ]}
          isFiltered={searchQuery.trim() !== '' || actionFilter !== 'ALL'}
          onResetFilters={() => {
            setSearchQuery('');
            setActionFilter('ALL');
            setCurrentPage(1);
          }}
          totalItemsCount={paginationMeta.totalItems}
          defaultSortKey="timestamp"
          defaultSortDirection="asc"
          emptyMessage="No audit logs match your search or filter criteria"
          emptySubMessage="Try adjusting your keyword or action filter to locate system security events"
          paginationProps={paginationProps}
        />

        {/* Audit Log Detail Inspector Modal */}
        {mounted && selectedLog && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setSelectedLog(null)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200 my-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <span>Audit Event Inspector</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedLog.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Action Event</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedLog.action}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Actor Name</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                      {selectedLog.actorName ||
                        selectedLog.newValue?.owner?.name ||
                        (selectedLog.actorId === 'admin'
                          ? 'System Administrator'
                          : selectedLog.actorId === 'system'
                          ? 'System Engine'
                          : 'Operator')}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {selectedLog.actorEmail || (selectedLog.actorId ? `ID: ${selectedLog.actorId.substring(0, 8)}...` : 'System')}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Resource</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedLog.resourceType}
                    </div>
                    {selectedLog.resourceId && (
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]" title={selectedLog.resourceId}>
                        {selectedLog.resourceId}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">IP Address</span>
                    <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 text-xs">
                      {selectedLog.ipAddress || '127.0.0.1'}
                    </div>
                  </div>
                </div>

                {selectedLog.metadata && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1.5">
                      Event Metadata
                    </h4>
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValue && (
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1.5">
                      Payload / Value Snapshot
                    </h4>
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Audit Logs...</div>}>
      <AuditLogsContent />
    </Suspense>
  );
}
