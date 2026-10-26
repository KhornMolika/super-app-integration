'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  organizationsApi,
  Organization,
  isRootOrganization,
  unwrapData,
  unwrapMeta,
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

  // Modal states
  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [currentPage, pageSize, debouncedSearch, statusFilter, pathname, router]);

  // 1. Fetch organizations from database via Server-Driven Query API
  const fetchOrganizations = useCallback(async () => {
    if (!isSuperOrAdmin) return;
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [isSuperOrAdmin, currentPage, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!isAuthLoading && isSuperOrAdmin) {
      fetchOrganizations();
    }
  }, [fetchOrganizations, isAuthLoading, isSuperOrAdmin]);

  // Status Filter change handler
  const handleStatusFilterChange = (filter: OrganizationStatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // 2. Navigation & Action Handlers
  const handleOpenCreate = () => {
    setSelectedOrg(null);
    setErrorMessage(null);
    setIsCreateEditModalOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setSelectedOrg(org);
    setErrorMessage(null);
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
        'The root regulatory system anchor (FTC/FSA) cannot be disabled because it operates the SuperApp core infrastructure.',
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
                {org.parentAuthority || 'Non-Bank Financial Services Authority'}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

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
                {org.parentAuthority || 'Non-Bank Financial Services Authority'}
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
    } catch (err: any) {
      console.error('Error toggling status:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update organization status.');
    }
  };

  // Save (Create or Edit)
  const handleSave = async (formData: OrganizationFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (selectedOrg) {
        await organizationsApi.update(selectedOrg.id, formData);
        toast.success(`Organization "${formData.name}" updated successfully.`);
      } else {
        await organizationsApi.create(formData);
        toast.success(`Organization "${formData.name}" registered successfully.`);
      }
      setIsCreateEditModalOpen(false);
      setSelectedOrg(null);
      await fetchOrganizations();
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
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
        totalCount={paginationMeta.totalItems}
        activeCount={organizations.filter((o) => o.status === 'ACTIVE').length}
        inactiveCount={organizations.filter((o) => o.status === 'INACTIVE').length}
        onAddClick={handleOpenCreate}
      />

      {/* Organizations Table with Server-Driven Pagination */}
      <OrganizationsTable
        organizations={organizations}
        loading={loading}
        onView={handleOpenView}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        paginationProps={paginationProps}
        userOrganizationId={user?.organizationId}
      />

      {/* Create / Edit Modal */}
      <OrganizationModal
        isOpen={isCreateEditModalOpen}
        editingOrg={selectedOrg}
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
