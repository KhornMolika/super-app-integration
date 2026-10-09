import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AuthProvider } from '@/lib/auth';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

import { AppSidebar } from '@/components/ui/AppSidebar';
import { HeaderProfile } from '@/components/ui/HeaderProfile';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SidebarProvider } from '@/components/ui/SidebarContext';
import SandboxBuildStatusIndicator from '@/components/ui/SandboxBuildStatusIndicator';
import { SystemHealthIndicator } from '@/components/ui/SystemHealthIndicator';
import { DownloadApkButton } from '@/components/ui/DownloadApkButton';

export const metadata: Metadata = {
  title: 'SuperApp Back Office',
  description: 'SuperApp Administration & MiniApp Ecosystem Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.className} antialiased h-screen overflow-hidden selection:bg-brand-500/30 selection:text-brand-900 dark:selection:text-brand-100`}>
        <AuthProvider>
          <ConfirmationProvider>
            <ToastProvider>
              <SidebarProvider>
                <div className="flex h-screen overflow-hidden text-foreground transition-colors duration-300">
                  {/* Sidebar */}
                  <AppSidebar />

                  {/* Main Content */}
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
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/80 mx-1"></div>
                        <HeaderProfile />
                      </div>
                    </header>
                    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
                      {children}
                    </div>
                  </main>
                </div>
              </SidebarProvider>
            </ToastProvider>
          </ConfirmationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
