'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, Loader2, Copy } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { rolesApi, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { RoleForm, RoleFormData } from '@/components/roles/RoleForm';

function CreateRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const cloneFromId = searchParams.get('cloneFrom');
  const [loadingInitial, setLoadingInitial] = useState(!!cloneFromId);
  const [initialData, setInitialData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clonedRoleName, setClonedRoleName] = useState<string | null>(null);

  // If cloneFrom query param is provided, fetch original role to clone permissions
  useEffect(() => {
    if (!cloneFromId) return;

    let isMounted = true;
    rolesApi
      .getById(cloneFromId)
      .then((role: Role) => {
        if (!isMounted || !role) return;
        setClonedRoleName(role.name);
        setInitialData({
          name: `${role.name}_COPY`,
          description: role.description ? `Copy of ${role.name}: ${role.description}` : `Copy of ${role.name}`,
          permissions: role.permissions || [],
          isActive: true,
        });
      })
      .catch((err) => {
        console.error('Failed to load role for cloning', err);
        toast.error('Could not load original role to clone.');
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cloneFromId, toast]);

  const handleSubmit = async (formData: RoleFormData) => {
    try {
      setIsSubmitting(true);
      await rolesApi.create({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      });

      toast.success(`Role "${formData.name}" has been created successfully.`, 'Role Created');
      router.push('/roles');
    } catch (err: any) {
      console.error('Error creating role', err);
      toast.error(err?.message || 'Failed to create role.', 'Role Creation Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <span className="text-xs text-slate-500">Loading role template...</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Top Header / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/roles"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
            title="Back to Roles"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Roles /</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {clonedRoleName ? `Clone Role (${clonedRoleName})` : 'Create Custom Role'}
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {clonedRoleName
                ? `Duplicating scope settings from "${clonedRoleName}" into a new custom role template.`
                : 'Configure a new authorization tier and customize assigned API permissions.'}
            </p>
          </div>
        </div>

        {clonedRoleName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold">
            <Copy className="w-3.5 h-3.5" />
            <span>Cloned from {clonedRoleName}</span>
          </div>
        )}
      </div>

      {/* Role Builder Form */}
      <RoleForm
        initialData={initialData}
        isEditing={false}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        cancelHref="/roles"
      />
    </div>
  );
}

export default function CreateRolePage() {
  return (
    <ProtectedRoute requiredPermission="role:manage">
      <Suspense
        fallback={
          <div className="w-full h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        }
      >
        <CreateRoleContent />
      </Suspense>
    </ProtectedRoute>
  );
}
