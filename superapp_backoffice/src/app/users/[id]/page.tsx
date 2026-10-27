'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  usersApi,
  rolesApi,
  miniappsApi,
  auditLogsApi,
  User,
  Role,
  MiniApp,
  AuditLog,
  unwrapData,
  unwrapItem,
} from '@/api';
import { Button } from '@/components/ui/inputs';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { toast } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  UserDetailHeader,
  UserDetailTabs,
  UserModal,
  getUserEffectiveStatus,
} from '@/components/users';

function UserDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id =
    (typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '') || '';

  const { user: currentUser, can } = useAuth();
  const canManage = can('user:manage');

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [roles, setRoles] = useState<Role[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [loadingMiniApps, setLoadingMiniApps] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const confirm = useConfirm();

  // Fetch User Profile
  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingUser(true);
      const res = await usersApi.getById(id);
      const data = unwrapItem<User>(res);
      setUser(data);
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      toast.error('Failed to load user details');
    } finally {
      setLoadingUser(false);
    }
  }, [id]);

  // Fetch Roles for Edit Modal
  const fetchRoles = useCallback(async () => {
    try {
      const data = await rolesApi.getAll();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }, []);

  // Fetch Associated MiniApps
  const fetchMiniApps = useCallback(async (targetUser: User) => {
    try {
      setLoadingMiniApps(true);
      const res = await miniappsApi.getAll();
      const allApps = unwrapData<MiniApp>(res);
      // Match mini apps by ownerId, ownerEmail, or organizationId
      const userApps = allApps.filter(
        (app: any) =>
          app.ownerId === targetUser.id ||
          (targetUser.email && app.ownerEmail?.toLowerCase() === targetUser.email.toLowerCase()) ||
          (targetUser.organizationId && app.organizationId === targetUser.organizationId)
      );
      setMiniApps(userApps);
    } catch (err) {
      console.error('Failed to load associated mini-apps:', err);
    } finally {
      setLoadingMiniApps(false);
    }
  }, []);

  // Fetch Audit Logs for this user
  const fetchAuditLogs = useCallback(async (targetUser: User) => {
    try {
      setLoadingAuditLogs(true);
      const res = await auditLogsApi.getAll({
        actorId: targetUser.id,
        limit: 20,
      });
      const logs = unwrapData<AuditLog>(res);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load user audit activity:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchRoles();
  }, [fetchUser, fetchRoles]);

  useEffect(() => {
    if (user) {
      fetchMiniApps(user);
      fetchAuditLogs(user);
    }
  }, [user, fetchMiniApps, fetchAuditLogs]);

  // Toggle Account Active / Inactive Status
  const handleToggleStatus = async () => {
    if (!user || !canManage) return;

    const effectiveStatus = getUserEffectiveStatus(user);
    const isCurrentlyActive = effectiveStatus === 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'Deactivate' : 'Activate';

    // Prevent self-deactivation
    if (currentUser?.id === user.id) {
      toast.error('Self-deactivation guard: You cannot deactivate your own account.');
      return;
    }

    const ok = await confirm({
      title: `${actionLabel} Account`,
      message: (
        <span>
          Are you sure you want to {actionLabel.toLowerCase()} user{' '}
          <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>?
          {isCurrentlyActive
            ? ' Deactivated accounts cannot sign in or access developer credentials.'
            : ' Activated accounts will immediately regain system access.'}
        </span>
      ),
      confirmText: actionLabel,
      confirmVariant: isCurrentlyActive ? 'danger' : 'primary',
    });

    if (!ok) return;

    try {
      const updated = await usersApi.update(user.id, {
        isActive: !isCurrentlyActive,
      });
      setUser(unwrapItem<User>(updated));
      toast.success(`User ${user.name} ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${actionLabel.toLowerCase()} user`);
    }
  };

  // Quick Approve Handler for PENDING_APPROVAL accounts
  const handleApprove = async () => {
    if (!user || !canManage) return;
    try {
      const approved = await usersApi.approve(user.id, 'MA_DEVELOPER');
      setUser(unwrapItem<User>(approved));
      toast.success(`${user.name} approved as MiniApp Developer!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve user account');
    }
  };

  // Delete User Handler
  const handleDelete = async () => {
    if (!user || !canManage) return;

    if (currentUser?.id === user.id) {
      toast.error('Self-deletion guard: You cannot delete your own account.');
      return;
    }

    const ok = await confirm({
      title: 'Delete User Account',
      message: (
        <span>
          Are you sure you want to permanently delete{' '}
          <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>? This action cannot be undone.
        </span>
      ),
      confirmText: 'Delete Permanently',
      confirmVariant: 'danger',
    });

    if (!ok) return;

    try {
      await usersApi.delete(user.id);
      toast.success(`User ${user.name} deleted successfully.`);
      router.push('/users');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  if (loadingUser) {
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
        <span className="text-sm font-medium text-slate-500">Loading user profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">User Account Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The requested user account does not exist or has been removed from the directory.
        </p>
        <Button onClick={() => router.push('/users')} className="mt-2 font-semibold">
          Back to Users Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Profile Header & Action Bar */}
      <UserDetailHeader
        user={user}
        canManage={canManage}
        onEdit={() => setIsEditModalOpen(true)}
        onToggleStatus={handleToggleStatus}
        onApprove={handleApprove}
        onDelete={handleDelete}
      />

      {/* Tabs & Content Navigation */}
      <UserDetailTabs
        user={user}
        roles={roles}
        miniApps={miniApps}
        loadingMiniApps={loadingMiniApps}
        auditLogs={auditLogs}
        loadingAuditLogs={loadingAuditLogs}
      />

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <UserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          editingUser={user}
          roles={roles}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchUser();
          }}
        />
      )}
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <ProtectedRoute requiredPermission="user:read">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <span className="text-sm text-slate-400 animate-pulse">Loading user profile...</span>
          </div>
        }
      >
        <UserDetailContent />
      </Suspense>
    </ProtectedRoute>
  );
}
