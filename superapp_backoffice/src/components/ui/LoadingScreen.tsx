import React from 'react';

export interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  variant?: 'page' | 'inline' | 'overlay';
  className?: string;
}

export function LoadingScreen({
  title = 'Loading...',
  subtitle = 'Please wait while data is being prepared',
  variant = 'page',
  className = '',
}: LoadingScreenProps) {
  const containerClass =
    variant === 'overlay'
      ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4'
      : variant === 'inline'
      ? `py-12 flex flex-col items-center justify-center text-center ${className}`
      : `min-h-[60vh] flex flex-col items-center justify-center text-center p-6 ${className}`;

  return (
    <div className={containerClass}>
      <div className="relative mb-5 flex items-center justify-center">
        {/* Subtle Ambient Glow */}
        <div className="absolute -inset-3 rounded-full bg-brand-500/15 dark:bg-brand-500/25 blur-lg animate-pulse" />

        {/* Card Box */}
        <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl flex items-center justify-center">
          {/* Circular Spinner Ring */}
          <div className="absolute inset-1 rounded-xl border-2 border-slate-200 dark:border-slate-800 border-t-brand-600 dark:border-t-brand-500 animate-spin" />
          {/* Centered Brand Token */}
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
            F
          </div>
        </div>
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
