'use client';

import React from 'react';
import Link from 'next/link';

export default function TrustRegulatorTermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
              TR
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Trust Regulator Official Verification — Terms of Service
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Non-Bank Financial Services Authority (FSA) • Version 1.0.0
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
          <h2 className="text-lg sm:text-xl font-bold text-purple-400">
            1. Scope & Regulatory Authority
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Trust Regulator Mini App operates under the statutory oversight of the Non-Bank Financial Services Authority (FSA). It provides verified public and institutional users with official digital certification, trust registration auditing, and compliance verification.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-purple-400">
            2. Trust Certificate Authenticity & Legal Effect
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Digital trust verification certificates and cryptographic QR stamps generated within this application constitute official proof of registration in the FSA Trust Database. Tampering, counterfeiting, or misrepresenting certificate records constitutes a regulatory offense punishable under the Trust Law of the Kingdom of Cambodia.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-purple-400">
            3. Native Capabilities & Audit Trail
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            This Mini App utilizes native platform capabilities (Camera barcode scanner and secure biometric verification) to validate physical certificates and verify authorized administrative signatories.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-purple-400">
            4. Limitation of Liability
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Trust Regulator makes every effort to ensure accurate and real-time synchronization of the trust registry. Users must ensure that submitted documentation and entity declarations are accurate and up-to-date.
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
            href="/legal/trust-regulator/privacy"
            className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition underline"
          >
            View Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
