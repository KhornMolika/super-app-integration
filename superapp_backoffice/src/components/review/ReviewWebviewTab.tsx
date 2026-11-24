'use client';

import React from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Zap,
  ExternalLink,
  CheckCircle2,
  Lock,
  Radio,
  Server,
  Code2,
  Sliders,
  Shield,
  Layers,
  Check,
  X,
} from 'lucide-react';

export interface ReviewWebviewTabProps {
  productionUrlDiff?: { base: string; target: string; changed: boolean };
  stagingUrlDiff?: { base: string; target: string; changed: boolean };
  addedDomains: string[];
  removedDomains: string[];
  unchangedDomains: string[];
  domainVerified: boolean;
  miniApp?: any;
}

export function ReviewWebviewTab({
  productionUrlDiff,
  stagingUrlDiff,
  addedDomains,
  removedDomains,
  unchangedDomains,
  domainVerified,
  miniApp,
}: ReviewWebviewTabProps) {
  const prodUrl =
    productionUrlDiff?.target ||
    productionUrlDiff?.base ||
    miniApp?.integrationConfig?.productionUrl ||
    'https://miniapp.partner.gov';
  const stagingUrl =
    stagingUrlDiff?.target ||
    stagingUrlDiff?.base ||
    miniApp?.integrationConfig?.stagingUrl ||
    'https://staging-miniapp.partner.gov';

  const isHttps = (url: string) => url.startsWith('https://');

  return (
    <div className="space-y-6">
      {/* 1. SSRF & Network Boundary Banner */}
      <div className="p-5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sky-950 dark:text-sky-100 uppercase tracking-wider text-sm">
                WebView Sandbox &amp; SSRF Isolation
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200/80 text-sky-900 dark:bg-sky-900 dark:text-sky-200">
                L4/L7 Gate Active
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
              WebView MiniApps execute within an isolated browser process. Outbound network requests, iframes, and fetch calls are strictly limited to the explicit domain whitelist below. Internal subnets (RFC1918), localhost (127.0.0.1), and cloud metadata endpoints (169.254.169.254) are intercepted and dropped.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs ${
              domainVerified
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{domainVerified ? 'Domain Ownership Verified' : 'Domain Verification Pending'}</span>
          </span>
        </div>
      </div>

      {/* 2. Production & Staging Root URL Delta */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-600" />
            <span>WebView Root Target Endpoints</span>
          </h4>
          <span className="text-xs text-slate-500">
            {productionUrlDiff?.changed ? 'Endpoint modified in this version' : 'Endpoints match base release'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Production URL */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Production Entry URL</span>
              </span>
              {productionUrlDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  MODIFIED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  Current Live
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {productionUrlDiff?.changed && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Base Version URL</span>
                  <span className="font-mono text-slate-500 line-through break-all block">
                    {productionUrlDiff.base || '(none)'}
                  </span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-brand-600 font-bold uppercase block mb-0.5">Target Version URL</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 break-all block">
                  {prodUrl}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                    isHttps(prodUrl)
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isHttps(prodUrl) ? 'TLS 1.3 / HTTPS Valid' : 'Insecure HTTP Disallowed'}</span>
                </span>

                <a
                  href={prodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Staging URL */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-500" />
                <span>Staging / Sandbox URL</span>
              </span>
              {stagingUrlDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  MODIFIED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Active Staging
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {stagingUrlDiff?.changed && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Base Version URL</span>
                  <span className="font-mono text-slate-500 line-through break-all block">
                    {stagingUrlDiff.base || '(none)'}
                  </span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-sky-600 font-bold uppercase block mb-0.5">Target Version URL</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 break-all block">
                  {stagingUrl}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                    isHttps(stagingUrl)
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isHttps(stagingUrl) ? 'TLS 1.3 / HTTPS Valid' : 'Insecure HTTP Disallowed'}</span>
                </span>

                <a
                  href={stagingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Declared Outbound Domain Allowlist Delta */}
      <div className="space-y-3">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <span>Outbound Domain Whitelist Delta</span>
        </h4>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          {/* Added Domains */}
          {addedDomains.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                + Newly Declared Domains ({addedDomains.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {addedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{dom}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Removed Domains */}
          {removedDomains.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                - Removed Domains ({removedDomains.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {removedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700 line-through opacity-80 shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>{dom}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Retained / Unchanged Domains */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Retained Whitelisted Domains ({unchangedDomains.length})
            </span>
            {unchangedDomains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unchangedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dom}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No additional domains whitelisted.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. WebView Runtime Isolation Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-600" />
          <span>WebView Security Policies &amp; Bridge Isolation</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Cookie &amp; Storage Partitioning
            </span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              MiniApp cookies and IndexedDB storage are sandboxed per appId. Cross-app tracking and SuperApp core session leakage are strictly blocked.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              JS Bridge Capability Gate
            </span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              `window.SuperAppBridge` exposes only explicitly approved capabilities. Undeclared RPC methods return immediate rejection errors.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Content-Security-Policy (CSP)
            </span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Strict CSP headers injected at webview navigation boundary: `default-src 'self'` restricted to declared domain whitelist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
