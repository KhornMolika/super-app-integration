"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReleasesPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mini-apps')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter to only show Approved or Published apps for release management
          setApps(data.filter(app => ['Approved', 'Published', 'Suspended'].includes(app.status)));
        }
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
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Release Management</h1>
          <p className="text-slate-500 mt-1">Manage approved Mini Apps, publish releases, and rollback versions.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Mini App</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Version</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Integration Method</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">Last Updated</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No releases found.</td>
                </tr>
              ) : (
                apps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <Link href={`/miniapps/${app.id}`} className="font-medium text-slate-900 dark:text-white hover:text-brand-600 transition-colors">
                        {app.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {app.version || '1.0.0'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {app.integrationMethod}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        app.status === 'Published' ? 'bg-indigo-100 text-indigo-700' : 
                        app.status === 'Suspended' ? 'bg-rose-100 text-rose-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(app.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/miniapps/${app.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                        Manage Release
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
