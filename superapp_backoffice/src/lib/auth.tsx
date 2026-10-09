"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '@/api/auth.api';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MINI_APP_DEVELOPER' | 'QA_TESTER';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend',
    'miniapp_permission:approve', 'issue:resolve',
    'permission_proposal:read', 'permission_proposal:review', 'permission_proposal:approve',
    'super_app:read', 'super_app:manage',
    'user:read', 'user:manage',
    'role:read', 'role:manage',
    'permission:read', 'permission:manage',
    'organization:read', 'organization:manage',
    'audit_log:read', 'settings:manage'
  ],
  ADMIN: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend',
    'miniapp_permission:approve', 'issue:resolve',
    'permission_proposal:read', 'permission_proposal:review', 'permission_proposal:approve',
    'super_app:read', 'super_app:manage',
    'user:read', 'user:manage',
    'role:read',
    'permission:read',
    'organization:read', 'organization:manage',
    'audit_log:read', 'settings:manage'
  ],
  MINI_APP_DEVELOPER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
    'permission_proposal:read',
    'permission:read',
    'super_app:read',
    'organization:read'
  ],
  QA_TESTER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
    'permission_proposal:read',
    'permission:read',
    'super_app:read',
    'organization:read'
  ]
};

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role: Role;
  permissions?: string[];
}

export const ROLE_USER_PROFILES: Record<Role, { name: string; email: string }> = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    email: 'superadmin@superapp.gov.kh',
  },
  ADMIN: {
    name: 'Admin User',
    email: 'admin@superapp.gov.kh',
  },
  MINI_APP_DEVELOPER: {
    name: 'MiniApp Developer',
    email: 'ma-developer@superapp.gov.kh',
  },
  QA_TESTER: {
    name: 'QA Test Engineer',
    email: 'qa@superapp.gov.kh',
  },
};

interface AuthContextType {
  role: Role;
  user: AuthUser;
  isAuthenticated: boolean;
  setRole: (role: Role) => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  can: (permission: string) => boolean;
  hasRole: (role: Role) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('SUPER_ADMIN');
  const [currentUser, setCurrentUser] = useState<AuthUser>({
    name: 'Super Admin',
    email: 'superadmin@superapp.gov.kh',
    role: 'SUPER_ADMIN',
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const performLogin = async (currentRole: Role) => {
    const profile = ROLE_USER_PROFILES[currentRole] || ROLE_USER_PROFILES.SUPER_ADMIN;
    try {
      const res = await authApi.login({ email: profile.email, role: currentRole });
      if (res?.user) {
        const userRole = (res.user.roles?.[0] as Role) || currentRole;
        setRoleState(userRole);
        setCurrentUser({
          id: res.user.id,
          name: res.user.name || profile.name,
          email: res.user.email || profile.email,
          role: userRole,
          permissions: res.user.permissions,
        });
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Session handshake:', e);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('superapp_active_role') as Role;
      if (saved && ROLE_PERMISSIONS[saved]) {
        setRoleState(saved);
        performLogin(saved);
      } else {
        performLogin('SUPER_ADMIN');
      }
    } catch (_) {
      performLogin('SUPER_ADMIN');
    }
  }, []);

  const setRole = async (newRole: Role) => {
    try {
      localStorage.setItem('superapp_active_role', newRole);
    } catch (_) {}
    await performLogin(newRole);
  };

  const loginWithEmail = async (email: string, password?: string) => {
    try {
      const res = await authApi.login({ email, password });
      if (res?.user) {
        const userRole = (res.user.roles?.[0] as Role) || 'MINI_APP_DEVELOPER';
        setRoleState(userRole);
        setCurrentUser({
          id: res.user.id,
          name: res.user.name || 'Authenticated User',
          email: res.user.email || email,
          role: userRole,
          permissions: res.user.permissions,
        });
        setIsAuthenticated(true);
        localStorage.setItem('superapp_active_role', userRole);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const can = (permission: string) => {
    if (role === 'SUPER_ADMIN') return true;
    const defaultPerms = ROLE_PERMISSIONS[role] || [];
    const userPerms = currentUser?.permissions || [];
    return defaultPerms.includes(permission) || userPerms.includes(permission);
  };

  const hasRole = (r: Role) => {
    return role === r;
  };

  return (
    <AuthContext.Provider value={{ role, user: currentUser, isAuthenticated, setRole, loginWithEmail, can, hasRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
