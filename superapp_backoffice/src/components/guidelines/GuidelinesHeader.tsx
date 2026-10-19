"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function GuidelinesHeader() {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-6 lg:px-8 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md relative z-20">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white hover:opacity-90 transition">
          <Image
            src="/fsa-logo.png"
            alt="FSA Logo"
            width={28}
            height={28}
            className="w-7 h-7 object-cover rounded-full shadow-sm"
          />
          <span className="text-base tracking-tight font-extrabold text-slate-900 dark:text-white">
            SuperApp <span className="text-brand-600 dark:text-brand-400 font-medium">Docs</span>
          </span>
        </Link>
        <span className="text-sm px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium border border-slate-200 dark:border-slate-700">
          v1.0
        </span>
      </div>

      {/* Global Action Links */}
      <div className="flex items-center gap-4 text-sm font-medium">
        <Link
          href="/miniapps/register"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition shadow-sm text-sm"
        >
          Register MiniApp
        </Link>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
        <ThemeToggle />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition text-sm"
        >
          <span>Dashboard</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
