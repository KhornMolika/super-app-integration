'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { rolesApi, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { RoleForm, RoleFormData } from '@/components/roles/RoleForm';
import { isSystemRole } from '@/components/users/types';

function EditRoleContent() {
  const router = useRouter();
  const routeParams = useParams();
  const { toast } = useToast();

  const id = typeof routeParams?.id === 'string' ? routeParams.id : '';
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    rolesApi
      .getById(id)
      .then((data: Role) => {
        if (!isMounted) return;
        if (!data || !data.id) {
          setNotFound(true);
        } else {
          setRole(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch role details', err);
        if (isMounted) setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSubmit = async (formData: RoleFormData) => {
    if (!role) return;

    try {
      setIsSubmitting(true);
      await rolesApi.update(role.id, {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        isActive: formData.isActive,
      });

      toast.success(`Role "${formData.name}" has been updated successfully.`, 'Role Updated');
      router.push('/roles');
    } catch (err: any) {
      console.error('Error updating role', err);
      toast.error(err?.message || 'Failed to update role.', 'Update Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-72 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <span className="text-xs text-slate-500">Loading role configuration...</span>
      </div>
    );
  }

  if (notFound || !role) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <div className="text-center py-16 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Role Not Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The role you are attempting to edit does not exist or may have been deleted.
            </p>
          </div>
          <Link
            href="/roles"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Roles Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  const isSystem = isSystemRole(role.name);

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
                Edit Role: {role.name}
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Modify assigned permission scopes and metadata for role &ldquo;{role.name}&rdquo;.
            </p>
          </div>
        </div>
      </div>

      {/* Role Editor Form */}
      <RoleForm
        initialData={{
          name: role.name,
          description: role.description || '',
          permissions: role.permissions || [],
          isActive: role.isActive,
        }}
        isSystemRole={isSystem}
        isEditing={true}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        cancelHref="/roles"
      />
    </div>
  );
}

export default function EditRolePage() {
  return (
    <ProtectedRoute requiredPermission="role:manage">
      <Suspense
        fallback={
          <div className="w-full h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        }
      >
        <EditRoleContent />
      </Suspense>
    </ProtectedRoute>
  );
}
