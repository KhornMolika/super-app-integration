'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, ExternalLink, X } from 'lucide-react';

export default function InsurancePrivacyPage() {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Nova Digital Insurance — Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Effective Date: September 2026 • Policyholder Data Protection Standard
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
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            1. Information We Collect
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            When you use the Nova Insurance Mini App via the Super App container, we collect:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed pl-1">
            <li><strong>Super App SSO Data:</strong> Verified Citizen ID, full name, and authenticated contact details.</li>
            <li><strong>Policy &amp; Quote Information:</strong> Coverage type, insured asset details (device model, rental address, transit vehicle ID).</li>
            <li><strong>Claim Evidence:</strong> Photos of damaged goods, timestamps, and GPS incident coordinates captured via Super App Native Bridge.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            2. How We Use Your Information
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We use your data solely for underwriting micro-insurance plans, executing automated smart claims payouts, preventing fraudulent submissions, and fulfilling statutory regulatory solvency reporting.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            3. Hardware Permission Safeguards
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Camera and Location access is requested on-demand only when you submit an active claim or request roadside dispatch. We never run background location tracking or unprompted camera captures.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            4. Data Retention &amp; Encryption
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            All communications are encrypted using 256-bit TLS encryption in transit and AES-256 at rest. Active policy records are maintained throughout the policy lifespan and archived securely in compliance with insurance statutory guidelines.
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
            href="/terms"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 underline"
          >
            <span>View Terms of Service</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
