'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, ExternalLink, X } from 'lucide-react';

export default function InsuranceTermsPage() {
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
      <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Nova Digital Insurance — Terms of Service
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Effective Date: September 2026 • Version 1.0.0
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-violet-400">
            1. Policy Issuance & Digital Enrollment
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Nova Insurance is a verified Mini App operating inside the Super App container. By purchasing or managing insurance policies (Tech, Renters, Transit, Travel) through this app, you agree that digital policy certificates and electronic signatures carry full legal validity under applicable insurance regulations.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-violet-400">
            2. Instant Claims & Native Hardware Verification
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To provide zero-paperwork, instant claims assessments, this Mini App utilizes the Super App Native Bridge:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li><strong>Camera:</strong> Capturing live damage photos and receipt proofs during claim filing.</li>
            <li><strong>Location / GPS:</strong> Verifying incident locations for roadside transit and travel assistance.</li>
            <li><strong>Biometrics:</strong> Secure authorization of payout transfers and policy modifications.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-violet-400">
            3. Premium Payments & Automatic Renewal
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Premiums are debited via your linked Super App Digital Wallet or Bakong payment rails upon your explicit confirmation. You can pause, adjust, or cancel active monthly coverage anytime directly from the Mini App dashboard with no hidden penalties.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-violet-400">
            4. Fraud Prevention & Claims Audit
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Submitting fraudulent incident photos, falsified invoices, or manipulated timestamps constitutes a breach of policy and will result in immediate claim denial and notification to statutory regulatory authorities.
          </p>
        </div>

        {/* Section 5 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-violet-400">
            5. Contact & Claims Support
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            For claims assistance or coverage inquiries, contact our Concierge Desk at <span className="text-violet-400 font-mono">support@nova-insurance.com</span>.
          </p>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Super App Consent</span>
          </button>
          <Link
            href="/privacy"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition flex items-center gap-1 underline"
          >
            <span>View Privacy Policy</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
