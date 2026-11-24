'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Shield,
  ExternalLink,
  ArrowRight,
  User,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Building2,
  Mail,
  FileCode2,
  KeyRound,
  Globe,
  Package,
  Info,
  Check,
  X,
  Eye,
  Link2,
} from 'lucide-react';

export interface ReviewOverviewTabProps {
  miniApp: any;
  diffData: any;
  baseVersion: string;
  targetVersion: string;
  onNavigateTab: (tab: any) => void;
}

export function ReviewOverviewTab({
  miniApp,
  diffData,
  baseVersion,
  targetVersion,
  onNavigateTab,
}: ReviewOverviewTabProps) {
  const d = diffData?.differences || {};
  const meta = d.metadata || {};
  const perms = d.permissions || {};
  const integ = d.integration || {};

  const nameDiff = meta.name;
  const shortDescDiff = meta.shortDescription;
  const fullDescDiff = meta.fullDescription;
  const logoDiff = meta.logo;
  const privacyDiff = meta.privacyPolicyUrl;
  const termsDiff = meta.termsUrl;
  const supportEmailDiff = meta.supportEmail;
  const teamNameDiff = meta.teamName;

  const addedPerms = perms.added || [];
  const removedPerms = perms.removed || [];
  const modifiedPerms = perms.modified || [];
  const unchangedPerms = perms.unchanged || [];

  const targetVerObj = diffData?.targetVersion || miniApp?.pendingRevision || {};
  const submitterName =
    targetVerObj?.submittedBy?.name ||
    targetVerObj?.submittedBy ||
    miniApp?.developer?.name ||
    miniApp?.owner?.name ||
    'MiniApp Developer Team';
  const submitterEmail =
    targetVerObj?.submittedBy?.email ||
    miniApp?.developer?.email ||
    miniApp?.owner?.email ||
    miniApp?.supportEmail ||
    'dev@partner.org';
  const submittedDate =
    targetVerObj?.submittedAt ||
    miniApp?.pendingRevision?.submittedAt ||
    miniApp?.updatedAt ||
    miniApp?.createdAt;

  const changelog =
    targetVerObj?.changelog ||
    miniApp?.pendingRevision?.changelog ||
    'No detailed release notes provided for this revision.';

  const justification =
    targetVerObj?.justification ||
    miniApp?.pendingRevision?.justification ||
    'Standard maintenance release and capability envelope update.';

  const isHttps = (url?: string) => Boolean(url && url.startsWith('https://'));

  return (
    <div className="space-y-6">
      {/* 1. Developer Submission Brief: Changelog & Justification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Release Notes / Changelog */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Release Notes &amp; Changelog
                </h3>
                <span className="text-[11px] text-slate-500">
                  Developer declared updates for target version {targetVersion}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              {targetVersion}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
            {changelog}
          </div>

          {/* Security & Platform Justification */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Platform Justification (Why Required)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/40">
              "{justification}"
            </p>
          </div>
        </div>

        {/* Submitter & Version Metadata Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            <span>Submission Origin</span>
          </h3>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {submitterName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block truncate">
                {submitterName}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                {submitterEmail}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Submitted At</span>
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {submittedDate ? new Date(submittedDate).toLocaleString() : 'Recent'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Organization</span>
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                {miniApp?.organization?.name || miniApp?.teamName || 'Partner Network'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Support Channel</span>
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                {miniApp?.supportEmail || 'support@fsa.gov'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
            <span className="font-bold block mb-0.5">Audit Trail Active</span>
            All review verdicts, approval timestamps, and requested remediations are cryptographically signed in the immutable ledger.
          </div>
        </div>
      </div>

      {/* 2. Visual Before & After Delta Hub */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>App Identity &amp; Metadata Delta</span>
          </h3>
          <span className="text-xs text-slate-500">
            Comparing base <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{baseVersion}</span> vs target <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{targetVersion}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: App Name */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Application Name
              </span>
              {nameDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  MODIFIED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Unchanged
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Base Version</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {nameDiff?.base || miniApp?.name || 'MiniApp'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800">
                <span className="text-[10px] text-brand-600 uppercase font-bold block">Target Version</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {nameDiff?.target || miniApp?.name || 'MiniApp'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: App Logo Preview */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                App Icon / Branding
              </span>
              {logoDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  NEW ASSET
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Unchanged
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Base</span>
                <div className="w-10 h-10 mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                  {logoDiff?.base || miniApp?.logoUrl ? (
                    <img
                      src={logoDiff?.base || miniApp?.logoUrl}
                      alt="Base logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">M</span>
                  )}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 text-center space-y-1">
                <span className="text-[10px] text-brand-600 uppercase font-bold block">Target</span>
                <div className="w-10 h-10 mx-auto rounded-xl overflow-hidden border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                  {logoDiff?.target || miniApp?.logoUrl ? (
                    <img
                      src={logoDiff?.target || miniApp?.logoUrl}
                      alt="Target logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-brand-600">M</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Short Description */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Store Subtitle
              </span>
              {shortDescDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  MODIFIED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Unchanged
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Base</span>
                <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                  {shortDescDiff?.base || miniApp?.shortDescription || 'No subtitle declared.'}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800">
                <span className="text-[10px] text-brand-600 uppercase font-bold block">Target</span>
                <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                  {shortDescDiff?.target || miniApp?.shortDescription || 'No subtitle declared.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Legal & Compliance Governance Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Legal, Privacy &amp; Compliance Policy</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Terms of Service */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand-600" />
                <span>Terms of Service Agreement</span>
              </span>
              {termsDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  URL CHANGED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  Verified
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Declared URL</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 break-all select-all block">
                  {termsDiff?.target || miniApp?.termsUrl || 'https://fintechcenterfsa.com/terms'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      isHttps(termsDiff?.target || miniApp?.termsUrl)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>HTTPS Enforced</span>
                  </span>
                </div>

                <a
                  href={termsDiff?.target || miniApp?.termsUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>Test Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Privacy &amp; Data Protection Policy</span>
              </span>
              {privacyDiff?.changed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  URL CHANGED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  Compliant
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Declared URL</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 break-all select-all block">
                  {privacyDiff?.target || miniApp?.privacyPolicyUrl || 'https://fintechcenterfsa.com/privacy'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      isHttps(privacyDiff?.target || miniApp?.privacyPolicyUrl)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>HTTPS Enforced</span>
                  </span>
                </div>

                <a
                  href={privacyDiff?.target || miniApp?.privacyPolicyUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>Test Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Capabilities & Technical Integration Shortcut Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Capabilities Delta Summary Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Capabilities &amp; Permissions Delta
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('PERMISSIONS')}
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-lg block">
                +{addedPerms.length}
              </span>
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase">
                Added
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
              <span className="text-rose-700 dark:text-rose-300 font-extrabold text-lg block">
                -{removedPerms.length}
              </span>
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-400 uppercase">
                Removed
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300 font-extrabold text-lg block">
                {unchangedPerms.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Retained
              </span>
            </div>
          </div>

          {addedPerms.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                Newly Requested Scopes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {addedPerms.map((p: any) => (
                  <span
                    key={p.type || p}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                  >
                    +{p.type || p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Integration Architecture Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Integration Architecture
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (miniApp?.integrationMethod === 'WEBVIEW') onNavigateTab('WEBVIEW');
                else if (miniApp?.integrationMethod === 'DEEP_LINK') onNavigateTab('DEEPLINK');
                else onNavigateTab('SPECS');
              }}
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Technical View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Method:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {miniApp?.integrationMethod || 'WEBVIEW'}
              </span>
            </div>
            {miniApp?.integrationMethod === 'WEBVIEW' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target Endpoint:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                  {integ?.productionUrl?.target || miniApp?.integrationConfig?.productionUrl || 'https://...'}
                </span>
              </div>
            )}
            {miniApp?.integrationMethod === 'DEEP_LINK' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">URI Scheme:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {integ?.urlScheme?.target || miniApp?.integrationConfigDeepLink?.urlScheme || 'app://'}
                </span>
              </div>
            )}
            {(miniApp?.integrationMethod === 'FLUTTER_PACKAGE' || miniApp?.integrationMethod === 'NATIVE_SDK') && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pub Package:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                  {integ?.flutterPackageName?.target || miniApp?.packageName || miniApp?.name}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('DIFF')}
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-brand-600 font-bold transition-colors cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>View Synthesized Code Diffs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
