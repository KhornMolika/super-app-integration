'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthCenteredLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
}

export function AuthCenteredLayout({
  children,
  title,
  subtitle,
  badge = 'FSA SuperApp',
  backHref = '/login',
  backLabel = 'Back to Login',
  onBack,
}: AuthCenteredLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-8 bg-slate-950 text-foreground relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#295133_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      {/* Top Header: Logo + Back button */}
      <div className="w-full max-w-[440px] flex items-center justify-between z-10 py-4">
        <Link href="/login" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 p-0.5 shadow-md shadow-brand-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center p-0.5 overflow-hidden">
              <Image
                src="/fsa-logo.png"
                alt="FSA Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight group-hover:text-brand-300 transition-colors">
              FSA SuperApp
            </div>
            <div className="text-[10px] text-slate-400">Non-Bank Financial Services Authority</div>
          </div>
        </Link>

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1 group cursor-pointer"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>{backLabel}</span>
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1 group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>{backLabel}</span>
          </Link>
        ) : null}
      </div>

      {/* Center Card */}
      <div className="w-full max-w-[440px] z-10 my-auto">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/60 relative">
          {/* Badge */}
          {badge && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-400 text-[10px] font-semibold uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              {badge}
            </div>
          )}

          <div className="space-y-1.5 mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full max-w-[440px] z-10 py-4 flex items-center justify-between text-[11px] text-slate-500">
        <span>© 2026 FSA Cambodia</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400/80 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          TLS 1.3 Protected
        </span>
      </div>
    </div>
  );
}
