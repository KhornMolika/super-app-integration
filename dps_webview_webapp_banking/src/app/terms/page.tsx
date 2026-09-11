'use client';

import React from 'react';
import Link from 'next/link';

export default function BankingTermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
              BB
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Bakong Digital Banking — Terms of Service
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Effective Date: September 2026 • Version 1.0.0
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1 shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-sky-400">
            1. Acceptance of Terms & Digital Identity
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            By launching, accessing, or using the Bakong Digital Banking Mini App within the Super App platform, you agree to be bound by these Terms of Service, the National Bank of Cambodia (NBC) payment system guidelines, and applicable banking laws. Access is authenticated through Super App Single Sign-On (SSO).
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-sky-400">
            2. Electronic Funds Transfer & Bakong QR Payments
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All instant fund transfers, peer-to-peer payments, and KHQR merchant transactions executed via this Mini App are final once authorized by biometric verification (Face ID / Fingerprint) or Super App secure PIN. Users are responsible for verifying recipient account numbers and payment amounts prior to submission.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-sky-400">
            3. Device Access & Camera Authorization
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            This Mini App requests access to your device camera exclusively for scanning Bakong KHQR codes to process transactions. The camera stream is processed in real time and is never stored, recorded, or transmitted to third parties.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-sky-400">
            4. Security & User Obligations
          </h2>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 leading-relaxed">
            <li>Keep your Super App authentication credentials and device biometric passkeys confidential.</li>
            <li>Promptly notify customer support in case of unauthorized transactions or compromised device access.</li>
            <li>Do not use the banking Mini App on jailbroken, rooted, or tampered operating system environments.</li>
          </ul>
        </div>

        {/* Section 5 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-sky-400">
            5. Support & Inquiries
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            If you have questions regarding these terms, please reach out to our 24/7 Digital Banking Support Desk at <span className="text-sky-400 font-mono">support@banking.fsa.gov.kh</span>.
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
            href="/privacy"
            className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition underline"
          >
            View Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
