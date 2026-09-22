'use client';

import React, { useState } from 'react';
import { ShieldCheckIcon, BuildingIcon, DevicePhoneIcon, PackageIcon } from '@/components/ui/Icons';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { CreateMiniAppDto, IntegrationMethod } from '@/types/miniapp.types';
import { getOrganizationCode, getOrganizationFullName } from '@/lib/constants/fsa-organizations';

export interface ReviewSummaryStepProps {
  formData: Partial<CreateMiniAppDto>;
  onEditStep?: (step: number) => void;
}

export default function ReviewSummaryStep({ formData, onEditStep }: ReviewSummaryStepProps) {
  const [copiedAppId, setCopiedAppId] = useState(false);

  const handleCopyAppId = () => {
    if (formData.appId) {
      navigator.clipboard.writeText(formData.appId);
      setCopiedAppId(true);
      setTimeout(() => setCopiedAppId(false), 2000);
    }
  };

  const getPermissionIcon = (type: string) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('camera')) {
      return (
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
    if (lower.includes('bio') || lower.includes('finger') || lower.includes('auth')) {
      return (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 7.042m2.41 12.016a13.92 13.92 0 01-.98-3.058" />
        </svg>
      );
    }
    if (lower.includes('location') || lower.includes('geo') || lower.includes('gps')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
    if (lower.includes('mic') || lower.includes('audio')) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    }
    if (lower.includes('storage') || lower.includes('file')) {
      return (
        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  };

  const formatSecurityCheckName = (checkId: string) => {
    switch (checkId) {
      case 'dependency_scan':
        return 'Dependency & CVE Vulnerability Audit';
      case 'secret_scan':
        return 'Secret & Credential Leak Scanner';
      case 'domain_tls_audit':
        return 'Domain & TLS 1.2+ Security Audit';
      case 'csp_headers_audit':
        return 'CSP & HTTP Security Headers Check';
      case 'dast_zap':
        return 'OWASP ZAP DAST Penetration Scan';
      case 'sast_code_audit':
        return 'SAST Code & Capability Policy Scan';
      default:
        return checkId.replace(/_/g, ' ').toUpperCase();
    }
  };

  const getMethodBadge = (method?: IntegrationMethod) => {
    switch (method) {
      case IntegrationMethod.WEBVIEW:
        return {
          label: 'Hosted WebView',
          color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          ),
        };
      case IntegrationMethod.FLUTTER_PACKAGE:
        return {
          label: 'Flutter Pub Package',
          color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          dot: 'bg-purple-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        };
      case IntegrationMethod.NATIVE_SDK:
        return {
          label: 'Native SDK (Framework)',
          color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
        };
      case IntegrationMethod.DEEP_LINK:
        return {
          label: 'Native Deep Link',
          color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          dot: 'bg-sky-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          ),
        };
      default:
        return {
          label: method || 'Custom',
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-500',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        };
    }
  };

  const methodMeta = getMethodBadge(formData.integrationMethod);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* ─── Hero Overview Header Card ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Logo Display */}
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center shrink-0">
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt={formData.name || 'Logo'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : 'M'}
                </div>
              )}
            </div>

            {/* Title & Identifiers */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {formData.name || 'Untitled Mini App'}
                </h3>
                {(formData.organization || formData.category) && (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800"
                    title={getOrganizationFullName(formData.organization || formData.category)}
                  >
                    <BuildingIcon className="w-3 h-3 text-sky-500" />
                    <span>{getOrganizationCode(formData.organization || formData.category)}</span>
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${methodMeta.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${methodMeta.dot} animate-pulse`} />
                  {methodMeta.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">App ID:</span>
                <code className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {formData.appId || 'miniapp_unassigned'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyAppId}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  title="Copy App ID"
                >
                  {copiedAppId ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Ready for Submission</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid: Section 1 (Basic Info) & Section 2 (Team) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Basic Information Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/60 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">1. Basic Information</h4>
            </div>
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 bg-brand-50/80 hover:bg-brand-100/80 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 px-2.5 py-1 rounded-lg transition-colors border border-brand-200/50 dark:border-brand-800/50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  App Name
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.name || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Organization
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {getOrganizationCode(formData.organization || formData.category)}
                  <span className="text-xs font-normal text-slate-500 ml-1.5 block sm:inline">
                    ({getOrganizationFullName(formData.organization || formData.category)})
                  </span>
                </span>
              </div>
            </div>

            {formData.shortDescription && (
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Short Tagline
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm">
                  {formData.shortDescription}
                </div>
              </div>
            )}

            {formData.fullDescription && (
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Full Description
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm max-h-28 overflow-y-auto">
                  {formData.fullDescription}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Team & Contacts Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">2. Team & Ownership</h4>
            </div>
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(2)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 bg-brand-50/80 hover:bg-brand-100/80 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 px-2.5 py-1 rounded-lg transition-colors border border-brand-200/50 dark:border-brand-800/50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Team / Organization Name
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formData.teamName || 'Independent Developer'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Owner Name
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formData.ownerName || '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center text-amber-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Owner Email (Primary Account)
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {formData.ownerEmail || '-'}
                  </span>
                </div>
              </div>

              {formData.supportEmail && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800 flex items-center justify-center text-purple-600 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Support Email
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                      {formData.supportEmail}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Telegram Channel Alerts */}
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                Automated Alerts & CI/CD Channel
              </span>
              {formData.teamTelegramChatId ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-sky-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                    <div>
                      <span className="font-semibold text-xs text-sky-800 dark:text-sky-200 block">Telegram Group Channel</span>
                      <code className="font-mono text-xs text-sky-700 dark:text-sky-300 font-bold">{formData.teamTelegramChatId}</code>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-sky-200/70 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>No team Telegram channel configured (personal alerts only).</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid: Section 3 (Integration) & Section 4 (Permissions & Security) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Integration Details Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">3. Integration Configuration</h4>
            </div>
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(3)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 bg-brand-50/80 hover:bg-brand-100/80 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 px-2.5 py-1 rounded-lg transition-colors border border-brand-200/50 dark:border-brand-800/50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Integration Architecture
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${methodMeta.color}`}>
                {methodMeta.icon}
                <span>{methodMeta.label}</span>
              </span>
            </div>

            {formData.integrationMethod === IntegrationMethod.WEBVIEW && (
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Production Hosted Endpoint
                  </span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <code className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {formData.integrationConfigWebView?.productionUrl || '-'}
                    </code>
                    {formData.integrationConfigWebView?.productionUrl && (
                      <a
                        href={formData.integrationConfigWebView.productionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 dark:text-brand-400 hover:text-brand-700 p-1 shrink-0"
                        title="Open Endpoint"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {formData.integrationConfigWebView?.stagingUrl && (
                  <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Staging / Pre-prod Endpoint
                    </span>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <code className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                        {formData.integrationConfigWebView.stagingUrl}
                      </code>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">Domain Ownership Verification:</span>
                  {formData.isDomainVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Domain Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending Verification Token
                    </span>
                  )}
                </div>
              </div>
            )}

            {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Source Mode
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formData.integrationConfigFlutter?.sourceType || 'GIT'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Package Identifier
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {formData.integrationConfigFlutter?.packageName || '-'}
                    </span>
                  </div>
                </div>

                {formData.integrationConfigFlutter?.sourceType === 'GIT' ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between font-sans">
                      <span className="text-slate-400">Access Level:</span>
                      {formData.integrationConfigFlutter?.isPrivateRepo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <span>🔒 Private</span>
                          <span>({formData.integrationConfigFlutter?.authMethod === 'token' ? 'Access Token' : 'SSH Deploy Key'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <span>🌍 Public (Zero Credentials)</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans">Git Repository: </span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold break-all">
                        {formData.integrationConfigFlutter?.gitUrl || '-'}
                      </span>
                    </div>
                    {formData.integrationConfigFlutter?.gitPath && (
                      <div>
                        <span className="text-slate-400 font-sans">Package Path: </span>
                        <span className="text-slate-800 dark:text-slate-200 font-semibold">
                          {formData.integrationConfigFlutter.gitPath}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 font-sans">Branch / Ref: </span>
                      <span className="text-brand-600 dark:text-brand-400 font-semibold">
                        {formData.integrationConfigFlutter?.gitBranch || 'main'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-xs">
                    <span className="text-slate-400 font-sans">Version Constraint: </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {formData.integrationConfigFlutter?.versionConstraint || 'latest'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {formData.integrationMethod === IntegrationMethod.NATIVE_SDK && (
              <div className="space-y-4">
                {/* Quarantine Isolation Banner */}
                <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheckIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Isolated MinIO Quarantine Staging</span>
                  </span>
                  <span className="font-mono text-[10px] bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    Zero-Bytes to Nexus Pre-Approval
                  </span>
                </div>

                {/* iOS Details */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <DevicePhoneIcon className="w-3.5 h-3.5 text-sky-600" />
                      <span>iOS Framework Target</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {formData.integrationConfigNativeSdk?.iosArtifactFilename || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Module:</span>
                      <code className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formData.integrationConfigNativeSdk?.iosModuleName || '-'}
                      </code>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Type:</span>
                      <code className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formData.integrationConfigNativeSdk?.iosTypeName || '-'}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Android Details */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <PackageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Android Maven Artifact Target</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {formData.integrationConfigNativeSdk?.androidArtifactFilename || '-'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Maven Coordinates:</span>
                      <code className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {formData.integrationConfigNativeSdk?.androidMavenGroupId || 'com.fsa.sdk'}:
                        {formData.integrationConfigNativeSdk?.androidMavenArtifactId || '-'}:
                        {formData.integrationConfigNativeSdk?.androidMavenVersion || '1.0.0'}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block">Package:</span>
                        <code className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {formData.integrationConfigNativeSdk?.androidPackageName || '-'}
                        </code>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Object Class:</span>
                        <code className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {formData.integrationConfigNativeSdk?.androidObjectName || '-'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.integrationMethod === IntegrationMethod.DEEP_LINK && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      URL Scheme
                    </span>
                    <code className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                      {formData.integrationConfigDeepLink?.urlScheme || '-'}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Android Package
                    </span>
                    <code className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {formData.integrationConfigDeepLink?.packageName || '-'}
                    </code>
                  </div>
                </div>
                {formData.integrationConfigDeepLink?.appStoreUrl && (
                  <div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Store Fallback
                    </span>
                    <a
                      href={formData.integrationConfigDeepLink.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-brand-600 hover:underline break-all block truncate"
                    >
                      {formData.integrationConfigDeepLink.appStoreUrl}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Legal & Compliance Policies in Card 3 */}
            {(formData.termsUrl || formData.termsDescription || formData.privacyPolicyUrl || formData.privacyPolicyDescription) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Legal &amp; Compliance Disclosures
                </span>

                {/* Terms of Service */}
                {(formData.termsUrl || formData.termsDescription) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-brand-600" />
                        <span>Terms of Service</span>
                      </span>
                      {formData.termsUrl && (
                        <a
                          href={formData.termsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                        >
                          <span>{formData.termsUrl}</span>
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {formData.termsDescription && (
                      <div className="max-h-36 overflow-y-auto pr-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <MarkdownRenderer content={formData.termsDescription} />
                      </div>
                    )}
                  </div>
                )}

                {/* Privacy Policy */}
                {(formData.privacyPolicyUrl || formData.privacyPolicyDescription) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Privacy Policy</span>
                      </span>
                      {formData.privacyPolicyUrl && (
                        <a
                          href={formData.privacyPolicyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                        >
                          <span>{formData.privacyPolicyUrl}</span>
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {formData.privacyPolicyDescription && (
                      <div className="max-h-36 overflow-y-auto pr-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <MarkdownRenderer content={formData.privacyPolicyDescription} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Host Permissions Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">4. Native Host Permissions</h4>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  onClick={() => onEditStep(4)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 bg-brand-50/80 hover:bg-brand-100/80 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 px-2.5 py-1 rounded-lg transition-colors border border-brand-200/50 dark:border-brand-800/50"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Requested Permissions List */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Declared Host Permissions ({formData.permissions?.length || 0})
              </span>

              {formData.permissions && formData.permissions.length > 0 ? (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {formData.permissions.map((p, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3"
                    >
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-2xs shrink-0 mt-0.5">
                        {getPermissionIcon(p.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 capitalize">
                            {p.type}
                          </span>
                          <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Required
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          <strong className="text-slate-700 dark:text-slate-300 font-medium">Purpose: </strong>
                          {p.purpose || 'Declared for Mini App functionality.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  No special host bridge permissions requested.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Security Validation Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:shadow transition-shadow lg:col-span-2">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">5. Security Validation Profile</h4>
            </div>
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(5)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 bg-brand-50/80 hover:bg-brand-100/80 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 px-2.5 py-1 rounded-lg transition-colors border border-brand-200/50 dark:border-brand-800/50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
          </div>

          <div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
              Configured CI/CD Security Gates ({formData.securityChecks?.length || 0} checks active)
            </span>
            {formData.securityChecks && formData.securityChecks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {formData.securityChecks.map((chk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200"
                  >
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="truncate">{formatSecurityCheckName(chk)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Baseline security audits enabled by default.</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Ready to Register Notice Card ─── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-50/90 via-indigo-50/50 to-blue-50/90 dark:from-brand-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-brand-200/80 dark:border-brand-800/60 shadow-xs flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h5 className="font-bold text-sm text-slate-900 dark:text-white">
            Ready to Complete Registration
          </h5>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Please review the configuration above. Clicking <strong className="text-slate-900 dark:text-slate-100 font-semibold">"Register Mini App"</strong> will save your configuration, create the official record, and automatically schedule CI/CD compliance validation scans.
          </p>
        </div>
      </div>
    </div>
  );
}
