"use client";

import React from "react";
import { UserIcon, ShieldIcon, SettingsIcon } from "@/components/ui/Icons";

export function Section01Overview() {
  return (
    <div className="space-y-8 text-slate-600 dark:text-slate-300">
      {/* 3-Step Quickstart Timeline */}
      <div id="overview-quickstart" className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-brand-50/20 to-slate-50 dark:from-slate-900/60 dark:via-brand-950/20 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 scroll-mt-24">
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          MiniApp Integration in 3 Steps
        </h4>
        <p className="text-sm text-slate-500 mb-6">
          Whether you are building with Web (React/Vue), Flutter, or Native Mobile, integrating with FSA SuperApp takes 3 straightforward steps:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative">
            <div className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center mb-3">
              1
            </div>
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Install the SDK
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Import <code className="font-mono text-brand-600 dark:text-brand-400">@fsasuperapp/miniapp-web-sdk</code> or <code className="font-mono text-brand-600 dark:text-brand-400">fsa_superapp_miniapp_flutter_sdk</code> from our scoped registry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative">
            <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center mb-3">
              2
            </div>
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Connect Capabilities
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Use native SuperApp services: Staff Auth, QR &amp; Face Scanner, Secure Storage, and Biometrics via standardized async methods.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center mb-3">
              3
            </div>
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Register &amp; Automated Scan
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Register your MiniApp in this Backoffice portal. Our automated CI engine validates the contract, security gates, and issues a test build.
            </p>
          </div>
        </div>
      </div>

      {/* Mental Model Architecture Card */}
      <div id="overview-mental-model" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3 scroll-mt-24">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Runtime Mental Model
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your MiniApp runs inside a protected sandbox. The host SuperApp shell provides hardware access and platform identity through a bidirectional bridge.
        </p>
        <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
          <div>┌────────────────────────────────────────────────────────────────────────┐</div>
          <div>│                   FSA SuperApp Host Container                          │</div>
          <div>│  (Navigation Bar • Capsule Button [•••|⨀] • Staff Identity &amp; Auth Gateway)   │</div>
          <div>└───────────────────────────────┬────────────────────────────────────────┘</div>
          <div className="text-brand-400">                                   │ Bidirectional Bridge</div>
          <div className="text-brand-400">                                   │ (JS postMessage / Flutter MethodChannel)</div>
          <div>┌───────────────────────────────▼────────────────────────────────────────┐</div>
          <div>│                   Your MiniApp Viewport Sandbox                        │</div>
          <div>│  (Web React/Vue • Flutter Package • Native SDK • Deep Link Protocol)   │</div>
          <div>└────────────────────────────────────────────────────────────────────────┘</div>
        </div>
      </div>

      {/* Ecosystem Governance Roles */}
      <div id="overview-roles" className="scroll-mt-24">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Ecosystem Roles &amp; Responsibilities
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Role 1: MiniApp Developer */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserIcon />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">MiniApp Developer</h4>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              External / Partner Team
            </span>
            <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>• Implements business UI and flows</li>
              <li>• Integrates FSA SuperApp SDK</li>
              <li>• Follows UI/UX safe area rules</li>
              <li>• Verifies local behavior in Sandbox</li>
            </ul>
          </div>

          {/* Role 2: SuperApp Admin */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldIcon />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">SuperApp Admin</h4>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              SuperApp Platform Owner
            </span>
            <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>• Approves capability access scopes</li>
              <li>• Audits automated security scans</li>
              <li>• Authorizes CI integration builds</li>
              <li>• Manages final release promotion</li>
            </ul>
          </div>

          {/* Role 3: Automated CI/CD Engine */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <SettingsIcon />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Automated CI Engine</h4>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              Automated Pipeline
            </span>
            <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>• Validates SDK contracts &amp; domains</li>
              <li>• Scans for secrets, SAST, &amp; DAST</li>
              <li>• Generates sandbox verification APKs</li>
              <li>• Enforces zero-vulnerability gate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
