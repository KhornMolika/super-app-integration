'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  activeTab?: 'login' | 'signup';
}

export function AuthSplitLayout({
  children,
  title,
  subtitle,
  activeTab = 'login',
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-foreground overflow-x-hidden">
      {/* LEFT COLUMN: Form Container */}
      <div className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 relative bg-slate-950/80 backdrop-blur-md">
        {/* Top Header: FSA Emblem & Brand */}
        <div className="flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 p-0.5 shadow-lg shadow-brand-500/20 shrink-0 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1 overflow-hidden">
                <Image
                  src="/fsa-logo.png"
                  alt="FSA Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white group-hover:text-brand-300 transition-colors">
                  FSA SuperApp
                </h1>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Non-Bank Financial Services Authority
              </p>
            </div>
          </Link>

          {/* Quick Switch Link */}
          <div className="text-xs">
            {activeTab === 'login' ? (
              <span className="text-slate-400">
                New developer?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors underline-offset-4 hover:underline"
                >
                  Register
                </Link>
              </span>
            ) : (
              <span className="text-slate-400">
                Have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Center Content: Main Form Body */}
        <div className="my-auto py-8 sm:py-12 max-w-[440px] w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Bottom Footer: Sovereign Credentials & Security */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>© 2026 Non-Bank Financial Services Authority (FSA)</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              TLS 1.3 256-Bit Encrypted
            </span>
            <span className="text-slate-700">•</span>
            <Link href="/legal" className="hover:text-slate-400 transition-colors">
              Privacy & Terms
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sovereign Showcase (Desktop Only) */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-brand-950 via-slate-950 to-slate-900 p-12 xl:p-16 flex-col justify-between overflow-hidden border-l border-slate-900">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#295133_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

        {/* Top Sovereign Status Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-brand-500/30 backdrop-blur-md shadow-inner text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span>FSA SuperApp Platform</span>
            <span className="text-slate-600">|</span>
            <span className="text-brand-300 font-semibold">Live Sandbox</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
            Royal Government of Cambodia
          </div>
        </div>

        {/* Center Editorial Showcase */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1 rounded-lg bg-accent-500/10 border border-accent-500/25 text-accent-300 text-xs font-semibold tracking-wide">
              Sovereign Digital Infrastructure
            </div>
            <h3 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Governing Cambodia&apos;s Mini-App Ecosystem with Zero-Trust Security.
            </h3>
            <p className="text-sm text-slate-300/80 leading-relaxed">
              The official developer and administrative operating system for the Non-Bank Financial Services Authority (FSA). Secure runtime sandboxing, real-time capability controls, and unified compliance.
            </p>
          </div>

          {/* 3 High-Trust Feature Cards */}
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md hover:border-brand-500/40 transition-all duration-300 flex items-start gap-3.5 group">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cryptographic Sandboxing</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Every mini-app package is verified with RS256 signatures, permission scopes, and strict hardware capability isolation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md hover:border-brand-500/40 transition-all duration-300 flex items-start gap-3.5 group">
              <div className="w-9 h-9 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400 shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Multi-Department Governance</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Unified workflow integration across Financial Technology Center (FTC), GAD, PD, and TLAD regulatory bodies.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md hover:border-brand-500/40 transition-all duration-300 flex items-start gap-3.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sovereign Artifact Distribution</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Private Sonatype Nexus artifact registries and automated zero-dependency release assembly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Platform Stat Badges */}
        <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-slate-900">
          <div>
            <div className="text-xl font-extrabold text-white">99.98%</div>
            <div className="text-[11px] text-slate-400">Gateway Uptime</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-brand-400">RS256</div>
            <div className="text-[11px] text-slate-400">Token Standard</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-accent-400">4 Depts</div>
            <div className="text-[11px] text-slate-400">Regulated Scopes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
