import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';
import { AuthProvider } from '@/lib/auth';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

import { SidebarNav } from '@/components/ui/SidebarNav';
import { SidebarProfile } from '@/components/ui/SidebarProfile';
import { HeaderProfile } from '@/components/ui/HeaderProfile';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';

export const metadata: Metadata = {
  title: 'DPS Back Office',
  description: 'Digital Service Provider Administration',
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
          <div className="flex h-screen overflow-hidden text-foreground transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-72 bg-brand-950 dark:bg-slate-950 text-slate-200 flex flex-col border-r border-brand-900 dark:border-slate-900 shadow-2xl relative z-20 transition-colors">
              <div className="p-8 pb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg shadow-accent-900/30 overflow-hidden">
                    <Image src="/fsa-logo.png" alt="FSA Logo" width={40} height={40} className="object-cover" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">DPS Admin</h1>
                </div>
                <p className="text-xs font-medium text-brand-200 uppercase tracking-wider ml-11">Super App Gateway</p>
              </div>
              
              <SidebarNav />
              
              <SidebarProfile />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-900">
              <header className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 h-20 flex items-center px-10 shadow-sm transition-all">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">FinTech Center General Secretariat of FSA</h2>
                <div className="ml-auto flex items-center space-x-4">
                  <NotificationBell />
                  <ThemeToggle />
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 ml-2"></div>
                  <RoleSwitcher />
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 ml-2"></div>
                  <HeaderProfile />
                </div>
              </header>
              <div className="p-10 max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        </ConfirmationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
