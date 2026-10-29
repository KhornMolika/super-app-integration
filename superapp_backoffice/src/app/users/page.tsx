'use client';
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/inputs';
import { ArrowRightIcon } from '@/components/ui/Icons';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import {
  usersApi,
  rolesApi,
  organizationsApi,
  User,
  Role,
  Organization,
  unwrapData,
  unwrapMeta,
  unwrapItem,
  PaginationMeta,
} from '@/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { PaginationProps } from '@/components/ui/Pagination';
import { CleanDropdownOption } from '@/components/ui/CleanDropdown';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import {
  UserModal,
  getRoleTheme,
  getUserRoles,
  getUserEffectiveStatus,
} from '@/components/users';
function UsersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { can, user: currentUser } = useAuth();
  const hasUserRead = can('user:read');
  const canManageUsers = can('user:manage');
  // Read initial query params from URL
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
  const initialSearch = searchParams.get('search') || '';
  const initialRole = searchParams.get('role') || 'ALL';
  const initialStatus = searchParams.get('status') || 'ALL';
  // Users & Roles Data State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  // Server-Driven Pagination & Filters State
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);
  const [userSearch, setUserSearch] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [roleFilter, setRoleFilter] = useState<string>(initialRole);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
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
    pending: 0,
    inactive: 0,
  });
  const fetchGlobalCounts = useCallback(async () => {
    if (!can('user:read')) return;
    try {
      const res = await usersApi.getStats();
      const stats = unwrapItem(res);
      if (stats && typeof stats.total === 'number') {
        setGlobalCounts({
          total: stats.total,
          active: stats.active,
          pending: stats.pending,
          inactive: stats.inactive,
        });
        return;
      }
    } catch {
      // fallback to getAll({ limit: 10 })
    }
    try {
      const res = await usersApi.getAll({ limit: 100 });
      const list = unwrapData<User>(res);
      setGlobalCounts({
        total: list.length,
        active: list.filter((u) => getUserEffectiveStatus(u) === 'ACTIVE').length,
        pending: list.filter((u) => getUserEffectiveStatus(u) === 'PENDING_APPROVAL').length,
        inactive: list.filter((u) => getUserEffectiveStatus(u) === 'INACTIVE').length,
      });
    } catch (err) {
      console.error('Failed to fetch user counts', err);
    }
  }, [can]);
  // Modals State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // Debounce search input to avoid spamming the backend on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedSearch !== userSearch) {
        setDebouncedSearch(userSearch);
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [userSearch, debouncedSearch]);
  // Synchronize active table filters and pagination state with browser URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(pageSize));
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    const queryStr = params.toString();
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    const currentQueryStr = searchParams.toString();
    const currentUrl = currentQueryStr ? `${pathname}?${currentQueryStr}` : pathname;
    if (targetUrl !== currentUrl) {
      router.replace(targetUrl, { scroll: false });
    }
  }, [currentPage, pageSize, debouncedSearch, roleFilter, statusFilter, pathname, router, searchParams]);
  // Sync state from URL searchParams (e.g. browser back/forward or pasting a bookmark URL)
  useEffect(() => {
    const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitFromUrl = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const searchFromUrl = searchParams.get('search') || '';
    const roleFromUrl = searchParams.get('role') || 'ALL';
    const statusFromUrl = searchParams.get('status') || 'ALL';
    setCurrentPage((prev) => (prev !== pageFromUrl ? pageFromUrl : prev));
    setPageSize((prev) => (prev !== limitFromUrl ? limitFromUrl : prev));
    setRoleFilter((prev) => (prev !== roleFromUrl ? roleFromUrl : prev));
    setStatusFilter((prev) => (prev !== statusFromUrl ? statusFromUrl : prev));
    if (searchFromUrl !== debouncedSearch) {
      setUserSearch(searchFromUrl);
      setDebouncedSearch(searchFromUrl);
    }
  }, [searchParams, debouncedSearch]);
  // Fetch Users from Database via Server-Side Query API
  const fetchUsers = useCallback(async () => {
    if (!can('user:read')) return;
    try {
      setLoadingUsers(true);
      const queryParams: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      }
      if (roleFilter !== 'ALL') {
        queryParams.role = roleFilter;
      }
      if (statusFilter !== 'ALL') {
        queryParams.status = statusFilter;
      }
      const res = await usersApi.getAll(queryParams);
      const userList = unwrapData<User>(res);
      setUsers(userList);
      const meta = unwrapMeta(res);
      if (meta) {
        setPaginationMeta(meta);
      } else {
        setPaginationMeta({
          page: currentPage,
          limit: pageSize,
          totalItems: userList.length,
          totalPages: Math.max(1, Math.ceil(userList.length / pageSize)),
          hasNextPage: false,
          hasPreviousPage: currentPage > 1,
        });
      }
      // Auto-populate globalCounts when on the default view or specific status views
      if (statusFilter === 'ALL' && roleFilter === 'ALL' && !debouncedSearch.trim()) {
        setGlobalCounts({
          total: meta?.totalItems ?? userList.length,
          active: userList.filter((u) => getUserEffectiveStatus(u) === 'ACTIVE').length,
          pending: userList.filter((u) => getUserEffectiveStatus(u) === 'PENDING_APPROVAL').length,
          inactive: userList.filter((u) => getUserEffectiveStatus(u) === 'INACTIVE').length,
        });
      } else if (statusFilter === 'ACTIVE' && !debouncedSearch.trim() && roleFilter === 'ALL') {
        const activeCount = meta?.totalItems ?? userList.length;
        setGlobalCounts((prev) => ({
          ...prev,
          active: prev.active || activeCount,
          total: prev.total || activeCount,
        }));
      }
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.error('Failed to fetch users', err);
        toast.error('Failed to load users list');
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [can, currentPage, pageSize, debouncedSearch, roleFilter, statusFilter, toast]);
  // Fetch Roles and Organizations from Database via Next.js BFF proxy
  const fetchRoles = useCallback(async () => {
    if (!can('role:read') && !can('user:read')) return;
    try {
      setLoadingRoles(true);
      const [rolesData, orgsRes] = await Promise.allSettled([
        rolesApi.getAll(),
        organizationsApi.getAll({ limit: 100 }),
      ]);
      if (rolesData.status === 'fulfilled') {
        setRoles(Array.isArray(rolesData.value) ? rolesData.value : []);
      }
      if (orgsRes.status === 'fulfilled') {
        setOrganizations(unwrapData<Organization>(orgsRes.value));
      }
    } catch (err: any) {
      if (err?.status !== 403 && err?.statusCode !== 403) {
        console.error('Failed to fetch roles or organizations', err);
      }
    } finally {
      setLoadingRoles(false);
    }
  }, [can]);
  useEffect(() => {
    if (hasUserRead) {
      fetchUsers();
    }
  }, [hasUserRead, fetchUsers]);
  useEffect(() => {
    if (hasUserRead) {
      fetchRoles();
      fetchGlobalCounts();
    }
  }, [hasUserRead, fetchRoles, fetchGlobalCounts]);
  // User Actions
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };
  const handleOpenEditUser = useCallback((user: User) => {
    router.push(`/users/${user.id}/edit`);
  }, [router]);
  const handleToggleUserStatus = useCallback(async (user: User) => {
    if (!canManageUsers) return;
    const effectiveStatus = getUserEffectiveStatus(user);
    const isCurrentlyActive = effectiveStatus === 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'Deactivate' : 'Activate';
    // Super Admin protection guard: Super Admin accounts cannot be deactivated
    const isTargetSuperAdmin =
      Boolean((user.roles && user.roles.some((r: any) => (typeof r === 'string' ? r : r?.name) === 'SUPER_ADMIN')) ||
      user.role?.name === 'SUPER_ADMIN');
    if (isTargetSuperAdmin && isCurrentlyActive) {
      toast.error('Protected Account Guard: Super Admin accounts cannot be set to inactive.');
      return;
    }
    // Prevent self-deactivation
    if (currentUser?.id === user.id) {
      toast.error('Self-deactivation guard: You cannot set your own account to inactive.');
      return;
    }
    const ok = await confirm({
      title: `${actionLabel} Account`,
      message: (
        <span>
          Are you sure you want to {actionLabel.toLowerCase()} user{' '}
          <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>?
          {isCurrentlyActive
            ? ' Inactive accounts cannot sign in or access developer credentials.'
            : ' Activated accounts will immediately regain system access.'}
        </span>
      ),
      confirmText: actionLabel,
      confirmVariant: isCurrentlyActive ? 'danger' : 'primary',
    });
    if (!ok) return;
    try {
      await usersApi.update(user.id, {
        isActive: !isCurrentlyActive,
      });
      toast.success(`User '${user.name}' ${isCurrentlyActive ? 'marked as inactive' : 'activated'} successfully.`);
      fetchUsers();
      fetchGlobalCounts();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${actionLabel.toLowerCase()} user.`);
    }
  }, [canManageUsers, currentUser?.id, confirm, toast, fetchUsers, fetchGlobalCounts]);
  const handleDeleteUser = useCallback(async (user: User) => {
    const isTargetSuperAdmin =
      Boolean((user.roles && user.roles.some((r: any) => (typeof r === 'string' ? r : r?.name) === 'SUPER_ADMIN')) ||
      user.role?.name === 'SUPER_ADMIN');
    if (isTargetSuperAdmin) {
      toast.error('Protected Account Guard: Super Admin accounts cannot be deleted by any operator.');
      return;
    }
    const ok = await confirm({
      title: 'Delete User Account?',
      message: (
        <span>
          Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>? This action is permanent and will revoke access immediately.
        </span>
      ),
      confirmText: 'Confirm Delete',
      confirmVariant: 'danger',
    });
    if (!ok) return;
    try {
      await usersApi.delete(user.id);
      toast.success(`User '${user.name}' deleted successfully.`);
      fetchUsers();
      fetchGlobalCounts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user.');
    }
  }, [confirm, toast, fetchUsers, fetchGlobalCounts]);
  // Derived filter options for Users tab
  const availableRolesForFilter = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    roles.forEach((r) => {
      if (r?.name) map.set(r.name, { id: r.id, name: r.name });
    });
    return Array.from(map.values());
  }, [roles]);
  const roleDropdownOptions: CleanDropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'All Roles' },
    ...availableRolesForFilter.map((r) => {
      const theme = getRoleTheme(r.name);
      return {
        value: r.name,
        label: theme.label || r.name,
        dotColor: theme.bar,
      };
    }),
  ], [availableRolesForFilter]);
  const statusDropdownOptions: CleanDropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active', dotColor: 'bg-emerald-500' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval', dotColor: 'bg-amber-500' },
    { value: 'INACTIVE', label: 'Inactive', dotColor: 'bg-slate-400' },
  ], []);
  // Filter change handlers that automatically reset pagination to page 1
  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val);
    setCurrentPage(1);
  };
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };
  const handleResetFilters = () => {
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setUserSearch('');
    setCurrentPage(1);
  };
  // User Table Columns for Generic DataTable
  const userColumns: DataTableColumn<User>[] = useMemo(() => [
    {
      key: 'profile',
      header: (
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>User Profile</span>
        </div>
      ),
      width: 'w-[28%]',
      sortable: true,
      defaultSort: true,
      sortValue: (user) => user.name || user.email || '',
      cell: (user) => {
        const initials = (user.name || 'U')
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold flex items-center justify-center text-sm">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                <Link
                  href={`/users/${user.id}`}
                  className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {user.name}
                </Link>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'roles',
      header: (
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Assigned Roles</span>
        </div>
      ),
      width: 'w-[22%]',
      sortable: true,
      sortValue: (user) => getUserRoles(user).map((r) => r.name).join(', '),
      cell: (user) => {
        const userRoles = getUserRoles(user);
        if (userRoles.length === 0) {
          return <span className="text-xs text-slate-400 italic">No roles assigned</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {userRoles.map((r) => {
              const theme = getRoleTheme(r.name);
              const isFilterSelected = roleFilter === r.name;
              return (
                <button
                  key={r.id || r.name}
                  type="button"
                  onClick={() => handleRoleFilterChange(isFilterSelected ? 'ALL' : r.name)}
                  title={`Filter by role ${theme.label}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer hover:opacity-85 ${theme.badge
                    } ${isFilterSelected ? 'ring-2 ring-brand-500 shadow-xs' : ''
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.bar}`} />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'organization',
      header: (
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Organization</span>
        </div>
      ),
      width: 'w-[18%]',
      sortable: true,
      sortValue: (user) => user.organization?.name || '',
      cell: (user) => {
        if (!user.organization && !user.organizationId) {
          return <span className="text-xs text-slate-400 italic">Independent</span>;
        }
        const orgName = user.organization?.name || 'Organization';
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 truncate">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {orgName}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'telegram',
      header: (
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Telegram</span>
        </div>
      ),
      width: 'w-[16%]',
      sortable: true,
      sortValue: (user) => user.telegramUsername || user.telegramChatId || '',
      cell: (user) => {
        if (!user.telegramUsername && !user.telegramChatId) {
          return <span className="text-xs text-slate-400 italic">Not Linked</span>;
        }
        return (
          <div className="text-xs">
            {user.telegramUsername ? (
              <a
                href={`https://t.me/${user.telegramUsername.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>@{user.telegramUsername.replace('@', '')}</span>
              </a>
            ) : (
              <span className="font-mono text-slate-500 dark:text-slate-400">
                ID: {user.telegramChatId}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: (
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Status</span>
        </div>
      ),
      width: 'w-[14%]',
      sortable: true,
      sortValue: (user) => getUserEffectiveStatus(user),
      cell: (user) => {
        const effectiveStatus = getUserEffectiveStatus(user);
        if (effectiveStatus === 'PENDING_APPROVAL') {
          return (
            <button
              type="button"
              onClick={() => handleStatusFilterChange(statusFilter === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL')}
              title="Click to filter by Pending Approval status"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 cursor-pointer hover:opacity-85 transition-all ${statusFilter === 'PENDING_APPROVAL' ? 'ring-2 ring-amber-500 shadow-xs' : ''
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending</span>
            </button>
          );
        }
        if (effectiveStatus === 'ACTIVE') {
          return (
            <button
              type="button"
              onClick={() => handleStatusFilterChange(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
              title="Click to filter by Active status"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 cursor-pointer hover:opacity-85 transition-all ${statusFilter === 'ACTIVE' ? 'ring-2 ring-emerald-500 shadow-xs' : ''
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={() => handleStatusFilterChange(statusFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')}
            title="Click to filter by Inactive status"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-85 transition-all ${statusFilter === 'INACTIVE' ? 'ring-2 ring-slate-500 shadow-xs' : ''
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Inactive</span>
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="block text-right">Actions</span>,
      width: 'w-[16%]',
      className: 'text-right',
      sortable: false,
      cell: (user) => {
        const effectiveStatus = getUserEffectiveStatus(user);
        const isPending = effectiveStatus === 'PENDING_APPROVAL';
        const isActive = effectiveStatus === 'ACTIVE';
        const isTargetSuperAdmin =
          Boolean((user.roles && user.roles.some((r: any) => (typeof r === 'string' ? r : r?.name) === 'SUPER_ADMIN')) ||
          user.role?.name === 'SUPER_ADMIN');
        const isSelf = Boolean(
          currentUser && (
            currentUser.id === user.id ||
            (currentUser.email && user.email && currentUser.email.toLowerCase() === user.email.toLowerCase())
          )
        );
        const canEditTarget = canManageUsers && (!isTargetSuperAdmin || isSelf);

        return (
          <ActionMenu
            ariaLabel={`Actions for ${user.name}`}
            items={[
              {
                label: 'View',
                href: `/users/${user.id}`,
                icon: <ArrowRightIcon className="w-4 h-4 text-slate-400" />,
              },
              {
                label: 'Approve',
                variant: 'primary',
                hidden: !isPending || !canManageUsers,
                icon: (
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ),
                onClick: async () => {
                  try {
                    await usersApi.approve(user.id, 'MA_DEVELOPER');
                    toast.success(`${user.name} approved as MiniApp Developer!`);
                    fetchUsers();
                    fetchGlobalCounts();
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to approve user');
                  }
                },
              },
              ...(canEditTarget
                ? [
                    {
                      label: 'Edit',
                      href: `/users/${user.id}/edit`,
                      icon: (
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      ),
                    },
                  ]
                : []),
              ...(!isTargetSuperAdmin && canManageUsers && !isPending
                ? [
                    {
                      label: isActive ? 'Deactivate' : 'Activate',
                      icon: isActive ? (
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      onClick: () => handleToggleUserStatus(user),
                    },
                  ]
                : []),
              ...(!isTargetSuperAdmin && canManageUsers
                ? [
                    {
                      label: 'Delete',
                      variant: 'danger' as const,
                      divider: true,
                      icon: (
                        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      ),
                      onClick: () => handleDeleteUser(user),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ], [roleFilter, statusFilter, canManageUsers, toast, fetchUsers, fetchGlobalCounts, handleOpenEditUser, handleToggleUserStatus, handleDeleteUser]);
  // Server-Driven Pagination Props for DataTable
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
    <ProtectedRoute requiredPermission="user:read">
      <div className="w-full min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl border border-brand-100 dark:border-brand-500/20 shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Users
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage operator accounts, status approvals, and platform user directory.
              </p>
            </div>
          </div>
          {/* Header Action Button */}
          {canManageUsers && (
            <Button
              type="button"
              onClick={handleOpenCreateUser}
              className="gap-2 shadow-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Create New User</span>
            </Button>
          )}
        </div>
        {/* KPI Quick Status Filters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => handleStatusFilterChange('ALL')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${statusFilter === 'ALL'
                ? 'bg-brand-50/50 dark:bg-brand-500/10 border-brand-300 dark:border-brand-500/30 ring-2 ring-brand-500/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
          >
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Accounts
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
              {globalCounts.total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleStatusFilterChange('ACTIVE')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${statusFilter === 'ACTIVE'
                ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
              {globalCounts.active}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleStatusFilterChange('PENDING_APPROVAL')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${statusFilter === 'PENDING_APPROVAL'
                ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending Review</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
              {globalCounts.pending}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleStatusFilterChange('INACTIVE')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${statusFilter === 'INACTIVE'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 ring-2 ring-slate-400/20 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Inactive</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
              {globalCounts.inactive}
            </span>
          </button>
        </div>
        {/* USERS DIRECTORY (POWERED BY SERVER-DRIVEN GENERIC DATATABLE) */}
        <DataTable<User>
          data={users}
          columns={userColumns}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => router.push(`/users/${u.id}`)}
          loading={loadingUsers}
          loadingMessage="Fetching accounts from database..."
          searchValue={userSearch}
          onSearchChange={setUserSearch}
          searchPlaceholder="Search by name, email, or @telegram..."
          filters={[
            {
              id: 'role',
              label: 'Role',
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              value: roleFilter,
              options: roleDropdownOptions,
              onChange: handleRoleFilterChange,
              dropdownWidth: 'w-64',
            },
            {
              id: 'status',
              label: 'Status',
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              value: statusFilter,
              options: statusDropdownOptions,
              onChange: handleStatusFilterChange,
              dropdownWidth: 'w-60',
            },
          ]}
          isFiltered={roleFilter !== 'ALL' || statusFilter !== 'ALL' || !!userSearch}
          onResetFilters={handleResetFilters}
          totalItemsCount={paginationMeta.totalItems}
          defaultSortKey="profile"
          defaultSortDirection="asc"
          paginationProps={paginationProps}
          emptyMessage="No users match your filter criteria"
          emptySubMessage="Try adjusting your search query, role, or status filter"
        />
        {/* User Create / Edit Modal */}
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          editingUser={editingUser}
          roles={roles}
          organizations={organizations}
          onSuccess={() => {
            fetchUsers();
            fetchGlobalCounts();
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Users Directory...</div>}>
      <UsersContent />
    </Suspense>
  );
}
