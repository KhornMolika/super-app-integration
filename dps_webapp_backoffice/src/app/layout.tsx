import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';

import { ThemeToggle } from '@/components/ui/ThemeToggle';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

import { SidebarNav } from '@/components/ui/SidebarNav';
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
        <ConfirmationProvider>
          <div className="flex h-screen overflow-hidden text-foreground transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-72 bg-brand-900 dark:bg-brand-950 text-slate-200 flex flex-col border-r border-brand-800 dark:border-brand-900 shadow-2xl relative z-20 transition-colors">
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
              
              <div className="p-4 mt-auto">
                <div className="bg-brand-800 dark:bg-brand-900/50 rounded-xl p-4 border border-brand-700 dark:border-brand-800 flex items-center space-x-3 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-100/10 dark:bg-brand-900/40 flex items-center justify-center border-2 border-brand-700/50">
                    <span className="text-sm font-bold text-brand-200">SA</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">System Admin</p>
                    <p className="text-xs text-brand-200">admin@fsa.gov</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-900">
              <header className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 h-20 flex items-center px-10 shadow-sm transition-all">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">FinTech Center General Secretariat of FSA</h2>
                <div className="ml-auto flex items-center space-x-4">
                  <NotificationBell />
                  <ThemeToggle />
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 ml-2"></div>
                  <div className="flex items-center space-x-3 cursor-pointer group ml-2">
                    <span className="font-semibold text-sm text-slate-600 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">Admin Profile</span>
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold border-2 border-white dark:border-slate-900 shadow-sm">
                      SA
                    </div>
                  </div>
                </div>
              </header>
              <div className="p-10 max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        </ConfirmationProvider>
      </body>
    </html>
  );
}
