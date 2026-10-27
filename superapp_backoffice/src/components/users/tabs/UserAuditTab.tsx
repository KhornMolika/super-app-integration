'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { auditLogsApi, AuditLog, unwrapData, unwrapMeta, PaginationMeta } from '@/api';
import { ClockIcon } from '@/components/ui/Icons';
import { Pagination } from '@/components/ui/Pagination';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';

export interface UserAuditTabProps {
  userId?: string;
  userEmail: string;
  initialLogs?: AuditLog[];
  loading?: boolean;
}

export function UserAuditTab({
  userId,
  userEmail,
  initialLogs,
  loading: externalLoading,
}: UserAuditTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs || []);
  const [loading, setLoading] = useState(externalLoading ?? false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 5,
    totalItems: initialLogs?.length || 0,
    totalPages: Math.max(1, Math.ceil((initialLogs?.length || 0) / 5)),
    hasNextPage: false,
    hasPreviousPage: false,
  });

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

  // Server-side audit log query
  const fetchUserAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };

      // Search matching actor email or user search
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      } else if (userEmail) {
        queryParams.search = userEmail;
      }

      if (userId) {
        queryParams.actorId = userId;
      }

      if (actionFilter !== 'ALL') {
        queryParams.action = actionFilter;
      }

      const res = await auditLogsApi.getAll(queryParams);
      const items = unwrapData<AuditLog>(res);
      setLogs(items);

      const meta = unwrapMeta(res);
      if (meta) {
        setPaginationMeta(meta);
      } else {
        setPaginationMeta({
          page: currentPage,
          limit: pageSize,
          totalItems: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
          hasNextPage: false,
          hasPreviousPage: currentPage > 1,
        });
      }
    } catch (err) {
      console.error('Failed to load user audit activity:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, debouncedSearch, actionFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchUserAuditLogs();
  }, [fetchUserAuditLogs]);

  const getActionTheme = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('FAIL') || act.includes('REJECT') || act.includes('SUSPEND')) {
      return {
        badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
        dot: 'bg-rose-500',
      };
    }
    if (act.includes('CREATE') || act.includes('APPROVE') || act.includes('SUCCESS') || act.includes('RESOLVE')) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
        dot: 'bg-emerald-500',
      };
    }
    if (act.includes('UPDATE') || act.includes('STATUS') || act.includes('SYNC') || act.includes('REVIEW')) {
      return {
        badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
        dot: 'bg-sky-500',
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
    };
  };

  const actionFilterOptions: CleanDropdownOption[] = [
    { value: 'ALL', label: 'All Actions' },
    { value: 'CREATE', label: 'Creation Events' },
    { value: 'UPDATE', label: 'Updates & Modifies' },
    { value: 'APPROVE', label: 'Approvals & Grants' },
    { value: 'DELETE', label: 'Deletions & Revocations' },
    { value: 'LOGIN', label: 'Authentication Events' },
  ];

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Audit Trail Activity</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
              {paginationMeta.totalItems} Records
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable regulatory records of actions and security operations performed by this account.
          </p>
        </div>

        <Link
          href={`/audit-logs?search=${encodeURIComponent(userEmail)}`}
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1 shrink-0 self-start sm:self-center"
        >
          <span>View Global Audit Log</span>
          <span>→</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, resource, or IP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Type Dropdown */}
        <div className="w-full sm:w-48 shrink-0">
          <CleanDropdown
            label="Action"
            value={actionFilter}
            onChange={(val) => {
              setActionFilter(val);
              setCurrentPage(1);
            }}
            options={actionFilterOptions}
            buttonClassName="py-1.5 text-xs rounded-xl"
            dropdownWidth="w-52"
          />
        </div>
      </div>

      {/* Audit Logs List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-24 shrink-0" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3.5">
            <ClockIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Audit Activity Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            {searchQuery || actionFilter !== 'ALL'
              ? 'No audit log entries match your filter criteria.'
              : 'No sensitive governance or security actions have been logged for this user yet.'}
          </p>
          {(searchQuery || actionFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActionFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-3"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => {
            const theme = getActionTheme(log.action);
            const date = new Date(log.createdAt);
            const isExpanded = expandedLogId === log.id;
            const hasMetadata = log.metadata || log.oldValue || log.newValue;

            return (
              <div
                key={log.id}
                className="p-4 sm:px-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} mt-1.5 shrink-0`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${theme.badge}`}
                        >
                          {log.action}
                        </span>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {log.resourceType}
                        </span>
                        {log.resourceId && (
                          <span
                            className="font-mono text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer truncate max-w-[140px]"
                            title={log.resourceId}
                          >
                            #{log.resourceId.slice(0, 8)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        {log.ipAddress && (
                          <span className="font-mono text-[11px]">IP: {log.ipAddress}</span>
                        )}
                        {log.userAgent && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{log.userAgent}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp & Expand Button */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                      {date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {hasMetadata && (
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
                      >
                        {isExpanded ? 'Hide Payload' : 'View Payload'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Payload Inspector */}
                {isExpanded && hasMetadata && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-60">
                    <pre className="text-[11px] leading-relaxed">
                      {JSON.stringify(
                        {
                          metadata: log.metadata,
                          oldValue: log.oldValue,
                          newValue: log.newValue,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Server Pagination */}
      {paginationMeta.totalItems > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <Pagination
            currentPage={currentPage}
            totalPages={paginationMeta.totalPages}
            totalItems={paginationMeta.totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            showPageSizeSelector={true}
            pageSizeOptions={[5, 10, 20, 50]}
            showTotal={true}
          />
        </div>
      )}
    </div>
  );
}
