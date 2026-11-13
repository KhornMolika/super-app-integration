'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RegisterMiniAppButton } from '@/components/ui/RegisterMiniAppButton';
import { ArrowRightIcon, DevicePhoneIcon, BugIcon } from '@/components/ui/Icons';
import DownloadApkModal from '@/components/ui/DownloadApkModal';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import {
  miniappsApi,
  organizationsApi,
  MiniApp,
  getOrganizationCode,
  getOrganizationFullName,
  unwrapData,
  unwrapMeta,
  PaginationMeta,
} from '@/api';
import { getMiniAppPhase } from '@/components/miniapp-detail/miniappActions';
import { LifecycleBadge, AvailabilityBadge } from '@/components/miniapp-detail/MiniAppStatusBadges';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import ActionMenu from '@/components/ui/ActionMenu';
import { PaginationProps } from '@/components/ui/Pagination';
import { DataTable, DataTableColumn, SortDirection } from '@/components/ui/DataTable';

/**
 * MiniApp catalog. Search, filters, sorting and paging all run on the API and
 * live in the URL, so a filtered view can be shared and survives Back.
 */

const METHOD_LABEL: Record<string, string> = {
  WEBVIEW: 'WebView',
  FLUTTER_PACKAGE: 'Flutter',
  NATIVE_SDK: 'Native SDK',
  DEEP_LINK: 'Deep link',
};

const LIFECYCLE_OPTIONS = [
  { value: 'ALL', label: 'All stages' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'TEST_PASSED', label: 'Test passed' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'ALL', label: 'Any availability' },
  { value: 'LIVE', label: 'Live' },
  { value: 'NOT_LIVE', label: 'Not released' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const METHOD_OPTIONS = [
  { value: 'ALL', label: 'All integrations' },
  { value: 'WEBVIEW', label: 'WebView' },
  { value: 'FLUTTER_PACKAGE', label: 'Flutter package' },
  { value: 'NATIVE_SDK', label: 'Native SDK' },
  { value: 'DEEP_LINK', label: 'Deep link' },
];

/** Columns the API can sort by (sortBy keys of GET /mini-apps). */
const SORTABLE = ['name', 'organization', 'lifecycle', 'availability', 'updatedAt'] as const;
const DEFAULT_SORT = { key: 'updatedAt', dir: 'desc' as SortDirection };
const DEFAULT_LIMIT = 10;

type Scope = 'all' | 'mine';

interface ListState {
  page: number;
  limit: number;
  search: string;
  stage: string;
  availability: string;
  method: string;
  org: string;
  sort: string;
  dir: SortDirection;
  /** null: the role's default (all for admins). Not fixed at first render, when the role may still be loading. */
  scope: Scope | null;
}

function readState(params: URLSearchParams, defaultScope: Scope): ListState {
  const sort = params.get('sort') || DEFAULT_SORT.key;
  const dir = params.get('dir');
  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
    limit: Math.max(1, parseInt(params.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    search: params.get('q') || '',
    stage: params.get('stage') || 'ALL',
    availability: params.get('availability') || 'ALL',
    method: params.get('method') || 'ALL',
    org: params.get('org') || 'ALL',
    sort: (SORTABLE as readonly string[]).includes(sort) ? sort : DEFAULT_SORT.key,
    dir: dir === 'asc' || dir === 'desc' ? dir : DEFAULT_SORT.dir,
    scope: params.get('scope') === 'mine' || params.get('scope') === 'all' ? (params.get('scope') as Scope) : null,
  };
}

function writeState(s: ListState, defaultScope: Scope): string {
  const p = new URLSearchParams();
  if (s.page > 1) p.set('page', String(s.page));
  if (s.limit !== DEFAULT_LIMIT) p.set('limit', String(s.limit));
  if (s.search.trim()) p.set('q', s.search.trim());
  if (s.stage !== 'ALL') p.set('stage', s.stage);
  if (s.availability !== 'ALL') p.set('availability', s.availability);
  if (s.method !== 'ALL') p.set('method', s.method);
  if (s.org !== 'ALL') p.set('org', s.org);
  if (s.sort !== DEFAULT_SORT.key || s.dir !== DEFAULT_SORT.dir) {
    p.set('sort', s.sort);
    p.set('dir', s.dir);
  }
  if (s.scope && s.scope !== defaultScope) p.set('scope', s.scope);
  return p.toString();
}

/** "3h ago", "2d ago", then a date. The full timestamp is in the title. */
function relativeTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type Dot = 'ok' | 'bad' | 'busy' | 'none';
const DOT_CLASS: Record<Dot, string> = {
  ok: 'bg-brand-500',
  bad: 'bg-rose-500',
  busy: 'bg-sky-500 animate-pulse',
  none: 'bg-slate-300 dark:bg-slate-600',
};

function scanState(app: MiniApp): { dot: Dot; label: string } {
  const v = String((app as any).validationStatus || '').toUpperCase();
  if (v === 'PASSED') return { dot: 'ok', label: 'Scan passed' };
  if (v === 'FAILED') return { dot: 'bad', label: 'Scan failed' };
  if (v === 'RUNNING' || v === 'PENDING' || v === 'QUEUED') return { dot: 'busy', label: 'Scanning' };
  return { dot: 'none', label: 'Not scanned' };
}

function buildState(app: MiniApp): { dot: Dot; label: string } {
  const b = String((app as any).buildStatus || '').toUpperCase();
  if (b === 'FAILED') return { dot: 'bad', label: 'Build failed' };
  if (b === 'BUILDING' || b === 'RUNNING' || b === 'QUEUED') return { dot: 'busy', label: 'Building' };
  if (b === 'COMPLETED' || b === 'SUCCESS' || b === 'PASSED') return { dot: 'ok', label: 'Build ok' };
  return { dot: 'none', label: 'No build' };
}

function openIssues(app: MiniApp): { count: number; severe: boolean } {
  const open = ((app as any).issues || []).filter(
    (i: any) => !['RESOLVED', 'CLOSED', 'DISMISSED'].includes(String(i?.status || '').toUpperCase()),
  );
  return {
    count: open.length,
    severe: open.some((i: any) => ['CRITICAL', 'HIGH'].includes(String(i?.severity || '').toUpperCase())),
  };
}

function StateLine({ dot, label }: { dot: Dot; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${DOT_CLASS[dot]}`} />
      {label}
    </span>
  );
}

function MiniAppsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, hasRole } = useAuth();

  // Admins choose between every app in their reach and their own; everyone
  // else always sees the apps they own or collaborate on.
  const isPlatformAdmin = hasRole('SUPER_ADMIN');
  const isAdmin = isPlatformAdmin || hasRole('ADMIN');
  const defaultScope: Scope = isAdmin ? 'all' : 'mine';

  const [state, setState] = useState<ListState>(() => readState(searchParams, defaultScope));
  // Only admins choose; everyone else always sees their own and shared apps
  const scope: Scope = isAdmin ? (state.scope ?? 'all') : 'mine';
  const [searchInput, setSearchInput] = useState(state.search);
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [orgOptions, setOrgOptions] = useState<{ value: string; label: string }[]>([]);
  const [apkVersion, setApkVersion] = useState<string | null>(null);

  // Any change other than paging returns to page 1
  const update = useCallback((patch: Partial<ListState>) => {
    setState((prev) => ({ ...prev, page: 1, ...patch }));
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== state.search) update({ search: searchInput });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, state.search, update]);

  // State -> URL (replace: filter changes are not history entries)
  useEffect(() => {
    const qs = writeState(state, defaultScope);
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [state, defaultScope, pathname]);

  // URL -> state on Back / Forward
  useEffect(() => {
    const onPop = () => {
      const next = readState(new URLSearchParams(window.location.search), defaultScope);
      setState(next);
      setSearchInput(next.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [defaultScope]);

  // Organization filter: platform admin only (everyone else sees one organization)
  useEffect(() => {
    if (!isPlatformAdmin) return;
    organizationsApi
      .getAll({ limit: 100 })
      .then((res) => {
        const orgs = unwrapData<any>(res);
        setOrgOptions([
          { value: 'ALL', label: 'All organizations' },
          ...orgs.map((o: any) => ({ value: o.id, label: o.code || o.name })),
        ]);
      })
      .catch(() => setOrgOptions([]));
  }, [isPlatformAdmin]);

  const fetchApps = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params: Record<string, any> = {
        page: state.page,
        limit: state.limit,
        mine: scope === 'mine',
        sortBy: state.sort,
        sortOrder: state.dir === 'asc' ? 'ASC' : 'DESC',
      };
      if (state.search.trim()) params.search = state.search.trim();
      if (state.stage !== 'ALL') params.status = state.stage;
      if (state.availability !== 'ALL') params.availability = state.availability;
      if (state.method !== 'ALL') params.integrationMethod = state.method;
      if (state.org !== 'ALL') params.organizationId = state.org;

      const res = await miniappsApi.getAll(params);
      setApps(unwrapData<MiniApp>(res));
      setMeta(unwrapMeta(res) ?? null);
    } catch (error: any) {
      const msg = error?.message || 'Could not load MiniApps';
      setFetchError(msg);
      toast.error(msg, 'Load failed');
    } finally {
      setIsLoading(false);
    }
  }, [state, scope]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps, role]);

  const columns: DataTableColumn<MiniApp>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'App',
        width: 'w-[26%]',
        sortable: true,
        cell: (app) => (
          <div className="flex items-center gap-3 min-w-0">
            <AppLogoAvatar logo={app.logo} name={app.name} size="md" />
            <div className="min-w-0">
              <span className="block font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                {app.name || '-'}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                <span className="font-mono">{app.appId}</span>
                <span aria-hidden="true"> · </span>
                {METHOD_LABEL[app.integrationMethod || ''] || app.integrationMethod}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'organization',
        header: 'Org',
        width: 'w-[8%]',
        headerClassName: 'hidden md:table-cell',
        className: 'hidden md:table-cell',
        sortable: true,
        cell: (app) => (
          <span
            title={getOrganizationFullName(app.organization)}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {app.organizationCode || getOrganizationCode(app.organization)}
          </span>
        ),
      },
      {
        key: 'lifecycle',
        header: 'Lifecycle',
        width: 'w-[14%]',
        sortable: true,
        cell: (app) => <LifecycleBadge app={app} />,
      },
      {
        key: 'availability',
        header: 'Availability',
        width: 'w-[12%]',
        sortable: true,
        cell: (app) => <AvailabilityBadge app={app} />,
      },
      {
        key: 'checks',
        header: 'Checks',
        width: 'w-[12%]',
        headerClassName: 'hidden lg:table-cell',
        className: 'hidden lg:table-cell',
        sortable: false,
        cell: (app) => (
          <div className="space-y-1">
            <StateLine {...scanState(app)} />
            <StateLine {...buildState(app)} />
          </div>
        ),
      },
      {
        key: 'issues',
        header: 'Issues',
        width: 'w-[8%]',
        headerClassName: 'hidden lg:table-cell',
        className: 'hidden lg:table-cell',
        sortable: false,
        cell: (app) => {
          const { count, severe } = openIssues(app);
          if (count === 0) return <span className="text-xs text-slate-400">None</span>;
          return (
            <Link
              href={`/issues?appId=${app.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:underline"
            >
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${severe ? 'bg-rose-500' : 'bg-amber-500'}`} />
              {count} open
            </Link>
          );
        },
      },
      {
        key: 'version',
        header: 'Version',
        width: 'w-[10%]',
        headerClassName: 'hidden xl:table-cell',
        className: 'hidden xl:table-cell',
        sortable: false,
        cell: (app) => {
          const live = app.currentReleaseVersion;
          const test = (app as any).activeTestVersion;
          if (!live && !test) return <span className="text-xs text-slate-400">-</span>;
          return (
            <div className="text-xs font-mono text-slate-600 dark:text-slate-300 space-y-0.5">
              {live && <div title="Live version">{live}</div>}
              {test && test !== live && (
                <div className="text-slate-400" title="Version under test">
                  test {test}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        width: 'w-[8%]',
        headerClassName: 'hidden md:table-cell',
        className: 'hidden md:table-cell',
        sortable: true,
        cell: (app) => {
          const iso = app.updatedAt || app.createdAt;
          return (
            <span
              className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
              title={iso ? new Date(iso).toLocaleString() : undefined}
            >
              {relativeTime(iso)}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        width: 'w-[2%]',
        className: 'text-right',
        sortable: false,
        cell: (app) => {
          const phase = getMiniAppPhase(app as any);
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
              <ActionMenu
                ariaLabel={`Actions for ${app.name || 'MiniApp'}`}
                items={[
                  {
                    label: 'Open',
                    href: `/miniapps/${app.id}`,
                    icon: <ArrowRightIcon className="w-4 h-4 text-slate-400" />,
                  },
                  {
                    label: 'Download test build',
                    hidden: !['testing', 'test-passed', 'live'].includes(phase),
                    icon: <DevicePhoneIcon className="w-4 h-4 text-slate-400" />,
                    onClick: () =>
                      setApkVersion(
                        (app as any).activeTestVersion || app.integrationConfig?.superAppTestVersion || 'v0.2.0',
                      ),
                  },
                  {
                    label: 'Issues',
                    href: `/issues?appId=${app.id}`,
                    icon: <BugIcon className="w-4 h-4 text-slate-400" />,
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  const filters = [
    {
      id: 'stage',
      label: 'Lifecycle',
      value: state.stage,
      options: LIFECYCLE_OPTIONS,
      onChange: (v: string) => update({ stage: v }),
      dropdownWidth: 'w-52',
    },
    {
      id: 'availability',
      label: 'Availability',
      value: state.availability,
      options: AVAILABILITY_OPTIONS,
      onChange: (v: string) => update({ availability: v }),
      dropdownWidth: 'w-48',
    },
    {
      id: 'method',
      label: 'Integration',
      value: state.method,
      options: METHOD_OPTIONS,
      onChange: (v: string) => update({ method: v }),
      dropdownWidth: 'w-48',
    },
    ...(isPlatformAdmin && orgOptions.length > 1
      ? [
          {
            id: 'org',
            label: 'Organization',
            value: state.org,
            options: orgOptions,
            onChange: (v: string) => update({ org: v }),
            dropdownWidth: 'w-56',
          },
        ]
      : []),
  ];

  const isFiltered =
    state.search.trim() !== '' ||
    state.stage !== 'ALL' ||
    state.availability !== 'ALL' ||
    state.method !== 'ALL' ||
    state.org !== 'ALL';

  const pagination: PaginationProps = {
    currentPage: meta?.page || state.page,
    totalPages: meta?.totalPages || 1,
    totalItems: meta?.totalItems ?? apps.length,
    pageSize: meta?.limit || state.limit,
    onPageChange: (page: number) => setState((prev) => ({ ...prev, page })),
    onPageSizeChange: (limit: number) => update({ limit }),
    showPageSizeSelector: true,
    showTotal: true,
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            MiniApps
          </h2>
          {isAdmin && (
            <div
              role="tablist"
              aria-label="Which MiniApps"
              className="mt-3 inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs"
            >
              {(['all', 'mine'] as Scope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={scope === s}
                  onClick={() => update({ scope: s })}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    scope === s
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {s === 'mine' ? 'Mine' : isPlatformAdmin ? 'All' : 'Organization'}
                </button>
              ))}
            </div>
          )}
        </div>
        <RegisterMiniAppButton />
      </div>

      {fetchError ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Could not load MiniApps</p>
          <p className="text-xs text-slate-500 mt-1">{fetchError}</p>
          <button
            type="button"
            onClick={fetchApps}
            className="mt-4 h-9 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable<MiniApp>
          data={apps}
          columns={columns}
          keyExtractor={(app) => app.id}
          loading={isLoading}
          loadingMessage="Loading..."
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search name, App ID or organization"
          filters={filters}
          isFiltered={isFiltered}
          onResetFilters={() => {
            setSearchInput('');
            update({ search: '', stage: 'ALL', availability: 'ALL', method: 'ALL', org: 'ALL' });
          }}
          totalItemsCount={meta?.totalItems ?? apps.length}
          manualSorting
          allowSortReset={false}
          sortBy={state.sort}
          sortDirection={state.dir}
          onSortChange={(key, dir) => update({ sort: key, dir })}
          emptyMessage={isFiltered ? 'No MiniApps match these filters' : 'No MiniApps yet'}
          emptySubMessage={isFiltered ? 'Change or reset the filters.' : 'Register a MiniApp to get started.'}
          paginationProps={pagination}
          onRowClick={(app) => router.push(`/miniapps/${app.id}`)}
          rowClassName="group cursor-pointer"
        />
      )}

      <DownloadApkModal
        isOpen={apkVersion !== null}
        onClose={() => setApkVersion(null)}
        defaultVersion={apkVersion || 'v0.2.0'}
      />
    </div>
  );
}

export default function MiniAppsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading...</div>}>
      <MiniAppsContent />
    </Suspense>
  );
}
