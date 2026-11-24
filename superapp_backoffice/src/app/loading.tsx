import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="relative w-full min-w-0 min-h-[75vh] flex flex-col justify-center items-center py-12 px-4 select-none overflow-hidden animate-in fade-in duration-300">
      {/* Background Soft Ambient Light Mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Center Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md rounded-3xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-black/50 p-8 sm:p-10 flex flex-col items-center text-center transition-all">
        {/* Subtle Top Gradient Accent Line */}
        <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-brand-500/50 dark:via-brand-400/40 to-transparent" />

        {/* Center Brand Avatar with Circular Spinner */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Ambient Glow */}
          <div className="absolute -inset-3 rounded-full bg-brand-500/20 dark:bg-brand-500/30 blur-xl animate-pulse" />

          {/* Circular Spinner Track & Logo */}
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center">
            {/* Smooth Circular SVG Spinner */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 animate-spin" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/80"
                strokeWidth="3"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="url(#fsa-loader-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="219.9"
                strokeDashoffset="145"
              />
              <defs>
                <linearGradient id="fsa-loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#58761B" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>

            {/* Centered Circular FSA Logo Emblem */}
            <div className="relative w-14 h-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-md shadow-slate-200/50 dark:shadow-black/40 flex items-center justify-center p-2 overflow-hidden transition-transform">
              <Image
                src="/fsa-logo.png"
                alt="FSA SuperApp"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Micro-Telemetry Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 mb-3 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
            FSA SuperApp Platform
          </span>
        </div>

        {/* Typography */}
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Loading SuperApp Backoffice
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            Synchronizing ecosystem telemetry, permissions, and service status...
          </p>
        </div>

        {/* Modern Smooth Indeterminate Shimmer Progress Bar */}
        <div className="w-56 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-6 relative shadow-inner">
          <div className="w-full h-full bg-gradient-to-r from-brand-600 via-emerald-400 to-teal-400 rounded-full animate-[loading-bar_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
        </div>

        {/* Real-time Subsystem Status Pips */}
        <div className="flex items-center justify-center gap-4 sm:gap-5 mt-5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Gateways</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Auth Guard</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Telemetry</span>
          </span>
        </div>
      </div>
    </div>
  );
}
