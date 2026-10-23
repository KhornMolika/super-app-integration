'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { organizationsApi, Organization, isRootOrganization } from '@/api';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { toast } from '@/components/ui/Toast';
import { usePagination } from '@/components/ui/Pagination';
import { BuildingIcon } from '@/components/ui/Icons';
import {
  OrganizationFilterBar,
  OrganizationsTable,
  OrganizationModal,
  OrganizationStatusFilter,
  OrganizationFormData,
} from '@/components/organizations';


export default function OrganizationsPage() {
  const router = useRouter();
  const { user, role, can, isLoading: isAuthLoading } = useAuth();
  const isSuperOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('organization:manage');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizationStatusFilter>('ALL');

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

  // 1. Fetch organizations from database (Super Admin / Admin only)
  const fetchOrganizations = useCallback(async () => {
    if (!isSuperOrAdmin) return;
    try {
      setLoading(true);
      const data = await organizationsApi.getAll();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
      toast.error('Failed to load organizations from database.');
    } finally {
      setLoading(false);
    }
  }, [isSuperOrAdmin]);

  useEffect(() => {
    if (!isAuthLoading && isSuperOrAdmin) {
      fetchOrganizations();
    }
  }, [fetchOrganizations, isAuthLoading, isSuperOrAdmin]);

  // 2. Filter organizations based on search query and status filter (ACTIVE / INACTIVE)
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // Status filtering
      if (statusFilter !== 'ALL' && org.status !== statusFilter) {
        return false;
      }

      // Search query filtering across name, code, parentAuthority, and description
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = org.name?.toLowerCase().includes(query);
        const matchesCode = org.code?.toLowerCase().includes(query);
        const matchesParent = org.parentAuthority?.toLowerCase().includes(query);
        const matchesDesc = org.description?.toLowerCase().includes(query);

        return matchesName || matchesCode || matchesParent || matchesDesc;
      }

      return true;
    });
  }, [organizations, statusFilter, searchQuery]);

  // Client-side pagination (10 items per page with page size selector)
  const { paginatedItems, paginationProps } = usePagination(filteredOrganizations, 10);

  // Status counts for filter bar tabs
  const activeCount = useMemo(
    () => organizations.filter((o) => o.status === 'ACTIVE').length,
    [organizations]
  );
  const inactiveCount = useMemo(
    () => organizations.filter((o) => o.status === 'INACTIVE').length,
    [organizations]
  );

  // 3. Navigation & Action Handlers
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

    // Disabling guard: Non-superadmins cannot disable root authority
    if (isCurrentlyActive && isRoot && role !== 'SUPER_ADMIN') {
      toast.error('The root regulatory authority can only be disabled by a Super Administrator.');
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

          {/* Unified Warning Callout */}
          {(isRoot || isOwnOrg) && (
            <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                <svg className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>High-Impact Regulatory Action</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-rose-700/90 dark:text-rose-300/90">
                {isRoot && isOwnOrg
                  ? 'This is the root parent authority and your assigned organization. Suspending it affects all subordinate services and active operator accounts.'
                  : isRoot
                  ? 'This is the primary root parent authority. Suspending it will temporarily restrict all dependent mini-apps and regulatory submissions.'
                  : 'You are an assigned operator of this organization. Disabling it will flag your own authority as inactive.'}
              </p>
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
                {org.parentAuthority || 'Non-Bank Financial Services Authority'}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Inactive
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This will restore operational access for assigned operators and enable mini-app registrations to proceed.
          </p>
        </div>
      ),
      confirmText: `${actionLabel} Organization`,
      cancelText: 'Cancel',
      confirmVariant: isCurrentlyActive ? (isRoot ? 'danger' : 'warning') : 'success',
      requireInputMatch: isCurrentlyActive && isRoot ? {
        expectedValue: org.name,
        placeholder: `Type "${org.name}"`,
        label: (
          <span>
            Root Authority Safety Lock: Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">{org.name}</span> to confirm:
          </span>
        ),
      } : undefined,
    });

    if (!isConfirmed) return;

    try {
      await organizationsApi.toggleStatus(org.id, newStatus);
      toast.success(`Organization "${org.name}" has been ${isCurrentlyActive ? 'disabled' : 'enabled'}.`);
      await fetchOrganizations();
    } catch (err: any) {
      console.error(`Error toggling status for organization:`, err);
      toast.error(
        err.response?.data?.message || err.message || `Failed to ${actionLabel.toLowerCase()} organization.`
      );
    }
  };

  const handleSave = async (formData: OrganizationFormData) => {
    if (!formData.name.trim()) {
      setErrorMessage('Organization name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase() || undefined,
      parentAuthority:
        formData.parentAuthority.trim() || 'Non-Bank Financial Services Authority',
      description: formData.description.trim() || undefined,
      status: formData.status,
    };

    try {
      if (selectedOrg) {
        await organizationsApi.update(selectedOrg.id, payload);
        toast.success(`Organization "${formData.name}" updated successfully.`);
      } else {
        await organizationsApi.create(payload);
        toast.success(`Organization "${formData.name}" created successfully.`);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
        onStatusFilterChange={setStatusFilter}
        totalCount={organizations.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        onAddClick={handleOpenCreate}
      />

      {/* Organizations Table with Integrated Card Footer Pagination */}
      <OrganizationsTable
        organizations={paginatedItems}
        loading={loading}
        onView={handleOpenView}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
        paginationProps={filteredOrganizations.length > 0 ? paginationProps : undefined}
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
