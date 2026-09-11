'use client';

import React from 'react';
import Link from 'next/link';

export default function TrustRegulatorPrivacyPage() {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
              🛡️
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Trust Regulator — Privacy & Data Protection Policy
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Non-Bank Financial Services Authority (FSA) • Statutory Privacy Policy
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
          <h2 className="text-lg sm:text-xl font-bold text-indigo-400">
            1. Regulatory Data Processing
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Trust Regulator processes entity registration identifiers, authorized representative credentials, and cryptographic certificate keys solely to maintain the national Trust Registry and verify compliance under the Trust Law of Cambodia.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-400">
            2. Confidentiality & Non-Disclosure
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All private trust records, beneficiary schedules, and asset declarations are classified as confidential regulatory records. Access is strictly restricted to authorized FSA inspection officers and authenticated trust administrators via Super App cryptographic RBAC policies.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-400">
            3. Cryptographic Proof & Ledger Integrity
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Verification events and audit logs are signed with SHA-256 cryptographic signatures. No biometric authentication templates or camera streams are permanently stored on remote servers.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-400">
            4. Statutory Data Retention
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            In compliance with statutory financial regulations, trust verification audit trails are retained in secure cold storage for a period of ten (10) years following trust liquidation or deregistration.
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
            href="/legal/trust-regulator/terms"
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition underline"
          >
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
