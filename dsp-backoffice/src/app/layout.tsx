import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DSP Back Office',
  description: 'Digital Service Provider Administration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.className} bg-[#F8FAFC] dark:bg-slate-900 flex h-screen overflow-hidden text-slate-800 dark:text-slate-200 transition-colors duration-300`}>
        {/* Sidebar */}
        <aside className="w-72 bg-slate-950 dark:bg-black/80 text-slate-300 flex flex-col border-r border-slate-800 dark:border-slate-800/50 shadow-2xl relative z-20">
          <div className="p-8 pb-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">DSP Admin</h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-11">Super App Gateway</p>
          </div>
          
          <nav className="flex-1 px-4 space-y-1.5 mt-8">
            <Link href="/" className="group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 dark:hover:bg-slate-800/30 hover:text-white transition-all duration-200">
              <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link href="/organizations" className="group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 dark:hover:bg-slate-800/30 hover:text-white transition-all duration-200">
              <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span className="font-medium">Organizations</span>
            </Link>
            <Link href="/users" className="group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 dark:hover:bg-slate-800/30 hover:text-white transition-all duration-200">
              <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span className="font-medium">Users</span>
            </Link>
            <Link href="/miniapps" className="group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 dark:hover:bg-slate-800/30 hover:text-white transition-all duration-200 bg-slate-800/30 dark:bg-slate-800/20 border border-slate-700/50 dark:border-slate-700/30 shadow-inner text-white">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
              <span className="font-medium">Mini Apps</span>
            </Link>
            <Link href="/approvals" className="group flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 dark:hover:bg-slate-800/30 hover:text-white transition-all duration-200">
              <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-medium">Approvals</span>
            </Link>
          </nav>
          
          <div className="p-4 mt-auto">
            <div className="bg-slate-900 dark:bg-black rounded-xl p-4 border border-slate-800 dark:border-slate-800/50 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 p-[2px]">
                <div className="w-full h-full bg-slate-900 dark:bg-black rounded-full border-2 border-slate-900 dark:border-black"></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">System Admin</p>
                <p className="text-xs text-slate-400">admin@fsa.gov</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
          <header className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 h-20 flex items-center px-10 shadow-sm transition-all">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Financial Services Authority</h2>
            <div className="ml-auto flex items-center space-x-6">
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
              </button>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex items-center space-x-3 cursor-pointer group">
                <span className="font-semibold text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Admin Profile</span>
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-900 shadow-sm">
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
