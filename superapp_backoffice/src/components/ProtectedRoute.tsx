"use client";

import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  permission?: string;
  requiredPermission?: string;
  children: ReactNode;
  fallback?: ReactNode;
  redirectOnForbidden?: boolean;
}

export function ProtectedRoute({
  permission,
  requiredPermission,
  children,
  fallback,
  redirectOnForbidden = true,
}: ProtectedRouteProps) {
  const { can, role } = useAuth();
  const router = useRouter();
  const perm = permission || requiredPermission;
  const isAllowed = !perm || can(perm);

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
