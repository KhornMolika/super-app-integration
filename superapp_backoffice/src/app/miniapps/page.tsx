'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button, Input } from '@/components/ui/inputs';
import ClickableTableRow from '@/components/ui/ClickableTableRow';
import { RegisterMiniAppButton } from '@/components/ui/RegisterMiniAppButton';
import { TagIcon, SettingsIcon, ArrowRightIcon, BuildingIcon, DevicePhoneIcon } from '@/components/ui/Icons';
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
import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import ActionMenu from '@/components/ui/ActionMenu';
import { Pagination, PaginationProps } from '@/components/ui/Pagination';

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
  const isSuper = hasRole('SUPER_ADMIN') || hasRole('ADMIN');

  // Read initial query params from URL
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
  const initialSearch = searchParams.get('search') || '';
  const initialMethod = searchParams.get('method') || 'ALL';
  const initialScope = (searchParams.get('scope') as 'all' | 'mine') || (isSuper ? 'all' : 'mine');

  const [scope, setScope] = useState<'all' | 'mine'>(initialScope);
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Server-Driven Pagination & Filters State
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [methodFilter, setMethodFilter] = useState<string>(initialMethod);

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

  // Synchronize state with browser URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (methodFilter !== 'ALL') params.set('method', methodFilter);
    if (scope !== (isSuper ? 'all' : 'mine')) params.set('scope', scope);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [currentPage, pageSize, debouncedSearch, methodFilter, scope, isSuper, pathname, router]);

  // Fetch MiniApps via Server-Driven Query API
  const fetchMiniApps = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        mine: scope === 'mine' || !isSuper,
      };
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      }
      if (methodFilter !== 'ALL') {
        queryParams.integrationMethod = methodFilter;
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
  }, [scope, isSuper, currentPage, pageSize, debouncedSearch, methodFilter]);

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">MiniApps</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isSuper && scope === 'all'
              ? 'Manage all platform registered applications and permissions.'
              : `Manage your registered applications (${user?.email || 'Logged-in User'}).`}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                All Applications
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
                My MiniApps
              </button>
            </div>
          )}
          <RegisterMiniAppButton />
        </div>
      </div>

      {/* Search & Method Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search MiniApps by name, appId, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full text-sm pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => handleMethodChange(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-xs"
          >
            {INTEGRATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {fetchError && isBackendUnreachableError(fetchError) ? (
        <BackendServiceOfflineNotice
          mode="card"
          title="Backend Service Unreachable"
          message={fetchError}
          onRetry={fetchMiniApps}
          autoRetrySeconds={5}
          showDiagnosticsButton={true}
          showTroubleshooting={true}
        />
      ) : fetchError ? (
        <div className="mb-8 p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-rose-900 dark:text-rose-100">Failed to load MiniApps catalog</h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{fetchError}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchMiniApps()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
          >
            Retry Loading
          </button>
        </div>
      ) : null}

      {!fetchError && (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto min-h-[340px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="w-[22%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">App Name</th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Organization</th>
                  <th className="w-[13%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Integration</th>
                  <th className="w-[9%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Version</th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Capabilities</th>
                  <th className="w-[18%] min-w-[150px] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="w-[14%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading mini apps...</span>
                      </div>
                    </td>
                  </tr>
                ) : miniApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No MiniApps Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm w-full max-w-sm mx-auto">Get started by registering a new mini app to join the ecosystem.</p>
                        <Link href="/miniapps/register" className="mt-4 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm underline underline-offset-2">Register your first app</Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                miniApps.map((app) => {
                  const isLiveProduction = app.status === 'ACTIVE' || app.status === 'Published';
                  const hasProductionHistory = Boolean(
                    app.versionHistory?.some((v: any) => v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'PREVIOUS'))
                  );
                  const hasPendingUpdate = Boolean(
                    (isLiveProduction || hasProductionHistory) &&
                    (app.pendingRevision || app.status === 'IN_REVIEW')
                  );
                  const isNewAppInReview = (app.status === 'IN_REVIEW' || app.status === 'PROCESSING' || app.status === 'SUBMITTED') && !isLiveProduction && !hasPendingUpdate;

                  return (
                    <ClickableTableRow key={app.id} href={`/miniapps/${app.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 group">
                      <td className="px-6 py-4 border-l-4 border-transparent group-hover:border-brand-500 transition-colors">
                        <div className="flex items-center space-x-3">
                          <AppLogoAvatar
                            logo={app.logo}
                            name={app.name}
                            size="md"
                          />
                          <div>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold block">{app.name || '-'}</span>
                            {app.appId && (
                              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">{app.appId}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
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
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {app.integrationMethod || 'WEBVIEW'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {app.version || app.currentReleaseVersion || '0.1.0'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <TagIcon className="w-3.5 h-3.5" />
                          <span>{Array.isArray(app.capabilities) ? app.capabilities.length : (Array.isArray(app.permissions) ? app.permissions.length : 0)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isLiveProduction
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : isNewAppInReview
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {app.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          trigger="ellipsis"
                          items={[
                            {
                              label: 'View Details',
                              href: `/miniapps/${app.id}`,
                              icon: <ArrowRightIcon className="w-4 h-4 text-slate-400" />,
                            },
                            {
                              label: 'Test APK',
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
                              href: `/miniapps/${app.id}?tab=capabilities`,
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
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              ),
                            },
                          ]}
                        />
                      </td>
                    </ClickableTableRow>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Driven Table Footer Pagination */}
        {!isLoading && miniApps.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Pagination {...paginationProps} showPageSizeSelector />
          </div>
        )}
      </div>
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
