'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RegisterMiniAppButton } from '@/components/ui/RegisterMiniAppButton';
import { ClockIcon, SettingsIcon, ArrowRightIcon, BuildingIcon, DevicePhoneIcon } from '@/components/ui/Icons';
import DownloadApkModal from '@/components/ui/DownloadApkModal';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import {
  miniappsApi,
  MiniApp,
  isBackendUnreachableError,
  getOrganizationCode,
  getOrganizationFullName,
  unwrapData,
  unwrapMeta,
  PaginationMeta,
} from '@/api';
import { getMiniAppPhase } from '@/components/miniapp-detail/miniappActions';
import {
  LifecycleBadge,
  AvailabilityBadge,
  lifecycleOf,
  availabilityOf,
} from '@/components/miniapp-detail/MiniAppStatusBadges';
import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import ActionMenu from '@/components/ui/ActionMenu';
import { PaginationProps } from '@/components/ui/Pagination';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';

const INTEGRATION_LABEL: Record<string, string> = {
  WEBVIEW: 'WebView',
  FLUTTER_PACKAGE: 'Flutter package',
  NATIVE_SDK: 'Native SDK',
  DEEP_LINK: 'Deep link',
};

/** Lifecycle filter: the governance stage (the API's status filter). */
const LIFECYCLE_FILTERS = [
  { value: 'ALL', label: 'All stages' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'APPROVED_FOR_TESTING', label: 'Approved for testing' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'TEST_PASSED', label: 'Test passed' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const INTEGRATION_METHODS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'WEBVIEW', label: 'WebView' },
  { value: 'FLUTTER_PACKAGE', label: 'Flutter Package' },
  { value: 'NATIVE_SDK', label: 'Native SDK' },
  { value: 'DEEP_LINK', label: 'Deep Link' },
];

function MiniAppsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { role, user, hasRole } = useAuth();
  // Admins see a scope switch: every app (SUPER_ADMIN) or their organization's
  // (ADMIN). Everyone else sees the apps they own or collaborate on.
  const isSuper = hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  const isPlatformAdmin = hasRole('SUPER_ADMIN');

  // Read initial query params from URL
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
  const initialSearch = searchParams.get('search') || '';
  const initialMethod = searchParams.get('method') || 'ALL';
  const initialStage = searchParams.get('stage') || 'ALL';
  const initialScope = (searchParams.get('scope') as 'all' | 'mine') || (isSuper ? 'all' : 'mine');

  const [scope, setScope] = useState<'all' | 'mine'>(initialScope);
  const [showArchived, setShowArchived] = useState(false);
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Server-Driven Pagination & Filters State
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [methodFilter, setMethodFilter] = useState<string>(initialMethod);
  const [stageFilter, setStageFilter] = useState<string>(initialStage);

  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: initialPage,
    limit: initialLimit,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [apkModalVersion, setApkModalVersion] = useState<string>('v0.2.0');

  // Debounce search input to avoid hitting API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearch]);

  // Synchronize active table filters and pagination state with browser address bar without router flooding
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('limit', String(pageSize));
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (methodFilter !== 'ALL') params.set('method', methodFilter);
    if (stageFilter !== 'ALL') params.set('stage', stageFilter);
    if (scope !== (isSuper ? 'all' : 'mine')) params.set('scope', scope);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    if (typeof window !== 'undefined') {
      const currentFullUrl = window.location.pathname + window.location.search;
      if (currentFullUrl !== targetUrl && window.history?.replaceState) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  }, [currentPage, pageSize, debouncedSearch, methodFilter, stageFilter, scope, isSuper, pathname]);

  // Handle browser back/forward navigation smoothly via popstate
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const pageFromUrl = Math.max(1, parseInt(params.get('page') || '1', 10));
      const limitFromUrl = Math.max(1, parseInt(params.get('limit') || '10', 10));
      const searchFromUrl = params.get('search') || '';
      const methodFromUrl = params.get('method') || 'ALL';
      const scopeFromUrl = (params.get('scope') as 'all' | 'mine') || (isSuper ? 'all' : 'mine');

      setCurrentPage(pageFromUrl);
      setPageSize(limitFromUrl);
      setMethodFilter(methodFromUrl);
      setStageFilter(params.get('stage') || 'ALL');
      setScope(scopeFromUrl);
      setSearchQuery(searchFromUrl);
      setDebouncedSearch(searchFromUrl);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSuper]);

  // Fetch MiniApps via Server-Driven Query API
  const fetchMiniApps = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        mine: scope === 'mine' || !isSuper,
        includeArchived: showArchived,
      };
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      }
      if (methodFilter !== 'ALL') {
        queryParams.integrationMethod = methodFilter;
      }
      if (stageFilter !== 'ALL') {
        queryParams.status = stageFilter;
      }

      const res = await miniappsApi.getAll(queryParams);
      const appList = unwrapData<MiniApp>(res);
      setMiniApps(appList);

      const meta = unwrapMeta(res);
      if (meta) {
        setPaginationMeta(meta);
      } else {
        setPaginationMeta({
          page: currentPage,
          limit: pageSize,
          totalItems: appList.length,
          totalPages: Math.max(1, Math.ceil(appList.length / pageSize)),
          hasNextPage: false,
          hasPreviousPage: currentPage > 1,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch mini apps', error);
      const msg = error.message || 'Error fetching mini apps';
      setFetchError(msg);
      toast.error(msg, 'Load Failed');
    } finally {
      setIsLoading(false);
    }
  }, [showArchived, scope, isSuper, currentPage, pageSize, debouncedSearch, methodFilter, stageFilter]);

  useEffect(() => {
    fetchMiniApps();
  }, [fetchMiniApps, role]);

  const handleScopeChange = (newScope: 'all' | 'mine') => {
    setScope(newScope);
    setCurrentPage(1);
  };

  const handleMethodChange = (val: string) => {
    setMethodFilter(val);
    setCurrentPage(1);
  };

  // MiniApp Columns for Generic DataTable
  const miniAppColumns: DataTableColumn<MiniApp>[] = useMemo(() => [
    {
      key: 'name',
      header: 'App',
      width: 'w-[23%]',
      sortable: true,
      defaultSort: true,
      sortValue: (app) => app.name || '',
      cell: (app) => (
        <div className="flex items-center space-x-3">
          <AppLogoAvatar logo={app.logo} name={app.name} size="md" />
          <div className="min-w-0">
            <span className="text-slate-800 dark:text-slate-200 font-semibold block truncate max-w-[220px]">{app.name || '-'}</span>
            {app.appId && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block truncate max-w-[220px]">{app.appId}</span>
            )}
            {(app as any).owner?.name && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[220px]">
                Owner: {(app as any).owner.name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      width: 'w-[11%]',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      sortable: true,
      sortValue: (app) => app.organizationCode || getOrganizationCode(app.organization || app.category) || '',
      cell: (app) => {
        const orgCode = app.organizationCode || getOrganizationCode(app.organization || app.category);
        const orgFullName = getOrganizationFullName(app.organization || app.category);
        return (
          <span
            title={orgFullName}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            <BuildingIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]">{orgCode}</span>
          </span>
        );
      },
    },
    {
      key: 'lifecycle',
      header: 'Lifecycle',
      width: 'w-[15%]',
      sortable: true,
      sortValue: (app) => lifecycleOf(app),
      cell: (app) => <LifecycleBadge app={app} />,
    },
    {
      key: 'availability',
      header: 'Availability',
      width: 'w-[12%]',
      sortable: true,
      sortValue: (app) => availabilityOf(app),
      cell: (app) => <AvailabilityBadge app={app} />,
    },
    {
      key: 'integration',
      header: 'Integration',
      width: 'w-[11%]',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      sortable: true,
      sortValue: (app) => app.integrationMethod || 'WEBVIEW',
      cell: (app) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {INTEGRATION_LABEL[app.integrationMethod || 'WEBVIEW'] || app.integrationMethod}
        </span>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      width: 'w-[8%]',
      headerClassName: 'hidden xl:table-cell',
      className: 'hidden xl:table-cell',
      sortable: true,
      sortValue: (app) => app.currentReleaseVersion || app.version || '',
      cell: (app) => (
        <span className="text-xs font-mono text-slate-500">
          {app.currentReleaseVersion || app.version || '-'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: (
        <div className="flex items-center gap-1.5">
          <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Last Updated</span>
        </div>
      ),
      width: 'w-[12%]',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      sortable: true,
      sortValue: (app) =>
        app.updatedAt
          ? new Date(app.updatedAt).getTime()
          : app.createdAt
          ? new Date(app.createdAt).getTime()
          : 0,
      cell: (app) => {
        const rawDate = app.updatedAt || app.createdAt;
        if (!rawDate) {
          return <span className="text-xs text-slate-400 italic">Never</span>;
        }
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
          return <span className="text-xs text-slate-400 italic">Unknown</span>;
        }
        return (
          <div className="flex flex-col" title={`Updated: ${d.toLocaleString()}`}>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
              {d.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="block text-right whitespace-nowrap">Actions</span>,
      width: 'w-[12%]',
      className: 'text-right whitespace-nowrap',
      sortable: false,
      cell: (app) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <ActionMenu
            ariaLabel={`Actions for ${app.name || 'MiniApp'}`}
            items={[
              {
                label: 'View',
                href: `/miniapps/${app.id}`,
                icon: <ArrowRightIcon className="w-4 h-4 text-slate-400" />,
              },
              {
                label: 'Test APK',
                hidden: !['testing', 'live'].includes(getMiniAppPhase(app as any)),
                icon: <DevicePhoneIcon className="w-4 h-4 text-emerald-500" />,
                onClick: () => {
                  const testVersion =
                    (app as any).activeTestVersion ||
                    app.integrationConfig?.superAppTestVersion ||
                    'v0.2.0';
                  setApkModalVersion(testVersion);
                  setIsApkModalOpen(true);
                },
              },
              {
                label: 'Inspect Capabilities',
                href: `/miniapps/${app.id}?tab=permissions`,
                icon: (
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                label: 'View Issues',
                href: `/issues?appId=${app.id}`,
                divider: true,
                icon: (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ),
              },
            ]}
          />
        </div>
      ),
    },
  ], []);

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
    <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">MiniApps</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isSuper && scope === 'all'
              ? isPlatformAdmin
                ? 'Every MiniApp on the platform.'
                : 'Every MiniApp of your organization.'
              : 'MiniApps you own or collaborate on.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isSuper && (
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {isPlatformAdmin ? 'All apps' : 'Organization'}
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('mine')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  scope === 'mine'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Mine
              </button>
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Show archived</span>
          </label>
          <RegisterMiniAppButton />
        </div>
      </div>

      {!fetchError && (
        <DataTable<MiniApp>
          data={miniApps}
          columns={miniAppColumns}
          keyExtractor={(app) => app.id}
          loading={isLoading}
          loadingMessage="Loading mini apps..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search MiniApps by name, appId, or description..."
          filters={[
            {
              id: 'stage',
              label: 'Lifecycle',
              value: stageFilter,
              options: LIFECYCLE_FILTERS,
              onChange: (val: string) => {
                setStageFilter(val);
                setCurrentPage(1);
              },
              dropdownWidth: 'w-56',
            },
            {
              id: 'method',
              label: 'Integration',
              value: methodFilter,
              options: INTEGRATION_METHODS,
              onChange: handleMethodChange,
              dropdownWidth: 'w-56',
            },
          ]}
          isFiltered={searchQuery.trim() !== '' || methodFilter !== 'ALL' || stageFilter !== 'ALL'}
          onResetFilters={() => {
            setSearchQuery('');
            setMethodFilter('ALL');
            setStageFilter('ALL');
            setCurrentPage(1);
          }}
          totalItemsCount={paginationMeta.totalItems}
          defaultSortKey="name"
          defaultSortDirection="asc"
          emptyMessage="No MiniApps Found"
          emptySubMessage="Get started by registering a new mini app to join the ecosystem."
          emptyAction={
            <Link
              href="/miniapps/register"
              className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm underline underline-offset-2"
            >
              Register your first app
            </Link>
          }
          paginationProps={paginationProps}
          onRowClick={(app) => router.push(`/miniapps/${app.id}`)}
          rowClassName="group"
        />
      )}

      <DownloadApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        defaultVersion={apkModalVersion}
      />
    </div>
  );
}

export default function MiniAppsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading MiniApps Catalog...</div>}>
      <MiniAppsContent />
    </Suspense>
  );
}
