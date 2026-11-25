'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import {
  Scale,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Globe,
  FileText,
  AlertCircle,
  Calendar,
  Building,
  Maximize2,
} from 'lucide-react';

export interface MiniAppLegalViewerProps {
  miniApp: {
    id?: string;
    appId?: string;
    name?: string;
    logo?: string;
    iconUrl?: string;
    currentReleaseVersion?: string;
    version?: string;
    category?: string;
    status?: string;
    lifecycleStatus?: string;
    termsUrl?: string;
    termsDescription?: string;
    privacyPolicyUrl?: string;
    privacyPolicyDescription?: string;
    legal?: {
      termsUrl?: string;
      termsDescription?: string;
      privacyPolicyUrl?: string;
      privacyPolicyDescription?: string;
    };
    updatedAt?: string | Date;
    createdAt?: string | Date;
  };
  isStandalonePage?: boolean;
  canEdit?: boolean;
  onEditClick?: () => void;
  defaultTab?: 'terms' | 'privacy';
}

export default function MiniAppLegalViewer({
  miniApp,
  isStandalonePage = false,
  canEdit = false,
  onEditClick,
  defaultTab = 'terms',
}: MiniAppLegalViewerProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<'terms' | 'privacy'>(defaultTab);
  const [copied, setCopied] = useState(false);

  // Normalize legal fields (check top-level first, then nested legal entity)
  const termsUrl = (miniApp.termsUrl || miniApp.legal?.termsUrl || '').trim();
  const termsText = (miniApp.termsDescription || miniApp.legal?.termsDescription || '').trim();
  const privacyUrl = (miniApp.privacyPolicyUrl || miniApp.legal?.privacyPolicyUrl || '').trim();
  const privacyText = (
    miniApp.privacyPolicyDescription ||
    miniApp.legal?.privacyPolicyDescription ||
    ''
  ).trim();

  const currentUrl = selectedPolicy === 'terms' ? termsUrl : privacyUrl;
  const currentText = selectedPolicy === 'terms' ? termsText : privacyText;
  const currentTitle = selectedPolicy === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  const hasTerms = Boolean(termsUrl || termsText);
  const hasPrivacy = Boolean(privacyUrl || privacyText);

  const handleCopy = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (url: string, text: string) => {
    if (url && text) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          Link + Document
        </span>
      );
    }
    if (url) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
          Hosted URL
        </span>
      );
    }
    if (text) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
          Embedded Document
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        Not Configured
      </span>
    );
  };

  const formattedDate = miniApp.updatedAt
    ? new Date(miniApp.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Latest Revision';

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Sovereign Compliance Badge */}
      <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-900/60 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-sm">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Legal & Regulatory Disclosures
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                FSA SuperApp Framework
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Official legal policies, terms of service, and privacy disclosures governing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {miniApp.name || miniApp.appId || 'this application'}
              </span>
              .
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2 print:hidden self-start md:self-auto">
          {canEdit && onEditClick && !isStandalonePage && (
            <button
              type="button"
              onClick={onEditClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-500" />
              <span>Edit Policies</span>
            </button>
          )}


          {!isStandalonePage && (
            <Link
              href={`/miniapps/${miniApp.id}/legal?type=${selectedPolicy}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800/60 hover:bg-brand-100/70 transition-colors shadow-sm"
              title="Open full dedicated page"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Page</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Policy Selection Navigation Tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
        {/* Policy Tab Pills */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={selectedPolicy === 'terms'}
            onClick={() => setSelectedPolicy('terms')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedPolicy === 'terms'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
            {getStatusBadge(termsUrl, termsText)}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedPolicy === 'privacy'}
            onClick={() => setSelectedPolicy('privacy')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedPolicy === 'privacy'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
            {getStatusBadge(privacyUrl, privacyText)}
          </button>
        </div>

        {/* Tab-specific actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 hover:bg-sky-100 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Visit Hosted Link</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          )}

          {currentText && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Copy markdown text to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. Hosted External URL Banner (if URL provided) */}
      {currentUrl && (
        <div className="p-3.5 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <span>Official Hosted {currentTitle} URL</span>
                {currentUrl.startsWith('https://') && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    • HTTPS Secure
                  </span>
                )}
              </div>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 dark:text-sky-300 hover:underline truncate block font-mono"
              >
                {currentUrl}
              </a>
            </div>
          </div>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>Open Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* 4. Document Content Viewer Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden">
        {/* Document Header Bar */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {currentTitle}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Effective: {formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Building className="w-3.5 h-3.5" />
            <span>App ID: {miniApp.appId || miniApp.id}</span>
            {miniApp.currentReleaseVersion && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                v{miniApp.currentReleaseVersion}
              </span>
            )}
          </div>
        </div>

        {/* Document Body Area */}
        <div className="p-6 sm:p-8 min-h-[300px]">
          {currentText ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
              <MarkdownRenderer content={currentText} />
            </div>
          ) : currentUrl ? (
            <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Externally Hosted Policy Document
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The developer has configured an external URL for this application&apos;s {currentTitle.toLowerCase()}.
                No inline text was bundled. Please review the live external website:
              </p>
              <div className="pt-2">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-sm"
                >
                  <Globe className="w-4 h-4" />
                  <span>Open {currentTitle} in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </div>
            </div>
          ) : (
            <div className="py-14 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No {currentTitle} Configured
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This mini application has not provided a custom {currentTitle.toLowerCase()} document or external URL yet.
                </p>
              </div>

              {canEdit && onEditClick && !isStandalonePage ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onEditClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Add {currentTitle}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    FSA SuperApp regulatory compliance guidelines require all public-facing mini applications to submit a valid Terms of Service and Privacy Policy before production approval.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Footer Bar */}
        <div className="px-6 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>FSA SuperApp Container Sovereign Governance</span>
          </div>
          <div>
            <span>Document ID: {miniApp.id}-{selectedPolicy}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
