"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/ui/AppSidebar';
import { HeaderProfile } from '@/components/ui/HeaderProfile';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { SidebarProvider } from '@/components/ui/SidebarContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import SandboxBuildStatusIndicator from '@/components/ui/SandboxBuildStatusIndicator';
import { SystemHealthIndicator } from '@/components/ui/SystemHealthIndicator';
import { DownloadApkButton } from '@/components/ui/DownloadApkButton';

// Routes that must be displayed standalone outside the authenticated dashboard shell
const STANDALONE_ROUTES = ['/login', '/signup', '/verify-otp', '/forgot-password', '/legal'];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isStandalone = STANDALONE_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`) || pathname?.startsWith(`${route}?`)
  );

  // Unauthenticated / Auth / Standalone Pages (Login, Sign-Up, Guidelines, Legal)
  if (isStandalone) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-slate-950 text-foreground">
        {children}
      </div>
    );
  }

  // Authenticated Dashboard Layout with Sidebar and Navigation Header
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden text-foreground transition-colors duration-300">
        {/* Sidebar Navigation */}
        <AppSidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-900 transition-all duration-300 min-w-0">
          <header className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 h-16 flex items-center px-4 sm:px-6 lg:px-8 shadow-xs transition-all">
            <div className="flex items-center min-w-0 pr-4">
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap truncate">
                <span className="hidden xl:inline">FinTech Center General Secretariat of FSA</span>
                <span className="xl:hidden">FinTech Center FSA</span>
              </h2>
            </div>
            <div className="ml-auto flex items-center space-x-2 sm:space-x-3 shrink-0">
              <DownloadApkButton />
              <SystemHealthIndicator />
              <SandboxBuildStatusIndicator />
              <NotificationBell />
              <ThemeToggle />
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/80 mx-1" />
              <HeaderProfile />
            </div>
          </header>
          <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
