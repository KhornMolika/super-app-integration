'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  Package,
  Layers,
  Search,
  BookOpen,
} from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[78vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-xl w-full text-center space-y-6">
        {/* Animated Badge & Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-brand-500/10 dark:bg-brand-500/20 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100/60 dark:from-slate-800 dark:to-slate-800/80 border border-brand-200/80 dark:border-brand-500/30 flex items-center justify-center shadow-xl shadow-brand-500/10">
            <Compass className="w-12 h-12 text-brand-600 dark:text-brand-400 stroke-[1.75]" />
          </div>
        </div>

        {/* 404 Number & Pill */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>HTTP 404 • ROUTE_NOT_FOUND</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The page or resource you are looking for doesn&apos;t exist, has been retired, or the URL was entered incorrectly.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Go Back</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-brand-500/25"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/miniapps"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Package className="w-4 h-4 text-slate-400" />
            <span>MiniApps</span>
          </Link>
        </div>

        {/* Helpful Shortcuts Card */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Popular Destinations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto text-left">
            <Link
              href="/miniapps"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors group"
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                <Package className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                <span>MiniApp Directory</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Packages & sandbox
              </p>
            </Link>

            <Link
              href="/banners"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors group"
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                <span>Banners</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Promotional heroes
              </p>
            </Link>

            <Link
              href="/guidelines"
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors group col-span-2 sm:col-span-1"
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                <span>Guidelines</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Regulatory standards
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
