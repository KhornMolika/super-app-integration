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
} from 'lucide-react';

export interface ReviewNetworkTabProps {
  productionUrlDiff?: { base: string; target: string; changed: boolean };
  stagingUrlDiff?: { base: string; target: string; changed: boolean };
  urlSchemeDiff?: { base: string; target: string; changed: boolean };
  addedDomains: string[];
  removedDomains: string[];
  unchangedDomains: string[];
  domainVerified: boolean;
}

export function ReviewNetworkTab({
  productionUrlDiff,
  stagingUrlDiff,
  urlSchemeDiff,
  addedDomains,
  removedDomains,
  unchangedDomains,
  domainVerified,
}: ReviewNetworkTabProps) {
  const hasUrlChanges =
    Boolean(productionUrlDiff?.changed) ||
    Boolean(stagingUrlDiff?.changed) ||
    Boolean(urlSchemeDiff?.changed);

  return (
    <div className="space-y-6">
      {/* SSRF & Boundary Gateway Card */}
      <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/80 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider">
              Network Boundary &amp; SSRF Isolation
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              SuperApp webviews and HTTP bridges enforce strict network isolation. MiniApps are restricted to connecting exclusively to the explicit domain whitelist declared below. Private RFC1918 subnets, localhost, and internal cluster IPs are blocked.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
              domainVerified
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{domainVerified ? 'Domain Association Verified' : 'Domain Verification Pending'}</span>
          </span>
        </div>
      </div>

      {/* Production & Staging Endpoint Diffs */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-600" />
          <span>Application Endpoints &amp; Schemes</span>
        </h4>

        {hasUrlChanges ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productionUrlDiff?.changed && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Production URL Modified</span>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    CHANGED
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-bold uppercase block">Previous Live Base</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 line-through break-all">
                      {productionUrlDiff.base || '(none)'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700">
                    <span className="text-xs text-emerald-600 font-bold uppercase block">Proposed Target URL</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold break-all">
                      {productionUrlDiff.target}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {stagingUrlDiff?.changed && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Staging Sandbox URL Modified
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400 font-bold uppercase block">Old Staging URL</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 line-through break-all">
                      {stagingUrlDiff.base || '(none)'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700">
                    <span className="text-xs text-emerald-600 font-bold uppercase block">New Staging URL</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold break-all">
                      {stagingUrlDiff.target}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 border border-slate-200 dark:border-slate-800">
            No root endpoint URL changes between base and target version.
          </div>
        )}
      </div>

      {/* Allowed Domain Whitelist Delta */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <span>Outbound Domain Whitelist Delta</span>
        </h4>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
          {/* Added Domains */}
          {addedDomains.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                + Newly Declared Domains ({addedDomains.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {addedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
                  >
                    <span>+ {dom}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Removed Domains */}
          {removedDomains.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block uppercase tracking-wider">
                - Removed Domains ({removedDomains.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {removedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 line-through border border-rose-300 dark:border-rose-800 shadow-2xs"
                  >
                    <span>- {dom}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unchanged Domains */}
          {unchangedDomains.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                Unchanged Allowed Domains ({unchangedDomains.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {unchangedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{dom}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {addedDomains.length === 0 && removedDomains.length === 0 && unchangedDomains.length === 0 && (
            <div className="text-xs text-slate-400 text-center py-4">
              No outbound domain whitelist configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
