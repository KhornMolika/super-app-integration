'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldIcon, ArrowRightIcon } from '@/components/ui/Icons';

export default function LegalHubPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 p-0.5 shadow-lg shadow-brand-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1 overflow-hidden">
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
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                FSA Legal & Regulatory Compliance Hub
              </h1>
              <p className="text-xs text-slate-400">
                Non-Bank Financial Services Authority (FSA) • Sovereign Compliance
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
          >
            <span>Login</span>
            <span>→</span>
          </Link>
        </div>

        {/* Intro */}
        <p className="text-sm text-slate-300 leading-relaxed">
          The Non-Bank Financial Services Authority (FSA) is committed to protecting developer data, institutional integrity, and regulatory governance across Cambodia&apos;s digital financial infrastructure.
        </p>

        {/* Legal Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Privacy Policy */}
          <Link
            href="/legal/privacy"
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-500/50 transition-all duration-200 group flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-brand-500/5"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <ShieldIcon className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                Platform Privacy & Data Policy
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Developer and administrator credentials, cryptographic data protection, and sovereign audit logging rules.
              </p>
            </div>

            <div className="text-xs font-semibold text-brand-400 flex items-center gap-1.5 pt-2">
              <span>Read Platform Privacy Policy</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Terms of Service */}
          <Link
            href="/legal/terms"
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-accent-500/50 transition-all duration-200 group flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-accent-500/5"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-white group-hover:text-accent-300 transition-colors">
                Terms of Service & Developer Agreement
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rules governing mini-app sandbox integration, capability usage, API limits, and developer compliance.
              </p>
            </div>

            <div className="text-xs font-semibold text-accent-400 flex items-center gap-1.5 pt-2">
              <span>Read Terms of Service</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 Non-Bank Financial Services Authority (FSA)</span>
          <span className="text-emerald-400">TLS 1.3 Certified</span>
        </div>
      </div>
    </div>
  );
}
