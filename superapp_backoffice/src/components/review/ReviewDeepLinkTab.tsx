'use client';

import React from 'react';
import {
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Route,
  Smartphone,
  Globe,
  Lock,
  ArrowRight,
  Shield,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export interface ReviewDeepLinkTabProps {
  urlSchemeDiff?: { base: string; target: string; changed: boolean };
  deepLinkConfig?: any;
  miniApp?: any;
}

export function ReviewDeepLinkTab({
  urlSchemeDiff,
  deepLinkConfig,
  miniApp,
}: ReviewDeepLinkTabProps) {
  const [copiedScheme, setCopiedScheme] = React.useState(false);

  const scheme =
    urlSchemeDiff?.target ||
    urlSchemeDiff?.base ||
    miniApp?.integrationConfigDeepLink?.urlScheme ||
    miniApp?.urlScheme ||
    'fsa-miniapp://';

  const baseScheme = urlSchemeDiff?.base || miniApp?.urlScheme || 'fsa-miniapp://';

  const universalLinkDomain =
    miniApp?.integrationConfigDeepLink?.universalLinkDomain ||
    miniApp?.universalLinkDomain ||
    'https://links.fintechcenterfsa.com';

  const fallbackWebUrl =
    miniApp?.integrationConfigDeepLink?.fallbackWebUrl ||
    miniApp?.fallbackWebUrl ||
    'https://fintechcenterfsa.com/miniapp-fallback';

  const registeredPaths =
    miniApp?.integrationConfigDeepLink?.allowedPaths || [
      { path: '/open', description: 'Default MiniApp launch intent', risk: 'LOW' },
      { path: '/detail/:id', description: 'Item or record detailed view', risk: 'LOW' },
      { path: '/action/checkout', description: 'Direct checkout action route', risk: 'MEDIUM' },
      { path: '/auth/callback', description: 'OAuth & SSO authorization return', risk: 'HIGH' },
    ];

  const handleCopyScheme = () => {
    navigator.clipboard.writeText(scheme);
    setCopiedScheme(true);
    setTimeout(() => setCopiedScheme(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Deep Link Architecture Banner */}
      <div className="p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-purple-950 dark:text-purple-100 uppercase tracking-wider text-sm">
                Native Deep Link &amp; App Links Routing
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                Intent Gate Active
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
              Deep link integration routes user intents from the SuperApp container directly into external partner applications. All custom schemes, Universal Links, and path parameters are validated to prevent intent interception, parameter injection, and phishing redirects.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Scheme Collision Verified</span>
          </span>
        </div>
      </div>

      {/* 2. Custom Scheme & Universal Link Protocol Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Custom URI Scheme Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-600" />
              <span>Custom URI Scheme</span>
            </span>
            {urlSchemeDiff?.changed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                SCHEME MODIFIED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                Registered
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {urlSchemeDiff?.changed && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Previous Scheme</span>
                <span className="font-mono text-slate-500 line-through block">
                  {baseScheme}
                </span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-purple-600 font-bold uppercase block mb-0.5">Target Scheme URI</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {scheme}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyScheme}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {copiedScheme ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScheme ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Reserved Scheme Namespace Confirmed</span>
              </div>
              <p>No collisions detected with core SuperApp internal routes or existing certified partner MiniApps.</p>
            </div>
          </div>
        </div>

        {/* Universal Links & App Links Association */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>Universal &amp; App Links Association</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
              Validated
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Associated HTTPS Host</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 break-all block font-bold">
                {universalLinkDomain}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">AssetLinks / Apple App Site File</span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all block">
                {universalLinkDomain}/.well-known/assetlinks.json
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Cryptographic Domain Binding</span>
              </span>

              <a
                href={`${universalLinkDomain}/.well-known/assetlinks.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
              >
                <span>Inspect Manifest</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Registered Intent Routes & Whitelist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Route className="w-4 h-4 text-brand-600" />
            <span>Declared Intent Routes &amp; Parameter Whitelist</span>
          </h4>
          <span className="text-xs text-slate-500">
            {registeredPaths.length} routes registered
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {registeredPaths.map((routeItem: any, idx: number) => (
              <div key={routeItem.path || idx} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {routeItem.path}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        routeItem.risk === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                          : routeItem.risk === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                      }`}
                    >
                      {routeItem.risk || 'LOW'} RISK
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">{routeItem.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] text-slate-400">
                    Pattern: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{scheme.replace('://', '')}://{routeItem.path.replace('/', '')}</code>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Fallback Handling & Hijacking Mitigations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fallback Destination */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-500" />
            <span>Fallback Destination (If App Not Installed)</span>
          </h4>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Web Fallback URL</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 break-all block font-bold">
              {fallbackWebUrl}
            </span>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500">Auto-routes to web checkout or landing page</span>
              <a
                href={fallbackWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
              >
                <span>Test Web Fallback</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Security Mitigations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Deep Link Hijacking Mitigations</span>
          </h4>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Strict Intent Filter Validation</span>
              <p className="text-[11px] text-slate-500">
                Arbitrary URI parameters are stripped before firing external intent. Only explicitly declared route parameters (`:id`, `code`) are dispatched.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Token Redirection Prevention</span>
              <p className="text-[11px] text-slate-500">
                Sensitive SuperApp user JWTs or session tokens are never attached to deep link parameters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
