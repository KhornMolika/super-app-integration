import React from 'react';
import Image from 'next/image';

export interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  variant?: 'page' | 'inline' | 'overlay';
  className?: string;
}

export function LoadingScreen({
  title = 'Loading SuperApp...',
  subtitle = 'Please wait while workspace telemetry is being prepared',
  variant = 'page',
  className = '',
}: LoadingScreenProps) {
  const containerClass =
    variant === 'overlay'
      ? 'fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4'
      : variant === 'inline'
      ? `py-8 flex flex-col items-center justify-center text-center ${className}`
      : `min-h-[60vh] flex flex-col items-center justify-center text-center p-6 ${className}`;

  return (
    <div className={containerClass}>
      <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 flex flex-col items-center max-w-sm w-full mx-auto">
        {/* Subtle Top Gradient Line */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-brand-500/40 dark:via-brand-400/30 to-transparent" />

        {/* Ambient Glow */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-2 rounded-full bg-brand-500/15 dark:bg-brand-500/25 blur-lg animate-pulse" />

          {/* Smooth Circular SVG Spinner */}
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90 animate-spin" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="2.5"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="url(#screen-loader-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="175.9"
                strokeDashoffset="115"
              />
              <defs>
                <linearGradient id="screen-loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#58761B" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>

            {/* Centered Circular FSA Logo */}
            <div className="relative w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex items-center justify-center p-1.5 overflow-hidden">
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
        </div>

        {/* Content */}
        <div className="space-y-1.5 max-w-xs text-center">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Subtle Shimmer Bar */}
        <div className="w-44 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-5 relative shadow-inner">
          <div className="w-full h-full bg-gradient-to-r from-brand-600 via-emerald-400 to-teal-400 rounded-full animate-[loading-bar_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
        </div>
      </div>
    </div>
  );
}
