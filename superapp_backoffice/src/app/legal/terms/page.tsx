'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon } from '@/components/ui/Icons';

export default function PlatformTermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex items-start justify-between gap-4">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                FSA SuperApp Platform — Terms of Service & Developer Agreement
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Non-Bank Financial Services Authority (FSA) • Mini-App Developer & Governance Agreement
              </p>
            </div>
          </div>

          <Link
            href="/legal"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 shrink-0"
          >
            <span>Legal Hub</span>
          </Link>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-accent-400">
            1. Platform Authorization & Developer Obligations
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            By registering as a Mini-App Developer on the <strong>FSA SuperApp Platform</strong>, you agree to comply with all regulatory directives issued by the Non-Bank Financial Services Authority (FSA). All mini-app submissions undergo static code analysis, capability permission review, and Super Administrator verification before public distribution.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-accent-400">
            2. Capability Governance & Sandboxing
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Mini-apps are strictly prohibited from bypassing standard JavaScript bridge protocols (`FSASuperApp.postMessage`). Hardware capabilities (Camera, Location, Biometrics, Storage) must be formally declared in the Mini-App submission manifest and approved by the regulatory administration.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-accent-400">
            3. Mini-App End-User Privacy Responsibilities
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Each Mini-App publisher is solely responsible for maintaining clear consumer terms and a privacy policy for end-users within their mini-app. Mini-app developers must not collect citizen data outside approved regulatory sandboxing scopes.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-accent-400">
            4. Suspension & Regulatory Revocation
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The FSA Super Administrator reserves the statutory right to immediately suspend, reject, or revoke developer tokens or mini-app releases that violate zero-trust security policies, introduce unapproved external network dependencies, or compromise sovereign financial infrastructure.
          </p>
        </div>

        {/* Navigation to Privacy */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <Link
            href="/legal/privacy"
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1.5"
          >
            <span>Review Platform Privacy & Data Protection Policy</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Return to Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
