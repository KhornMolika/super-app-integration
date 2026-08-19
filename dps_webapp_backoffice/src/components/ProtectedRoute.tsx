"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  permission: string;
  children: ReactNode;
}

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { can } = useAuth();

  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-10">
        <svg className="w-16 h-16 text-red-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">403 Forbidden</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-md text-center">
          You do not have the required permissions to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
