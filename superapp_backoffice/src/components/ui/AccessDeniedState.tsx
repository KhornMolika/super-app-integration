'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock, KeyRound } from 'lucide-react';

export interface AccessDeniedStateProps {
  requiredPermission?: string;
  requiredRole?: string | string[];
  userRole?: string;
  title?: string;
  message?: string;
  showDashboardButton?: boolean;
  showBackButton?: boolean;
}

export function AccessDeniedState({
  requiredPermission,
  requiredRole,
  userRole,
  title = 'Access Restricted',
  message,
  showDashboardButton = true,
  showBackButton = true,
}: AccessDeniedStateProps) {
  const router = useRouter();

  const formattedRequiredRole = Array.isArray(requiredRole)
    ? requiredRole.join(' or ')
    : requiredRole;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/80 dark:border-amber-500/30 shadow-xs">
            <Lock className="w-8 h-8 stroke-[1.75]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>HTTP 403 • FORBIDDEN</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight pt-1">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {message ||
              'You do not have the required role or security scope to view this section.'}
          </p>
        </div>

        {/* Permission details box */}
        {(requiredPermission || formattedRequiredRole) && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left space-y-1.5 text-xs">
            {formattedRequiredRole && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3 text-slate-400" />
                  <span>Required Role:</span>
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded text-xs">
                  {formattedRequiredRole}
                </span>
              </div>
            )}
            {requiredPermission && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Permission:</span>
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded text-xs">
                  {requiredPermission}
                </span>
              </div>
            )}
            {userRole && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400 font-medium">Your Current Role:</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
                  {userRole}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          {showBackButton && (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Go Back</span>
            </button>
          )}

          {showDashboardButton && (
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-xs transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
