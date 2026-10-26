"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/ui/SidebarContext';

export function SidebarGuidelines() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const isActive = pathname === '/guidelines' || pathname.startsWith('/guidelines/');

  return (
    <div className={`${isCollapsed ? 'p-2' : 'p-3.5'} mt-auto transition-all duration-300 border-t border-brand-900/60 dark:border-slate-900`}>
      <Link
        href="/guidelines"
        title={isCollapsed ? 'Developer Guidelines & Standards' : undefined}
        className={`group flex items-center ${
          isCollapsed ? 'justify-center p-2.5' : 'p-3 gap-3'
        } rounded-xl border transition-all duration-200 cursor-pointer ${
          isActive
            ? 'bg-brand-500/20 border-brand-400 text-white shadow-sm'
            : 'bg-brand-900/40 dark:bg-slate-900/60 border-brand-800/60 dark:border-slate-800 text-slate-300 hover:text-white hover:bg-brand-900/80 dark:hover:bg-slate-850 hover:border-brand-700/80'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
            isActive
              ? 'bg-brand-500 text-white shadow-xs'
              : 'bg-brand-800/60 dark:bg-slate-800 text-brand-300 group-hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white tracking-wide truncate">
                Guidelines
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-brand-800/80 dark:bg-slate-800 text-brand-300 border border-brand-700/50">
                Docs
              </span>
            </div>
            <p className="text-xs text-brand-300 dark:text-slate-400 truncate mt-0.5">
              Standards &amp; Policies
            </p>
          </div>
        )}
      </Link>
    </div>
  );
}

export default SidebarGuidelines;
