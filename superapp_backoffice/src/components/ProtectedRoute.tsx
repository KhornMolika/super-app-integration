"use client";

import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  permission?: string;
  requiredPermission?: string;
  requiredRole?: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  redirectOnForbidden?: boolean;
}

export function ProtectedRoute({
  permission,
  requiredPermission,
  requiredRole,
  children,
  fallback,
  redirectOnForbidden = true,
}: ProtectedRouteProps) {
  const { can, role } = useAuth();
  const router = useRouter();
  const perm = permission || requiredPermission;
  const hasPerm = !perm || can(perm);
  const hasRole =
    !requiredRole ||
    (Array.isArray(requiredRole)
      ? requiredRole.includes(role || '')
      : role === requiredRole);
  const isAllowed = hasPerm && hasRole;

  useEffect(() => {
    if (!isAllowed && redirectOnForbidden) {
      router.replace('/');
    }
  }, [isAllowed, redirectOnForbidden, router]);

  if (!isAllowed) {
    if (fallback) return <>{fallback}</>;
    // Omit the UI completely (render nothing) while routing away to Dashboard
    return null;
  }

  return <>{children}</>;
}
