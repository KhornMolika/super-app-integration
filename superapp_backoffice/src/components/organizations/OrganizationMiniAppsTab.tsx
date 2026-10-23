'use client';

import React from 'react';
import Link from 'next/link';
import { OrganizationMiniApp } from '@/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { PackageIcon, ExternalLinkIcon } from '@/components/ui/Icons';
import { Pagination, usePagination } from '@/components/ui/Pagination';

export interface OrganizationMiniAppsTabProps {
  miniApps?: OrganizationMiniApp[];
  isActive: boolean;
}

export function OrganizationMiniAppsTab({
  miniApps = [],
  isActive,
}: OrganizationMiniAppsTabProps) {
  const miniAppsCount = miniApps.length;
  const { paginatedItems, paginationProps } = usePagination(miniApps, 5);

  return (
    <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
      {miniAppsCount === 0 ? (
        <div className="py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <PackageIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Mini Apps Registered
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No mini applications are currently owned by or registered under this regulatory body.
          </p>
          <div className="mt-5 flex items-center justify-center">
            {isActive ? (
              <Link href="/miniapps/register" className="inline-flex">
                <Button className="text-xs font-semibold gap-1.5 shadow-sm rounded-xl">
                  <span>Register New Mini App</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                Registration of new mini-apps is disabled while this organization is inactive.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Mini Application</th>
                <th className="px-6 py-4">App ID / Identifier</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {paginatedItems.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {app.name}
                        </div>
                        {app.tagline && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                            {app.tagline}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {app.appId}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {app.category || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        app.status === 'ACTIVE' || app.status === 'Published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          : app.status === 'IN_REVIEW'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          app.status === 'ACTIVE' || app.status === 'Published'
                            ? 'bg-emerald-500'
                            : app.status === 'IN_REVIEW'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span>{app.status || 'DRAFT'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/miniapps/${app.id}`}>
                      <Button
                        variant="outline"
                        className="text-xs h-8 px-3 font-semibold gap-1 rounded-lg"
                      >
                        <span>Manage</span>
                        <ExternalLinkIcon className="w-3 h-3 text-slate-400" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer Pagination */}
      {miniAppsCount > 5 && (
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <Pagination {...paginationProps} pageSizeOptions={[5, 10, 25]} showPageSizeSelector />
        </div>
      )}
    </Card>
  );
}
