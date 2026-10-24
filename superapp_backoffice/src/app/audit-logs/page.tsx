'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/inputs';
import { useAuth } from '@/lib/auth';
import { auditLogsApi, AuditLog, unwrapData, unwrapMeta, PaginationMeta } from '@/api';
import { Pagination, PaginationProps } from '@/components/ui/Pagination';
import { DocumentTextIcon } from '@/components/ui/Icons';

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
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (actionFilter !== 'ALL') params.set('action', actionFilter);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [currentPage, pageSize, debouncedSearch, actionFilter, pathname, router]);

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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Audit Logs & Security Events
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Immutable ledger of platform actions, capability approvals, pipeline runs, and security events.
            </p>
          </div>

          {/* Search & Action Filters */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Input
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full text-sm pr-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <select
              value={actionFilter}
              onChange={(e) => handleActionChange(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-xs"
            >
              <option value="ALL">All Actions ({paginationMeta.totalItems})</option>
              {COMMON_AUDIT_ACTIONS.filter((act) => act !== 'ALL').map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Logs Table Card */}
        <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="overflow-x-auto min-h-[360px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="w-[18%] px-6 py-4 font-semibold text-xs tracking-wider">
                    Timestamp
                  </th>
                  <th className="w-[15%] px-6 py-4 font-semibold text-xs tracking-wider">
                    Actor
                  </th>
                  <th className="w-[20%] px-6 py-4 font-semibold text-xs tracking-wider">
                    Action Event
                  </th>
                  <th className="w-[25%] px-6 py-4 font-semibold text-xs tracking-wider">
                    Resource Target
                  </th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-xs tracking-wider">
                    IP Address
                  </th>
                  <th className="w-[10%] px-6 py-4 font-semibold text-xs tracking-wider text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                      No audit logs match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                        {parseDate(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {log.actorId || 'system'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {log.resourceType}
                        </div>
                        {log.resourceId && (
                          <div className="text-xs font-mono text-slate-400 truncate max-w-xs">
                            {log.resourceId}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="text-brand-600 dark:text-brand-400 hover:underline font-semibold text-xs bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800/50 cursor-pointer"
                        >
                          Inspect JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Driven Pagination Footer */}
          {!loading && logs.length > 0 && (
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <Pagination {...paginationProps} showPageSizeSelector />
            </div>
          )}
        </Card>

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
                    <span className="text-xs text-slate-400 uppercase font-semibold">Action</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedLog.action}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Actor</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedLog.actorId || 'system'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Resource</span>
                    <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {selectedLog.resourceType}
                    </div>
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
