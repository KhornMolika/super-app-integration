import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/lib/auth';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/ui/AppShell';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

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
      <body
        suppressHydrationWarning
        className={`${plusJakarta.className} antialiased h-screen overflow-hidden selection:bg-brand-500/30 selection:text-brand-900 dark:selection:text-brand-100`}
      >
        <AuthProvider>
          <ConfirmationProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </ConfirmationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
