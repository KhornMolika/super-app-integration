import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-gray-50 flex h-screen overflow-hidden text-gray-900`}>
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold ">DSP Admin</h1>
            <p className="text-sm text-slate-400 mt-1">FSA Back Office</p>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <Link href="/" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors">
              Dashboard
            </Link>
            <Link href="/organizations" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors">
              Organizations
            </Link>
            <Link href="/users" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors">
              Users
            </Link>
            <Link href="/miniapps" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors">
              Mini Apps
            </Link>
            <Link href="/approvals" className="block px-4 py-2 rounded hover:bg-slate-800 transition-colors">
              Approvals
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto">
          <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 shadow-sm">
            <div className="ml-auto flex items-center space-x-4">
              <span className="font-semibold text-sm text-gray-600">FSA Admin</span>
              <div className="w-8 h-8 rounded-full bg-slate-600"></div>
            </div>
          </header>
          <div className="p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
