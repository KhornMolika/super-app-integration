import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

import { ThemeToggle } from '@/components/ui/ThemeToggle';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

import { SidebarNav } from '@/components/ui/SidebarNav';

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
      <body className={`${plusJakarta.className} bg-background flex h-screen overflow-hidden text-foreground transition-colors duration-300`}>
        {/* Sidebar */}
        <aside className="w-72 bg-brand-900 text-slate-200 flex flex-col border-r border-brand-800 shadow-2xl relative z-20">
          <div className="p-8 pb-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-900/30">
                <svg className="w-5 h-5 text-brand-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">DPS Admin</h1>
            </div>
            <p className="text-xs font-medium text-brand-200 uppercase tracking-wider ml-11">Super App Gateway</p>
          </div>
          
          <SidebarNav />
          
          <div className="p-4 mt-auto">
            <div className="bg-brand-800 rounded-xl p-4 border border-brand-700 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-400 to-accent-600 p-[2px]">
                <div className="w-full h-full bg-brand-900 rounded-full border-2 border-brand-900"></div>
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
            <div className="ml-auto flex items-center space-x-6">
              <ThemeToggle />
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex items-center space-x-3 cursor-pointer group">
                <span className="font-semibold text-sm text-slate-600 dark:text-slate-300 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">Admin Profile</span>
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold border-2 border-white dark:border-slate-900 shadow-sm">
                  AD
                </div>
              </div>
            </div>
          </header>
          <div className="p-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
