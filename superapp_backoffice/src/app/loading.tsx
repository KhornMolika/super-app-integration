import React from 'react';

export default function Loading() {
  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-300">
      {/* Top Header Loading Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 sm:w-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-4 w-72 sm:w-96 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* Center Branded Loader Card */}
      <div className="w-full py-16 sm:py-24 flex flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          {/* Subtle Outer Glow Rings */}
          <div className="absolute -inset-4 rounded-full bg-brand-500/10 dark:bg-brand-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center">
            {/* Spinning Brand Ring */}
            <div className="absolute inset-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 border-t-brand-600 dark:border-t-brand-500 animate-spin" />
            {/* Center Brand Monogram */}
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
              F
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Loading SuperApp Backoffice
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
            Synchronizing ecosystem telemetry, permissions, and service status...
          </p>
        </div>

        {/* Subtle Animated Progress Bar */}
        <div className="w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-6">
          <div className="w-full h-full bg-gradient-to-r from-brand-600 via-teal-400 to-brand-600 animate-[loading-bar_1.5s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Grid of Skeleton Cards imitating content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-12 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="h-4 w-28 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-750 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
