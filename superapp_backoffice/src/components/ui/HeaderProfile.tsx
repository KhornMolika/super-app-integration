"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, Role } from '@/lib/auth';
import { ShieldCheckIcon, CheckIcon } from '@/components/ui/Icons';

export function HeaderProfile() {
  const { user, role, setRole, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const roles: { id: Role; label: string; badgeColor: string; description: string }[] = [
    {
      id: 'SUPER_ADMIN',
      label: 'Super Admin',
      badgeColor: 'bg-accent-500/10 text-accent-700 dark:text-accent-300 border-accent-500/30',
      description: 'Full ecosystem governance & releases',
    },
    {
      id: 'ADMIN',
      label: 'Admin',
      badgeColor: 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/30',
      description: 'Mini app approval & pipeline review',
    },
    {
      id: 'MINI_APP_DEVELOPER',
      label: 'MiniApp Developer',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      description: 'Package creation, integration & submission',
    },
    {
      id: 'QA_TESTER',
      label: 'QA Tester',
      badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      description: 'E2E testing, registration & sandbox verification',
    },
  ];

  const currentRole = roles.find((r) => r.id === role) || roles[0];
  const userName = user?.name || 'Administrator';
  const userEmail = user?.email || (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || 'admin@superapp.local');
  const initials = userName
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80"
        title="Account & Role Switcher"
      >
        <div className="relative">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-600 to-accent-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
        </div>

        <div className="text-left hidden md:block">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
              {userName}
            </span>
            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold border ${currentRole.badgeColor}`}>
              {currentRole.label}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block leading-tight truncate max-w-[120px]">
            {userEmail}
          </span>
        </div>

        <svg
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Profile & Role Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2 space-y-2 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* User Identity Header */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60">
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>{userName}</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${currentRole.badgeColor}`}>
                {currentRole.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {userEmail}
            </div>
          </div>

          {/* Role Switcher Section */}
          <div className="space-y-1">
            <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Simulate Role</span>
              <ShieldCheckIcon className="w-3 h-3 text-slate-400" />
            </div>

            {roles.map((r) => {
              const isSelected = r.id === role;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left ${
                    isSelected
                      ? 'bg-brand-500/10 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold border border-brand-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">{r.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {r.description}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings & Governance</span>
            </Link>

            <Link
              href="/audit-logs"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Security Audit Logs</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-left"
            >
              <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderProfile;

