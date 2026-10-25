'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/inputs';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { rolesApi, Role } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { RolesTab, RoleModal } from '@/components/users';

export default function RolesPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canManageRoles = can('role:manage');

  // Roles Data State
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Fetch Roles from Database via Next.js BFF proxy
  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const data = await rolesApi.getAll();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.error('Failed to fetch roles', err);
        toast.error('Failed to load roles list');
      }
    } finally {
      setLoadingRoles(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Role Action Handlers
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setEditingRole(role);
    setIsRoleModalOpen(true);
  };

  const handleDuplicateRole = (role: Role) => {
    setEditingRole({
      ...role,
      id: '',
      name: `${role.name}_COPY`,
      description: `Copy of ${role.name}`,
    });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (['SUPER_ADMIN', 'ADMIN'].includes(role.name)) {
      toast.error('System roles cannot be deleted');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Role',
      message: `Are you sure you want to permanently delete "${role.name}"? Users assigned to this role will lose their granted privileges.`,
      confirmText: 'Delete Role',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      await rolesApi.delete(role.id);
      toast.success(`Role "${role.name}" deleted successfully`);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  return (
    <ProtectedRoute requiredPermission="role:read">
      <div className="space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl border border-brand-100 dark:border-brand-500/20 shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Roles & Permissions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage authorization tiers, custom roles, and live permission matrices across the ecosystem.
              </p>
            </div>
          </div>

          {canManageRoles && (
            <Button
              type="button"
              onClick={handleOpenCreateRole}
              className="gap-2 shadow-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Custom Role</span>
            </Button>
          )}
        </div>

        {/* Unified RBAC Command Center */}
        <RolesTab
          roles={roles}
          loadingRoles={loadingRoles}
          canManage={canManageRoles}
          onOpenCreateRole={handleOpenCreateRole}
          onOpenEditRole={handleOpenEditRole}
          onDuplicateRole={handleDuplicateRole}
          onDeleteRole={handleDeleteRole}
        />

        {/* Role Create / Edit Modal */}
        <RoleModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          editingRole={editingRole}
          onSuccess={() => {
            setIsRoleModalOpen(false);
            fetchRoles();
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
