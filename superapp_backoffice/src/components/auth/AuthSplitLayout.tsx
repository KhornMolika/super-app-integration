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
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#080c14] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Uniform, continuous background across the entire page */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-slate-900/40 rounded-full blur-[150px] pointer-events-none" />

      {/* Top spacing when header is removed */}
      <div className="w-full pt-6 sm:pt-10" />

      {/* 1. CENTER SECTION: BALANCED 2-COLUMN GRID ON SAME UNIFIED BACKGROUND */}
      <main className="w-full max-w-7xl mx-auto flex-1 flex items-center px-6 sm:px-10 lg:px-16 py-8 relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* LEFT COLUMN: Clean Modern Logo Showcase with Brand Text underneath */}
          <div className="hidden lg:flex flex-col items-center justify-center relative select-none">
            {/* Ambient Multi-Ring Orbital Stage */}
            <div className="relative flex items-center justify-center w-[360px] h-[360px] xl:w-[420px] xl:h-[420px]">
              {/* Outer Subtle Orbit */}
              <div className="absolute inset-0 rounded-full border border-slate-800/60" />

              {/* Slow Rotating Dashed Ring with subtle primary/secondary gradient */}
              <svg
                className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] animate-spin-slow pointer-events-none"
                viewBox="0 0 360 360"
                fill="none"
              >
                <defs>
                  <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6D8B2C" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#396344" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#E6A71C" stopOpacity="0.45" />
                  </linearGradient>
                </defs>
                <circle
                  cx="180"
                  cy="180"
                  r="174"
                  stroke="url(#orbitGrad1)"
                  strokeWidth="1.2"
                  strokeDasharray="4 8"
                />
                {/* Secondary Accent Gold Beacon */}
                <circle cx="180" cy="6" r="3.5" fill="#E6A71C" className="drop-shadow-[0_0_6px_#E6A71C]" />
                {/* Primary Brand Emerald Beacon */}
                <circle cx="180" cy="354" r="3" fill="#6D8B2C" className="drop-shadow-[0_0_6px_#6D8B2C]" />
              </svg>

              {/* Counter-Rotating Inner Ring */}
              <svg
                className="absolute inset-12 w-[calc(100%-96px)] h-[calc(100%-96px)] animate-spin-reverse-slow pointer-events-none"
                viewBox="0 0 280 280"
                fill="none"
              >
                <circle
                  cx="140"
                  cy="140"
                  r="134"
                  stroke="rgba(109, 139, 44, 0.22)"
                  strokeWidth="1"
                  strokeDasharray="2 6"
                />
                <circle cx="274" cy="140" r="2.5" fill="#84A141" className="drop-shadow-[0_0_5px_#84A141]" />
              </svg>

              {/* Floating Centerpiece Logo */}
              <div className="relative z-10 animate-float-gentle flex items-center justify-center">
                <div className="w-48 h-48 xl:w-56 xl:h-56 rounded-full p-2.5 bg-gradient-to-b from-brand-500/25 via-white/5 to-accent-500/20 backdrop-blur-xl border border-brand-500/35 shadow-[0_0_60px_rgba(41,81,51,0.3),0_0_30px_rgba(230,167,28,0.15)] flex items-center justify-center group transition-transform duration-500 hover:scale-105">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-4 shadow-inner overflow-hidden relative">
                    <Image
                      src="/fsa-logo.png"
                      alt="Non-Bank Financial Services Authority Logo"
                      width={200}
                      height={200}
                      className="w-full h-full object-contain filter drop-shadow-sm"
                      priority
                    />
                    {/* Subtle Sheen Highlight */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Text Placed Cleanly Under Big Logo */}
            <div className="mt-7 text-center space-y-1.5">
              <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white">
                FSA SuperApp
              </h1>
              <p className="text-xs xl:text-sm text-slate-400 font-medium">
                Non-Bank Financial Services Authority
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Seamless Form Container on Same Background */}
          <div className="w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] p-2 sm:p-0">
              {/* Mobile-only brand header */}
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/80 via-brand-600/70 to-accent-500/80 p-0.5 shadow-sm shadow-brand-500/20 shrink-0">
                  <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center p-1 overflow-hidden">
                    <Image
                      src="/fsa-logo.png"
                      alt="FSA Logo"
                      width={36}
                      height={36}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight text-white">
                    FSA SuperApp
                  </h1>
                  <p className="text-[11px] font-medium text-slate-400">
                    Non-Bank Financial Services Authority
                  </p>
                </div>
              </div>

              <div className="mb-7">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {children}
            </div>
          </div>

        </div>
      </main>

      {/* 2. BOTTOM FOOTER: Seamless Footer on Same Background */}
      <footer className="w-full relative z-20 px-6 sm:px-10 lg:px-16 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
        <span>© 2026 Non-Bank Financial Services Authority (FSA)</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            TLS 1.3 256-Bit Encrypted
          </span>
          <span className="text-slate-700">•</span>
          <Link href="/legal" className="hover:text-slate-400 transition-colors">
            Privacy & Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
