'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldIcon, ArrowRightIcon } from '@/components/ui/Icons';

export default function PlatformPrivacyPage() {
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
                FSA SuperApp Platform — Privacy & Data Protection Policy
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Non-Bank Financial Services Authority (FSA) • Platform Developer & Administrator Privacy Policy
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
          <h2 className="text-lg sm:text-xl font-bold text-brand-400">
            1. Scope of This Policy
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            This Privacy & Data Protection Policy applies strictly to the <strong>FSA SuperApp Platform Backoffice</strong>, governing account holders, authorized regulators, Super Administrators, and registered Mini-App Developers. Individual Mini-Apps hosted on the SuperApp maintain their own end-user consumer privacy notices within the mobile client.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-brand-400">
            2. Platform Data Collected
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To maintain security, access governance, and statutory auditing under Cambodian financial regulation, the platform collects:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1.5 pl-2">
            <li><strong>Developer Identity:</strong> Name, verified email address, institutional affiliation (e.g. FTC, GAD, PD, TLAD, or licensed fintech entity).</li>
            <li><strong>Security Credentials:</strong> Scrypt-hashed passwords, RS256 token rotation records, session cookies, and developer personal access tokens (PAT).</li>
            <li><strong>Audit Logs:</strong> Immutable timestamps, IP addresses, capability requests, build triggers, and release deployment signatures.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-brand-400">
            3. Cryptographic Security & Zero-Trust Architecture
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All authentication tokens are digitally signed using RSA-256 keys issued by the FSA sovereign authority. Credentials and sensitive tokens are encrypted using AES-256-GCM. Session identifiers are restricted to secure, HttpOnly, SameSite cookies.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-brand-400">
            4. Sovereign Data Residency
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All database registries, Sonatype Nexus build artifacts, and mini-app packages reside strictly within authorized sovereign cloud infrastructure compliant with Royal Government of Cambodia data protection guidelines.
          </p>
        </div>

        {/* Navigation to Terms */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <Link
            href="/legal/terms"
            className="text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1.5"
          >
            <span>Review Terms of Service & Developer Agreement</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Return to Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
