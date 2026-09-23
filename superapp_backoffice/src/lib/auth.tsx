"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '@/api';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MINI_APP_MANAGER' | 'DEVELOPER';

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
    'permission_proposal:read', 'permission_proposal:review',
    'super_app:read',
    'user:read',
    'permission:read',
    'organization:read'
  ],
  MINI_APP_MANAGER: [
    'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
    'permission_proposal:read',
    'permission:read',
    'organization:read'
  ],
  DEVELOPER: [
    'miniapp:read',
    'permission:read',
    'super_app:read'
  ]
};

export interface AuthUser {
  name: string;
  email: string;
  role: Role;
}

export const ROLE_USER_PROFILES: Record<Role, { name: string; email: string }> = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    email: process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || 'superadmin@example.com',
  },
  ADMIN: {
    name: 'Admin User',
    email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com',
  },
  MINI_APP_MANAGER: {
    name: 'Mini App Manager',
    email: process.env.NEXT_PUBLIC_MANAGER_EMAIL || 'manager@example.com',
  },
  DEVELOPER: {
    name: 'Developer User',
    email: process.env.NEXT_PUBLIC_DEV_EMAIL || 'dev@example.com',
  },
};

interface AuthContextType {
  role: Role;
  user: AuthUser;
  setRole: (role: Role) => void;
  can: (permission: string) => boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('SUPER_ADMIN');

  const performLogin = async (currentRole: Role) => {
    const profile = ROLE_USER_PROFILES[currentRole] || ROLE_USER_PROFILES.SUPER_ADMIN;
    const email = profile.email;

    try {
      // Hit our Next.js BFF login route via authApi
      await authApi.login({ email, role: currentRole });
    } catch(e) {
      console.error('Login failed', e);
    }
  };

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('superapp_mock_role') || localStorage.getItem('dps_mock_role')) as Role;
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
      localStorage.setItem('superapp_mock_role', newRole);
    } catch (_) {}
    await performLogin(newRole);
    setRoleState(newRole);
  };

  const can = (permission: string) => {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? true;
  };

  const hasRole = (r: Role) => {
    return role === r;
  };

  const user: AuthUser = {
    ...(ROLE_USER_PROFILES[role] || {
      name: 'Super Admin',
      email: process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || 'superadmin@example.com',
    }),
    role,
  };

  return (
    <AuthContext.Provider value={{ role, user, setRole, can, hasRole }}>
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
