"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mini-apps/issues/all')
      .then(res => res.json())
      .then(data => {
        setIssues(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center mt-32">
        <svg className="animate-spin h-10 w-10 text-brand-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  return (
    <div className="w-full py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Issues Management</h1>
          <p className="text-slate-500 mt-1">Centralized view of all validation, security, and integration failures.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="w-[18%] px-6 py-4 text-xs font-semibold uppercase text-slate-500">Mini App</th>
                <th className="w-[18%] px-6 py-4 text-xs font-semibold uppercase text-slate-500">Classification</th>
                <th className="w-[36%] px-6 py-4 text-xs font-semibold uppercase text-slate-500">Description</th>
                <th className="w-[10%] px-6 py-4 text-xs font-semibold uppercase text-slate-500">Severity</th>
                <th className="w-[10%] px-6 py-4 text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="w-[8%] px-6 py-4 text-xs font-semibold uppercase text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No issues found.</td>
                </tr>
              ) : (
                issues.map(issue => (
                  <tr key={issue.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <Link href={`/miniapps/${issue.miniApp?.id}`} className="font-medium text-brand-600 hover:underline">
                        {issue.miniApp?.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-bold rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {issue.classification || 'MINI_APP_ISSUE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[36%] truncate text-sm text-slate-600 dark:text-slate-400" title={issue.description}>
                      {issue.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${issue.severity === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full border">
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/miniapps/${issue.miniApp?.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                        View App
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
