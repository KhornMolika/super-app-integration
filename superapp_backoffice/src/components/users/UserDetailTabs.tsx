'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { User } from '@/api/users.api';
import { Role } from '@/api/roles.api';
import { MiniApp } from '@/api/miniapps.api';
import { AuditLog } from '@/api/audit-logs.api';
import { UserOverviewTab } from './tabs/UserOverviewTab';
import { UserPermissionsTab } from './tabs/UserPermissionsTab';
import { UserMiniAppsTab } from './tabs/UserMiniAppsTab';
import { UserAuditTab } from './tabs/UserAuditTab';

export type UserTabType = 'overview' | 'permissions' | 'miniapps' | 'activity';

export interface UserDetailTabsProps {
  user: User;
  roles?: Role[];
  miniApps: MiniApp[];
  loadingMiniApps: boolean;
  auditLogs: AuditLog[];
  loadingAuditLogs: boolean;
}

export function UserDetailTabs({
  user,
  roles = [],
  miniApps,
  loadingMiniApps,
  auditLogs,
  loadingAuditLogs,
}: UserDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('tab') as UserTabType) || 'overview';

  const handleTabChange = (tab: UserTabType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

  const tabs: { id: UserTabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview & Identity' },
    { id: 'permissions', label: 'Roles & Permissions' },
    {
      id: 'miniapps',
      label: 'Associated MiniApps',
      count: miniApps.length > 0 ? miniApps.length : undefined,
    },
    {
      id: 'activity',
      label: 'Audit Activity',
      count: auditLogs.length > 0 ? auditLogs.length : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modern Mobile Tab Bar (Desktop tabs are navigated via Sidebar) */}
      <div className="border-b border-slate-200 dark:border-slate-800 lg:hidden">
        <nav
          className="flex space-x-6 sm:space-x-8 overflow-x-auto no-scrollbar"
          aria-label="User tabs"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panes */}
      <div className="pt-1">
        {activeTab === 'overview' && (
          <UserOverviewTab
            user={user}
            miniAppsCount={miniApps.length}
            auditLogsCount={auditLogs.length}
          />
        )}

        {activeTab === 'permissions' && (
          <UserPermissionsTab user={user} roles={roles} />
        )}

        {activeTab === 'miniapps' && (
          <UserMiniAppsTab
            miniApps={miniApps}
            loading={loadingMiniApps}
            userName={user.name}
          />
        )}

        {activeTab === 'activity' && (
          <UserAuditTab
            userId={user.id}
            userEmail={user.email}
            initialLogs={auditLogs}
            loading={loadingAuditLogs}
          />
        )}
      </div>
    </div>
  );
}
