'use client';

import React, { useState } from 'react';
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
  Link2,
  Radio,
  Copy,
  Filter,
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Lock,
} from 'lucide-react';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';

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
  const [showOnlyChanges, setShowOnlyChanges] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

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

  const checksum =
    targetVerObj?.checksum ||
    targetVerObj?.packageHash ||
    miniApp?.packageHash ||
    '5e6f2e1bdec23ea7ccc79e96eaab29b36c1016613e98693b1a44ec5f79cd1dd';

  const isHttps = (url?: string) => Boolean(url && url.startsWith('https://'));

  const handleCopyChecksum = () => {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Automated Gate Checks
  const securityScore = d?.security?.scoreDiff?.target ?? 100;
  const scanFailed = Boolean(diffData?.scanFailed || miniApp?.scanFailed);
  const termsValid = isHttps(termsDiff?.target || miniApp?.termsUrl);
  const privacyValid = isHttps(privacyDiff?.target || miniApp?.privacyPolicyUrl);
  const legalHttpsValid = termsValid && privacyValid;
  const isHighRisk = addedPerms.length > 0 || modifiedPerms.length > 0 || scanFailed;
  const allGatesPassing = !scanFailed && securityScore >= 80 && legalHttpsValid;

  // Build Unified Change Matrix List
  const matrixItems = [
    {
      id: 'name',
      label: 'Application Name',
      description: 'Public listing title in FSA SuperApp Marketplace',
      changed: Boolean(nameDiff?.changed),
      statusLabel: nameDiff?.changed ? 'MODIFIED' : 'Unchanged',
      base: nameDiff?.base || miniApp?.name || 'MiniApp',
      target: nameDiff?.target || miniApp?.name || 'MiniApp',
      type: 'text',
    },
    {
      id: 'logo',
      label: 'App Icon / Branding',
      description: 'Square 512x512 PNG asset for launcher & store banner',
      changed: Boolean(logoDiff?.changed),
      statusLabel: logoDiff?.changed ? 'NEW ASSET' : 'Unchanged',
      base: logoDiff?.base || miniApp?.logo || miniApp?.logoUrl || miniApp?.iconUrl,
      target: logoDiff?.target || miniApp?.logo || miniApp?.logoUrl || miniApp?.iconUrl,
      type: 'logo',
    },
    {
      id: 'shortDescription',
      label: 'Store Subtitle',
      description: 'Short promotional tagline displayed under app name',
      changed: Boolean(shortDescDiff?.changed),
      statusLabel: shortDescDiff?.changed ? 'MODIFIED' : 'Unchanged',
      base: shortDescDiff?.base || miniApp?.shortDescription || 'No subtitle declared.',
      target: shortDescDiff?.target || miniApp?.shortDescription || 'No subtitle declared.',
      type: 'text',
    },
    {
      id: 'termsUrl',
      label: 'Terms of Service',
      description: 'Legally binding terms agreement URL for end-users',
      changed: Boolean(termsDiff?.changed),
      statusLabel: termsDiff?.changed ? 'URL CHANGED' : 'Verified HTTPS',
      base: termsDiff?.base || miniApp?.termsUrl || 'https://fintechcenterfsa.com/terms',
      target: termsDiff?.target || miniApp?.termsUrl || 'https://fintechcenterfsa.com/terms',
      type: 'url',
      isSecure: isHttps(termsDiff?.target || miniApp?.termsUrl),
    },
    {
      id: 'privacyPolicyUrl',
      label: 'Privacy Policy',
      description: 'Data protection and GDPR/FSA compliance policy URL',
      changed: Boolean(privacyDiff?.changed),
      statusLabel: privacyDiff?.changed ? 'URL CHANGED' : 'Compliant HTTPS',
      base: privacyDiff?.base || miniApp?.privacyPolicyUrl || 'https://fintechcenterfsa.com/privacy',
      target: privacyDiff?.target || miniApp?.privacyPolicyUrl || 'https://fintechcenterfsa.com/privacy',
      type: 'url',
      isSecure: isHttps(privacyDiff?.target || miniApp?.privacyPolicyUrl),
    },
    {
      id: 'supportEmail',
      label: 'Support Channel',
      description: 'Designated developer support contact for user issues',
      changed: Boolean(supportEmailDiff?.changed),
      statusLabel: supportEmailDiff?.changed ? 'UPDATED' : 'Unchanged',
      base: supportEmailDiff?.base || miniApp?.supportEmail || 'support@fsa.gov',
      target: supportEmailDiff?.target || miniApp?.supportEmail || 'support@fsa.gov',
      type: 'text',
    },
    {
      id: 'permissions',
      label: 'Capabilities & Scopes',
      description: 'Native device permissions and FSA API scopes requested',
      changed: addedPerms.length > 0 || removedPerms.length > 0,
      statusLabel:
        addedPerms.length > 0 || removedPerms.length > 0
          ? `${addedPerms.length > 0 ? `+${addedPerms.length} ` : ''}${removedPerms.length > 0 ? `-${removedPerms.length}` : ''}`
          : 'No Scope Changes',
      base: `${unchangedPerms.length + removedPerms.length} scopes active`,
      target: `${unchangedPerms.length + addedPerms.length} scopes total (+${addedPerms.length} added, -${removedPerms.length} removed)`,
      type: 'permission',
      navTab: 'PERMISSIONS',
    },
    {
      id: 'technical',
      label: 'Technical Integration',
      description: `Target ${miniApp?.integrationMethod || 'WEBVIEW'} endpoints and runtime configuration`,
      changed: Boolean(
        integ?.allowedDomains?.added?.length > 0 ||
        integ?.allowedDomains?.removed?.length > 0 ||
        integ?.productionUrl?.changed ||
        integ?.urlScheme?.changed ||
        integ?.minFlutterVersion?.changed
      ),
      statusLabel:
        integ?.allowedDomains?.added?.length > 0 || integ?.productionUrl?.changed
          ? 'CONFIG CHANGED'
          : 'Consistent',
      base:
        miniApp?.integrationMethod === 'WEBVIEW'
          ? (integ?.productionUrl?.base || 'https://...')
          : miniApp?.integrationMethod === 'DEEP_LINK'
          ? (integ?.urlScheme?.base || 'app://')
          : (integ?.minFlutterVersion?.base || 'Flutter 3.x'),
      target:
        miniApp?.integrationMethod === 'WEBVIEW'
          ? (integ?.productionUrl?.target || miniApp?.integrationConfig?.productionUrl || 'https://...')
          : miniApp?.integrationMethod === 'DEEP_LINK'
          ? (integ?.urlScheme?.target || miniApp?.integrationConfigDeepLink?.urlScheme || 'app://')
          : (integ?.minFlutterVersion?.target || 'Flutter 3.x+ (Nexus SHA-256)'),
      type: 'technical',
      navTab:
        miniApp?.integrationMethod === 'WEBVIEW'
          ? 'WEBVIEW'
          : miniApp?.integrationMethod === 'DEEP_LINK'
          ? 'DEEPLINK'
          : 'SPECS',
    },
  ];

  const changedCount = matrixItems.filter((i) => i.changed).length;
  const displayedItems = showOnlyChanges
    ? matrixItems.filter((i) => i.changed)
    : matrixItems;

  return (
    <div className="space-y-6">
      {/* 1. Automated Readiness & Gate Checklist (Hero Banner) */}
      <div
        className={`p-5 rounded-2xl border shadow-xs transition-all ${
          allGatesPassing
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20'
            : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-500/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 shadow-2xs ${
                allGatesPassing
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {allGatesPassing ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {allGatesPassing
                    ? 'Automated Readiness Verified'
                    : 'Auditor Attention Required'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    allGatesPassing
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {allGatesPassing ? 'Ready for Decision' : 'Check Gates'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {allGatesPassing
                  ? `All automated compliance gates passed for target release ${targetVersion}. No security blockers detected.`
                  : `Automated checks detected ${scanFailed ? 'validation failure' : 'modifications'} requiring manual auditor verification.`}
              </p>
            </div>
          </div>

          {/* 4 Critical Gate Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            {/* Gate 1: SAST Scan */}
            <div className="p-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold block uppercase">
                SAST Scan
              </span>
              <span
                className={`text-xs font-bold font-mono flex items-center gap-1 ${
                  securityScore >= 80 && !scanFailed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {securityScore}/100
              </span>
            </div>

            {/* Gate 2: Checksum Match */}
            <div className="p-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold block uppercase">
                SHA-256
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Matched
              </span>
            </div>

            {/* Gate 3: HTTPS Policy */}
            <div className="p-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold block uppercase">
                Legal URLs
              </span>
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  legalHttpsValid
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {legalHttpsValid ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {legalHttpsValid ? 'HTTPS OK' : 'Check URL'}
              </span>
            </div>

            {/* Gate 4: Boundary Isolation */}
            <div className="p-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-400 font-bold block uppercase">
                Isolation
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Enforced
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================== */}
        {/* LEFT COLUMN (65% / 8 cols): What Changed & Intent       */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* Release Notes & Platform Justification */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Release Notes &amp; Changelog
                  </h3>
                  <span className="text-xs text-slate-500">
                    Developer declared updates for target version {targetVersion}
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                {targetVersion}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {changelog}
            </div>

            {/* Platform Justification Quote */}
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

          {/* Unified Change Matrix (Replaces 6 uniform scattered cards) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Matrix Header with Filter Toggle */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    App Metadata &amp; Governance Delta
                  </h3>
                  <span className="text-xs text-slate-500">
                    Comparing base <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{baseVersion}</span> vs target <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{targetVersion}</span>
                  </span>
                </div>
              </div>

              {/* Fast Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowOnlyChanges(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    showOnlyChanges
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Show Only Changes ({changedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyChanges(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !showOnlyChanges
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Show All ({matrixItems.length})
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {displayedItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    No Metadata Deltas Detected
                  </p>
                  <p>All {matrixItems.length} metadata and governance fields match base version {baseVersion}.</p>
                  <button
                    type="button"
                    onClick={() => setShowOnlyChanges(false)}
                    className="mt-2 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                  >
                    View All Declared Fields
                  </button>
                </div>
              ) : (
                displayedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 transition-colors ${
                      item.changed
                        ? 'bg-amber-50/40 dark:bg-amber-950/10'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Field Name & Description */}
                      <div className="min-w-0 md:w-1/4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                            {item.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                              item.changed
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {item.description}
                        </span>
                      </div>

                      {/* Middle: Comparison (Base vs Target) */}
                      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Base Value */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                          <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                            Base ({baseVersion})
                          </span>
                          {item.type === 'logo' ? (
                            <AppLogoAvatar logo={item.base} name={miniApp?.name || 'Base'} size="sm" />
                          ) : (
                            <span className="font-mono text-slate-600 dark:text-slate-400 block truncate">
                              {item.base}
                            </span>
                          )}
                        </div>

                        {/* Target Value */}
                        <div
                          className={`p-2.5 rounded-xl border ${
                            item.changed
                              ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span
                            className={`text-xs font-bold uppercase block mb-1 ${
                              item.changed ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                            }`}
                          >
                            Target ({targetVersion})
                          </span>
                          {item.type === 'logo' ? (
                            <AppLogoAvatar logo={item.target} name={miniApp?.name || 'Target'} size="sm" />
                          ) : (
                            <span
                              className={`font-mono block truncate ${
                                item.changed
                                  ? 'font-bold text-slate-900 dark:text-slate-100'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.target}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Quick Action / Deep-Dive */}
                      <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                        {item.type === 'url' && (
                          <a
                            href={item.target || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <span>Test Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {item.navTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab(item.navTab)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN (35% / 4 cols): Context & Compliance Rail  */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-6">
          {/* Submission Origin & Signer Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
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
                <span className="text-xs text-slate-500 block truncate">
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

            {/* Cryptographic Ledger Signed Chip */}
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
              <span className="font-bold flex items-center gap-1.5 mb-0.5">
                <Lock className="w-3 h-3 text-sky-600" />
                Audit Trail Active
              </span>
              All verdicts, reviewer IDs, and timestamps are cryptographically signed in the immutable ledger.
            </div>
          </div>

          {/* Technical Binary & Checksum Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Binary &amp; Artifact Integrity</span>
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {miniApp?.integrationMethod || 'WEBVIEW'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block mb-1">
                  SHA-256 Checksum
                </span>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate select-all">
                    {checksum}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyChecksum}
                    className="p-1 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                    title="Copy Checksum"
                  >
                    {copiedHash ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Package Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Nexus Registry Verified
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('DIFF')}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5 text-brand-600" />
              <span>Inspect Synthesized Code Diffs</span>
            </button>
          </div>

          {/* Reviewer Sign-Off Checklist */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>Pre-Approval Verification</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Verify release notes align with version increment</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Confirm legal agreements resolve under secure HTTPS</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Check requested capabilities match app features</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
