'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Organization } from '@/api';
import { Button } from '@/components/ui/inputs';
import { UserGroupIcon, PackageIcon, ExternalLinkIcon } from '@/components/ui/Icons';
import { OrganizationUsersTab } from './OrganizationUsersTab';
import { OrganizationMiniAppsTab } from './OrganizationMiniAppsTab';

export interface OrganizationDetailTabsProps {
  organization: Organization;
  isSuperOrAdmin: boolean;
  defaultTab?: 'users' | 'miniapps';
}

export function OrganizationDetailTabs({
  organization,
  isSuperOrAdmin,
  defaultTab = 'users',
}: OrganizationDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'miniapps'>(defaultTab);

  const isActive = organization.status === 'ACTIVE';
  const usersCount = organization.users?.length || 0;
  const miniAppsCount = organization.miniApps?.length || 0;

  return (
    <div className="space-y-4 pt-2">
      {/* Tabs Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserGroupIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Assigned Users</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'users'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                  : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {usersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('miniapps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'miniapps'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PackageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Registered Mini Apps</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'miniapps'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {miniAppsCount}
            </span>
          </button>
        </div>

        {/* Quick Action Button for Mini Apps tab */}
        {activeTab === 'miniapps' && isActive && miniAppsCount > 0 && (
          <Link href="/miniapps/register" className="inline-flex self-start sm:self-auto">
            <Button className="text-xs font-semibold gap-1.5 shadow-sm rounded-xl">
              <span>Register New Mini App</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' && (
        <OrganizationUsersTab
          users={organization.users}
          isSuperOrAdmin={isSuperOrAdmin}
        />
      )}

      {activeTab === 'miniapps' && (
        <OrganizationMiniAppsTab
          miniApps={organization.miniApps}
          isActive={isActive}
        />
      )}
    </div>
  );
}
