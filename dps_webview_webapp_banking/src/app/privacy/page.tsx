'use client';

import React from 'react';
import Link from 'next/link';

export default function BankingPrivacyPage() {
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      try {
        window.parent.postMessage({ type: 'CLOSE_TERMS' }, '*');
      } catch (_) {}
      try {
        (window as any).DSPNativeBridge?.postMessage?.(JSON.stringify({ action: 'closeTerms' }));
      } catch (_) {}
      if (window.history.length > 1) {
        window.history.back();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
              🔒
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Bakong Digital Banking — Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Effective Date: September 2026 • Privacy & Data Protection Compliance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            1. Information We Collect
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            When you interact with the Bakong Digital Banking Mini App via the Super App container, we collect the following essential data:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li><strong>Super App SSO Profile:</strong> User Identifier, Account Name, and verified citizen identity token.</li>
            <li><strong>Transaction Records:</strong> Payment timestamps, Bakong reference numbers, amounts, and destination account details.</li>
            <li><strong>Hardware Capability Data:</strong> Device camera authorization status for QR barcode recognition.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            2. Purpose of Data Processing
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your personal and financial information is processed strictly for:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li>Executing real-time payments, transfers, and utility bill settlements.</li>
            <li>Anti-money laundering (AML) verification and fraud prevention as required by banking regulations.</li>
            <li>Securing user sessions via Super App mutual TLS and JWT token verification.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            3. Data Retention & Cryptographic Security
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All data in transit is encrypted using TLS 1.3 encryption. Transaction logs are retained in encrypted, immutable audit stores in compliance with the National Bank of Cambodia regulatory retention schedule (minimum 5 years).
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            4. Third-Party Sharing
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We do not sell, rent, or monetize your personal data. Data is shared exclusively with the National Bank of Cambodia (NBC) Bakong settlement network to complete fund routing.
          </p>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>← Back to Super App Consent</span>
          </button>
          <Link
            href="/terms"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition underline"
          >
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
