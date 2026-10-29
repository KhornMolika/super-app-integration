'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { organizationsApi, Organization, isRootOrganization, unwrapItem, unwrapData } from '@/api';
import { Button } from '@/components/ui/inputs';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { toast } from '@/components/ui/Toast';
import { BuildingIcon } from '@/components/ui/Icons';
import {
  OrganizationDetailHeader,
  OrganizationOverviewCard,
  OrganizationDetailTabs,
  OrganizationModal,
  OrganizationFormData,
} from '@/components/organizations';


function OrganizationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = (typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '') || '';

  const { user, role, can } = useAuth();
  const isSuperOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('organization:manage');

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parentOptions, setParentOptions] = useState<Organization[]>([]);

  const fetchParentOptions = useCallback(async () => {
    try {
      const res = await organizationsApi.getAll({ limit: 100, status: 'ACTIVE' });
      const items = unwrapData<Organization>(res);
      setParentOptions(items);
    } catch (e) {
      console.error('Failed to load parent options:', e);
    }
  }, []);

  useEffect(() => {
    if (isSuperOrAdmin) {
      fetchParentOptions();
    }
  }, [isSuperOrAdmin, fetchParentOptions]);

  const confirm = useConfirm();

  const fetchOrganization = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await organizationsApi.getById(id);
      const data = unwrapItem<Organization>(res);
      setOrganization(data);
    } catch (err: any) {
      console.error('Failed to load organization:', err);
      toast.error('Failed to load organization details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  // Toggle Organization Active / Inactive Status with Root Safety Lock
  const handleToggleStatus = async () => {
    if (!organization || !isSuperOrAdmin) return;
    const isCurrentlyActive = organization.status === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'Disable' : 'Enable';
    const isRoot = isRootOrganization(organization);
    const isOwnOrg = user?.organizationId === organization.id;

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
    const activeChildren = (organization.children || []).filter((c) => c.status === 'ACTIVE');
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
                <strong>{organization.name}</strong> operates as the parent authority for <strong>{activeChildren.length} active subordinate organization(s)</strong>. Disabling this authority would leave active subordinate regulators without a valid governing body.
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
              {organization.code || 'ORG'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {organization.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {organization.parent?.name || organization.parentAuthority || 'None (Independent)'}
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
              {organization.code || 'ORG'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {organization.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {organization.parent?.name || organization.parentAuthority || 'None (Independent)'}
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
        expectedValue: organization.name,
        placeholder: `Type "${organization.name}"`,
        label: (
          <span>
            Root Authority Safety Lock: Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">{organization.name}</span> to confirm:
          </span>
        ),
      } : undefined,
    });

    if (!isConfirmed) return;

    try {
      await organizationsApi.toggleStatus(organization.id, newStatus);
      toast.success(`Organization "${organization.name}" has been ${isCurrentlyActive ? 'disabled' : 'enabled'}.`);
      await fetchOrganization();
    } catch (err: any) {
      console.error('Failed to update organization status:', err);
      toast.error(
        err.response?.data?.message || err.message || `Failed to ${actionLabel.toLowerCase()} organization.`
      );
    }
  };

  // Delete organization
  const handleDeleteOrganization = async () => {
    if (!organization || !isSuperOrAdmin) return;
    const isRoot = isRootOrganization(organization);
    const isOwnOrg = user?.organizationId === organization.id;

    if (isRoot) {
      toast.error('The primary regulatory authority (FTC/FSA) cannot be deleted.');
      return;
    }

    if (isOwnOrg) {
      toast.error('Self-deletion guard: You cannot delete your own assigned organization.');
      return;
    }

    // Guard 1: Linked subordinate entities
    if ((organization.children?.length ?? 0) > 0) {
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
                <strong>{organization.name}</strong> cannot be deleted because <strong>{organization.children?.length} subordinate organization(s)</strong> are linked to it as their governing parent authority.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Linked Subordinate Organizations ({organization.children?.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {organization.children?.map((child) => (
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
    const usersCount = organization.users?.length || 0;
    const miniAppsCount = organization.miniApps?.length || 0;
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
                <strong>{organization.name}</strong> contains historical activity ({usersCount} assigned user(s) and {miniAppsCount} registered mini-app(s)). Under regulatory compliance standards, organizations with historical records cannot be permanently purged from the system.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              You can <strong>Disable</strong> this organization instead. This will suspend its active operations while keeping historical records and audit logs intact.
            </p>
          </div>
        ),
      });
      if (wantDisable) {
        handleToggleStatus();
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
              Are you sure you want to permanently delete <strong>{organization.name}</strong> ({organization.code || 'ORG'})? This operation cannot be reversed.
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
      await organizationsApi.delete(organization.id);
      toast.success(`Organization "${organization.name}" has been deleted successfully.`);
      router.push('/organizations');
    } catch (err: any) {
      console.error('Failed to delete organization:', err);
      toast.error(
        err.response?.data?.message || err.message || 'Failed to delete organization.'
      );
    }
  };

  // Edit organization (Super Admin / Admin only)
  const handleSaveEdit = async (formData: OrganizationFormData) => {
    if (!organization || !isSuperOrAdmin) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await organizationsApi.update(organization.id, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || undefined,
        parentId: formData.parentId || null,
        parentAuthority: formData.parentId ? (formData.parentAuthority?.trim() || undefined) : null,
        description: formData.description.trim() || undefined,
        status: formData.status,
      });
      toast.success(`Organization "${formData.name}" updated successfully.`);
      setIsEditModalOpen(false);
      await fetchOrganization();
    } catch (err: any) {
      console.error('Failed to update organization:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to update organization.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <svg
          className="animate-spin h-8 w-8 text-brand-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium text-slate-500">Loading organization details...</span>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 w-16 h-16 mx-auto flex items-center justify-center text-slate-400 mb-4">
          <BuildingIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Organization Not Found</h2>
        <p className="text-slate-500 text-sm mt-1">The organization requested does not exist or has been removed.</p>
        <Button onClick={() => router.push(isSuperOrAdmin ? '/organizations' : '/miniapps')} className="mt-4">
          {isSuperOrAdmin ? 'Back to Organizations' : 'Back to Mini Apps'}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header & Status Actions */}
      <OrganizationDetailHeader
        organization={organization}
        isSuperOrAdmin={isSuperOrAdmin}
        onToggleStatus={handleToggleStatus}
        onEdit={() => setIsEditModalOpen(true)}
        onDelete={isSuperOrAdmin ? handleDeleteOrganization : undefined}
        isOwnOrg={user?.organizationId === organization.id}
      />

      {/* Scope & Quick Metrics */}
      <OrganizationOverviewCard organization={organization} />

      {/* Assigned Users & Mini Apps Tabs */}
      <OrganizationDetailTabs
        organization={organization}
        isSuperOrAdmin={isSuperOrAdmin}
      />

      {/* Edit Organization Modal (Super Admin / Admin only) */}
      {isSuperOrAdmin && (
        <OrganizationModal
          isOpen={isEditModalOpen}
          editingOrg={organization}
          availableOrganizations={parentOptions}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onClose={() => {
            setIsEditModalOpen(false);
            setErrorMessage(null);
          }}
          onSubmit={handleSaveEdit}
        />
      )}
    </div>
  );
}


export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><span className="text-sm text-slate-400 animate-pulse">Loading organization...</span></div>}>
      <OrganizationDetailContent />
    </Suspense>
  );
}
