'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  organizationsApi,
  Organization,
  isRootOrganization,
  unwrapData,
  unwrapMeta,
  unwrapItem,
  PaginationMeta,
} from '@/api';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { toast } from '@/components/ui/Toast';
import { PaginationProps } from '@/components/ui/Pagination';
import { BuildingIcon } from '@/components/ui/Icons';
import {
  OrganizationFilterBar,
  OrganizationsTable,
  OrganizationModal,
  OrganizationStatusFilter,
  OrganizationFormData,
} from '@/components/organizations';

function OrganizationsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, role, can, isLoading: isAuthLoading } = useAuth();
  const isSuperOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('organization:manage');

  // Read initial query params from URL
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = (searchParams.get('status') as OrganizationStatusFilter) || 'ALL';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const lastPushedUrlRef = useRef<string>('');

  // Server-Driven Pagination & Filter State
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [statusFilter, setStatusFilter] = useState<OrganizationStatusFilter>(initialStatus);

  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: initialPage,
    limit: initialLimit,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Persistent Global KPI Status Counts (Independent of active table filters)
  const [globalCounts, setGlobalCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    isLoaded: false,
  });

  const fetchGlobalCounts = useCallback(async () => {
    try {
      const res = await organizationsApi.getStats();
      const stats = unwrapItem(res);
      if (stats && typeof stats.total === 'number') {
        setGlobalCounts({
          total: stats.total,
          active: stats.active,
          inactive: stats.inactive,
          isLoaded: true,
        });
        return;
      }
    } catch {
      // fallback: fetch all organizations to compute counts
      try {
        const res = await organizationsApi.getAll({ limit: 100 });
        const list = unwrapData<Organization>(res);
        setGlobalCounts({
          total: list.length,
          active: list.filter((o) => o.status === 'ACTIVE').length,
          inactive: list.filter((o) => o.status === 'INACTIVE').length,
          isLoaded: true,
        });
      } catch (_) {}
    }
  }, []);

  // Modal states
  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parentOptions, setParentOptions] = useState<Organization[]>([]);

  const fetchParentOptions = useCallback(async () => {
    try {
      const res = await organizationsApi.getAll({ limit: 100, status: 'ACTIVE' });
      const items = unwrapData<Organization>(res);
      setParentOptions(items);
    } catch (e) {
      console.error('Failed to load parent organizations for selector:', e);
    }
  }, []);

  useEffect(() => {
    if (isSuperOrAdmin) {
      fetchParentOptions();
    }
  }, [isSuperOrAdmin, fetchParentOptions]);

  const confirm = useConfirm();

  // Redirect MA Developers straight to their assigned organization's detail page
  useEffect(() => {
    if (!isAuthLoading && !isSuperOrAdmin) {
      if (user?.organizationId) {
        router.replace(`/organizations/${user.organizationId}`);
      }
    }
  }, [isAuthLoading, isSuperOrAdmin, user?.organizationId, router]);

  // Debounce search input to avoid hitting API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchQuery) {
          setCurrentPage(1);
          return searchQuery;
        }
        return prev;
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Synchronize active table filters and pagination state with browser address bar without router flooding
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('limit', String(pageSize));
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    if (typeof window !== 'undefined') {
      const currentFullUrl = window.location.pathname + window.location.search;
      if (currentFullUrl !== targetUrl && window.history?.replaceState) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, pathname]);

  // Handle browser back/forward navigation smoothly via popstate
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const pageFromUrl = Math.max(1, parseInt(params.get('page') || '1', 10));
      const limitFromUrl = Math.max(1, parseInt(params.get('limit') || '10', 10));
      const searchFromUrl = params.get('search') || '';
      const statusFromUrl = (params.get('status') as OrganizationStatusFilter) || 'ALL';

      setCurrentPage(pageFromUrl);
      setPageSize(limitFromUrl);
      setStatusFilter(statusFromUrl);
      setSearchQuery(searchFromUrl);
      setDebouncedSearch(searchFromUrl);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Fetch organizations from database via Server-Driven Query API
  const fetchOrganizations = useCallback(async () => {
    if (!isSuperOrAdmin) return;
    try {
      setIsFetching(true);
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      }
      if (statusFilter !== 'ALL') {
        queryParams.status = statusFilter;
      }

      const res = await organizationsApi.getAll(queryParams);
      const orgList = unwrapData<Organization>(res);
      setOrganizations(orgList);

      const meta = unwrapMeta(res);
      if (meta) {
        setPaginationMeta(meta);
      } else {
        setPaginationMeta({
          page: currentPage,
          limit: pageSize,
          totalItems: orgList.length,
          totalPages: Math.max(1, Math.ceil(orgList.length / pageSize)),
          hasNextPage: false,
          hasPreviousPage: currentPage > 1,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
      toast.error('Failed to load organizations from database.');
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  }, [isSuperOrAdmin, currentPage, pageSize, debouncedSearch, statusFilter]);

  // Load global KPI stats once on mount
  useEffect(() => {
    if (!isAuthLoading && isSuperOrAdmin) {
      fetchGlobalCounts();
    }
  }, [isAuthLoading, isSuperOrAdmin, fetchGlobalCounts]);

  // Fetch table data when page, limit, search, or status change
  useEffect(() => {
    if (!isAuthLoading && isSuperOrAdmin) {
      fetchOrganizations();
    }
  }, [isAuthLoading, isSuperOrAdmin, fetchOrganizations]);

  // Status Filter change handler
  const handleStatusFilterChange = (filter: OrganizationStatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // 2. Navigation & Action Handlers
  const handleOpenCreate = () => {
    setSelectedOrg(null);
    setErrorMessage(null);
    fetchParentOptions();
    setIsCreateEditModalOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setSelectedOrg(org);
    setErrorMessage(null);
    fetchParentOptions();
    setIsCreateEditModalOpen(true);
  };

  const handleOpenView = (org: Organization) => {
    router.push(`/organizations/${org.id}`);
  };

  // Toggle Organization Active / Inactive Status with Root Safety Lock
  const handleToggleStatus = async (org: Organization) => {
    const isCurrentlyActive = org.status === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'Disable' : 'Enable';
    const isRoot = isRootOrganization(org);
    const isOwnOrg = user?.organizationId === org.id;

    // Disabling guard 1: Root system anchor cannot be disabled
    if (isCurrentlyActive && isRoot) {
      toast.error(
        'The primary regulatory authority (FTC/FSA) cannot be disabled because it operates the SuperApp core infrastructure.',
      );
      return;
    }

    // Disabling guard 2: Operators cannot disable their own assigned organization
    if (isCurrentlyActive && isOwnOrg) {
      toast.error(
        'Self-deactivation guard: You cannot disable your own assigned organization.',
      );
      return;
    }

    // Disabling guard 3: Cannot disable parent authority while active subordinate children exist
    const activeChildren = (org.children || []).filter((c) => c.status === 'ACTIVE');
    if (isCurrentlyActive && activeChildren.length > 0) {
      await confirm({
        title: 'Cannot Disable Parent Authority',
        confirmText: 'I Understand',
        confirmVariant: 'warning',
        cancelText: '',
        message: (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Active Subordinate Hierarchy Protection
              </span>
              <p className="leading-relaxed">
                <strong>{org.name}</strong> operates as the parent authority for <strong>{activeChildren.length} active subordinate organization(s)</strong>. Disabling this authority would leave active subordinate regulators without a valid governing body.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Subordinate Organizations ({activeChildren.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {activeChildren.map((child) => (
                  <div key={child.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                        {child.code || 'ORG'}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{child.name}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Required Next Steps:</span>
              <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                <li>Reassign each subordinate entity to another parent authority, or</li>
                <li>Disable each subordinate organization first.</li>
              </ol>
            </div>
          </div>
        ),
      });
      return;
    }

    const isConfirmed = await confirm({
      title: `${actionLabel} Organization`,
      message: isCurrentlyActive ? (
        <div className="space-y-3">
          {/* Organization Preview Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-xs shrink-0">
              {org.code || 'ORG'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {org.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {org.parent?.name || org.parentAuthority || 'None (Independent)'}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          {org.children && org.children.length > 0 && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              Note: All {org.children.length} subordinate organization(s) under this authority are already inactive. Disabling this parent authority is permitted.
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Are you sure you want to disable this organization? Active operations and mini-app reviews will be temporarily suspended until re-enabled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-xs shrink-0">
              {org.code || 'ORG'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {org.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {org.parent?.name || org.parentAuthority || 'None (Independent)'}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Inactive
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Are you sure you want to re-enable this organization?
          </p>
        </div>
      ),
      confirmText: `${actionLabel} Organization`,
      confirmVariant: isCurrentlyActive ? 'danger' : 'primary',
    });

    if (!isConfirmed) return;

    try {
      await organizationsApi.toggleStatus(org.id, newStatus);
      toast.success(`Organization ${org.name} has been ${actionLabel.toLowerCase()}d.`);
      await fetchOrganizations();
      fetchGlobalCounts();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update organization status.');
    }
  };

  // Delete Organization
  const handleDelete = async (org: Organization) => {
    const isRoot = isRootOrganization(org);
    if (isRoot) {
      toast.error('The primary regulatory authority (FTC/FSA) cannot be deleted.');
      return;
    }

    if (user?.organizationId === org.id) {
      toast.error('Self-deletion guard: You cannot delete your own assigned organization.');
      return;
    }

    // Guard 1: Linked subordinate entities
    if ((org.children?.length ?? 0) > 0) {
      await confirm({
        title: 'Cannot Delete Parent Authority',
        confirmText: 'I Understand',
        confirmVariant: 'warning',
        cancelText: '',
        message: (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Relational Integrity Guard
              </span>
              <p className="leading-relaxed">
                <strong>{org.name}</strong> cannot be deleted because <strong>{org.children?.length} subordinate organization(s)</strong> are linked to it as their governing parent authority.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Linked Subordinate Organizations ({org.children?.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {org.children?.map((child) => (
                  <div key={child.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{child.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{child.code || 'ORG'}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To delete this organization, you must first edit its subordinate entities to assign a different parent authority or delete them.
            </p>
          </div>
        ),
      });
      return;
    }

    // Guard 2: Historical records (users or mini-apps)
    const usersCount = org.users?.length || 0;
    const miniAppsCount = org.miniApps?.length || 0;
    if (usersCount > 0 || miniAppsCount > 0) {
      const wantDisable = await confirm({
        title: 'Cannot Delete Active Regulatory Body',
        confirmText: 'Disable Organization Instead',
        cancelText: 'Cancel',
        confirmVariant: 'warning',
        message: (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Compliance Audit Trail Protection
              </span>
              <p className="leading-relaxed">
                <strong>{org.name}</strong> contains historical activity ({usersCount} assigned user(s) and {miniAppsCount} registered mini-app(s)). Under regulatory compliance standards, organizations with historical records cannot be permanently purged from the system.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              You can <strong>Disable</strong> this organization instead. This will suspend its active operations while keeping historical records and audit logs intact.
            </p>
          </div>
        ),
      });
      if (wantDisable) {
        handleToggleStatus(org);
      }
      return;
    }

    // Guard 3: Clean draft / test organization -> allow permanent deletion
    const isConfirmed = await confirm({
      title: 'Delete Organization',
      message: (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Permanent Deletion Warning
            </span>
            <p className="leading-relaxed">
              Are you sure you want to permanently delete <strong>{org.name}</strong> ({org.code || 'ORG'})? This operation cannot be reversed.
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This organization has no linked users, mini-apps, or subordinate entities and will be permanently removed.
          </p>
        </div>
      ),
      confirmText: 'Delete Permanently',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await organizationsApi.delete(org.id);
      toast.success(`Organization "${org.name}" has been deleted successfully.`);
      await fetchOrganizations();
      fetchGlobalCounts();
      fetchParentOptions();
    } catch (err: any) {
      console.error('Failed to delete organization:', err);
      toast.error(
        err.response?.data?.message || err.message || 'Failed to delete organization.'
      );
    }
  };

  // Save (Create or Edit)
  const handleSave = async (formData: OrganizationFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: Partial<Organization> = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || undefined,
        parentId: formData.parentId || null,
        parentAuthority: formData.parentId ? formData.parentAuthority?.trim() : null,
        description: formData.description?.trim() || undefined,
        status: formData.status,
      };
      if (selectedOrg) {
        await organizationsApi.update(selectedOrg.id, payload);
        toast.success(`Organization "${formData.name}" updated successfully.`);
      } else {
        await organizationsApi.create(payload);
        toast.success(`Organization "${formData.name}" registered successfully.`);
      }
      setIsCreateEditModalOpen(false);
      setSelectedOrg(null);
      await fetchOrganizations();
      fetchGlobalCounts();
      fetchParentOptions();
    } catch (err: any) {
      console.error('Error saving organization:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to save organization.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If MA Developer is redirecting to their own organization detail page
  if (isAuthLoading || (!isSuperOrAdmin && user?.organizationId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <svg className="animate-spin h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs text-slate-500">Redirecting to your organization...</span>
      </div>
    );
  }

  // If MA Developer has no organization assigned
  if (!isSuperOrAdmin && !user?.organizationId) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 w-14 h-14 mx-auto flex items-center justify-center">
          <BuildingIcon className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Organization Assigned</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Your account is not currently assigned to a regulatory organization. Please contact a Super Administrator to link your profile to an organization.
        </p>
      </div>
    );
  }

  // Server-Driven Pagination Props for OrganizationsTable
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Organizations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage subordinate regulators, administrative departments, and oversight bodies under the
          Non-Bank Financial Services Authority (FSA).
        </p>
      </div>

      {/* Search & Status Filter Bar (All / Active / Inactive) */}
      <OrganizationFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        totalCount={globalCounts.isLoaded ? globalCounts.total : (statusFilter === 'ALL' ? (paginationMeta.totalItems || organizations.length) : globalCounts.total)}
        activeCount={globalCounts.isLoaded ? globalCounts.active : (statusFilter === 'ACTIVE' ? (paginationMeta.totalItems || organizations.length) : globalCounts.active)}
        inactiveCount={globalCounts.isLoaded ? globalCounts.inactive : (statusFilter === 'INACTIVE' ? (paginationMeta.totalItems || organizations.length) : globalCounts.inactive)}
        onAddClick={handleOpenCreate}
        isSearching={isFetching || searchQuery !== debouncedSearch}
      />

      {/* Organizations Table with Server-Driven Pagination */}
      <OrganizationsTable
        organizations={organizations}
        loading={loading && organizations.length === 0}
        onView={handleOpenView}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        paginationProps={paginationProps}
        userOrganizationId={user?.organizationId}
      />

      {/* Create / Edit Modal */}
      <OrganizationModal
        isOpen={isCreateEditModalOpen}
        editingOrg={selectedOrg}
        availableOrganizations={parentOptions.length > 0 ? parentOptions : organizations}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onClose={() => {
          setIsCreateEditModalOpen(false);
          setSelectedOrg(null);
        }}
        onSubmit={handleSave}
      />
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Organizations Directory...</div>}>
      <OrganizationsContent />
    </Suspense>
  );
}
