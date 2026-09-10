'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/inputs';
import { API_URL } from '@/lib/config';

interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let res = await fetch('/api/audit-logs');
      if (!res.ok) {
        res = await fetch(`${API_URL}/audit-logs`);
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.resourceType && log.resourceType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.actorId && log.actorId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.resourceId && log.resourceId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

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

  return (
    <ProtectedRoute permission="audit_log:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Audit Logs & Security Events
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Immutable ledger of platform actions, permission approvals, pipeline runs, and security events.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-60 text-sm"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Actions ({logs.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Card className="!p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="w-[15%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                    Action Event
                  </th>
                  <th className="w-[25%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                    Resource Target
                  </th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="w-[10%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No audit logs match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
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
                          onClick={() => setSelectedLog(log)}
                          className="text-brand-600 dark:text-brand-400 hover:underline font-semibold text-xs bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800/50"
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
        </Card>

        {/* Audit Log Detail Inspector Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📋</span> Audit Event Inspector
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedLog.id}</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5"
                >
                  ✕
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
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
