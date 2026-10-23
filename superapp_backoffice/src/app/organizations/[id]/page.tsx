'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { organizationsApi, Organization, isRootOrganization } from '@/api';
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


export default function OrganizationDetailPage() {
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

  const confirm = useConfirm();

  const fetchOrganization = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await organizationsApi.getById(id);
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
              {organization.code || 'ORG'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                {organization.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {organization.parentAuthority || 'Non-Bank Financial Services Authority'}
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
                {organization.parentAuthority || 'Non-Bank Financial Services Authority'}
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

  // Edit organization (Super Admin / Admin only)
  const handleSaveEdit = async (formData: OrganizationFormData) => {
    if (!organization || !isSuperOrAdmin) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await organizationsApi.update(organization.id, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || undefined,
        parentAuthority:
          formData.parentAuthority.trim() || 'Non-Bank Financial Services Authority',
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Status Actions */}
      <OrganizationDetailHeader
        organization={organization}
        isSuperOrAdmin={isSuperOrAdmin}
        onToggleStatus={handleToggleStatus}
        onEdit={() => setIsEditModalOpen(true)}
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
