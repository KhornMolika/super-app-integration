'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/SidebarContext';
import { SidebarNav } from '@/components/ui/SidebarNav';
import { SidebarProfile } from '@/components/ui/SidebarProfile';

export function AppSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-brand-950 dark:bg-slate-950 text-slate-200 flex flex-col border-r border-brand-900 dark:border-slate-900 shadow-2xl relative z-20 transition-all duration-300 ease-in-out select-none shrink-0`}
    >
      {/* Sidebar Header / Brand */}
      <div className={`p-4 pb-2 ${isCollapsed ? 'px-3' : 'p-6 pb-4'} transition-all duration-300`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-2`}>
          <Link href="/" className="flex items-center space-x-3 overflow-hidden group">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg shadow-accent-900/30 overflow-hidden shrink-0 transition-transform group-hover:scale-105">
              <Image src="/fsa-logo.png" alt="FSA Logo" width={40} height={40} className="object-cover" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden transition-all duration-300">
                <h1 className="text-2xl font-extrabold text-white tracking-tight whitespace-nowrap">Super App</h1>
                <p className="text-[10px] font-semibold text-brand-300 uppercase tracking-widest whitespace-nowrap">
                  Super App Gateway
                </p>
              </div>
            )}
          </Link>

          {/* Toggle Button for Expanded State */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-brand-400 hover:text-white hover:bg-brand-800/60 dark:hover:bg-slate-800/80 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Toggle Button for Collapsed State */}
        {isCollapsed && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="p-2 rounded-xl text-brand-400 hover:text-white hover:bg-brand-800/60 dark:hover:bg-slate-800/80 transition-all hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <SidebarNav />

      {/* Profile */}
      <SidebarProfile />
    </aside>
  );
}
