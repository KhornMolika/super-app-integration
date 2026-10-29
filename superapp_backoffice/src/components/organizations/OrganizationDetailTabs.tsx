'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Organization } from '@/api';
import { Button } from '@/components/ui/inputs';
import { UserGroupIcon, PackageIcon, ExternalLinkIcon, BuildingIcon } from '@/components/ui/Icons';
import { OrganizationUsersTab } from './OrganizationUsersTab';
import { OrganizationMiniAppsTab } from './OrganizationMiniAppsTab';

export interface OrganizationDetailTabsProps {
  organization: Organization;
  isSuperOrAdmin: boolean;
  defaultTab?: 'users' | 'miniapps' | 'subordinates';
}

export function OrganizationDetailTabs({
  organization,
  isSuperOrAdmin,
  defaultTab = 'users',
}: OrganizationDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab');
  const activeTab: 'users' | 'miniapps' | 'subordinates' = (tabFromUrl === 'miniapps' || tabFromUrl === 'subordinates') ? tabFromUrl : defaultTab;

  const handleTabChange = (tab: 'users' | 'miniapps' | 'subordinates') => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tab === 'users') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

  const isActive = organization.status === 'ACTIVE';
  const usersCount = organization.users?.length || 0;
  const miniAppsCount = organization.miniApps?.length || 0;
  const childrenCount = organization.children?.length || 0;

  return (
    <div className="space-y-4 pt-2">
      {/* Tabs Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange('users')}
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
            onClick={() => handleTabChange('miniapps')}
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

          {childrenCount > 0 && (
            <button
              type="button"
              onClick={() => handleTabChange('subordinates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'subordinates'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BuildingIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Subordinate Entities</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'subordinates'
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                    : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {childrenCount}
              </span>
            </button>
          )}
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

      {activeTab === 'subordinates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {organization.children?.map((child) => (
            <div
              key={child.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                    {child.code || 'ORG'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      child.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        child.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {child.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                  {child.name}
                </h4>
                {child.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {child.description}
                  </p>
                )}
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Link
                  href={`/organizations/${child.id}`}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
