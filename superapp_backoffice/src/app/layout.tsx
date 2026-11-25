import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/lib/auth';
import { ConfirmationProvider } from '@/components/ui/ConfirmationProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { NotificationProvider } from '@/context/NotificationContext';
import { AppShell } from '@/components/ui/AppShell';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className={`${plusJakarta.className} font-sans antialiased h-screen overflow-hidden selection:bg-brand-500/30 selection:text-brand-900 dark:selection:text-brand-100`}
      >
        <AuthProvider>
          <ConfirmationProvider>
            <ToastProvider>
              <NotificationProvider>
                <AppShell>{children}</AppShell>
              </NotificationProvider>
            </ToastProvider>
          </ConfirmationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
