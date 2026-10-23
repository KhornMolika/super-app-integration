'use client';

import React from 'react';
import Link from 'next/link';
import { OrganizationUser } from '@/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { UserGroupIcon, ExternalLinkIcon } from '@/components/ui/Icons';
import { Pagination, usePagination } from '@/components/ui/Pagination';

export interface OrganizationUsersTabProps {
  users?: OrganizationUser[];
  isSuperOrAdmin: boolean;
}

export function OrganizationUsersTab({ users = [], isSuperOrAdmin }: OrganizationUsersTabProps) {
  const usersCount = users.length;
  const { paginatedItems, paginationProps } = usePagination(users, 5);

  return (
    <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
      {usersCount === 0 ? (
        <div className="py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Users Assigned</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            There are currently no team members or regulatory administrators assigned to this organization.
          </p>
          {isSuperOrAdmin && (
            <div className="mt-4 flex items-center justify-center">
              <Link href="/users">
                <Button variant="outline" className="text-xs font-semibold gap-1.5 rounded-xl">
                  <span>Manage Users in Access Control</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User / Administrator</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {paginatedItems.map((u) => {
                const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();
                const isActive = u.status === 'ACTIVE' || !u.status;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User Profile Cell */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {u.name || 'Unnamed User'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {u.role?.name || 'User'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer Pagination */}
      {usersCount > 5 && (
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <Pagination {...paginationProps} pageSizeOptions={[5, 10, 25]} showPageSizeSelector />
        </div>
      )}
    </Card>
  );
}
