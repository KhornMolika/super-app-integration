'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Label } from '@/components/ui/inputs';
import { validateProductionUrlFormat, generateClientVerificationToken } from '@/lib/integration-utils';

export interface WebViewIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleWebViewChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDomainVerified?: (data: any) => void;
  isEditable?: boolean;
}

export default function WebViewIntegrationForm({
  formData,
  allErrors = {},
  handleWebViewChange,
  onDomainVerified,
  isEditable = true,
}: WebViewIntegrationFormProps) {
  // State for Production URL Real-Time Validation
  const [prodUrlValidation, setProdUrlValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'unreachable';
    message: string | null;
  }>({ status: 'idle', message: null });
  const prodUrlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const prodUrlCacheRef = useRef<Map<string, { reachable: boolean; timestamp: number }>>(new Map());

  // Snippet and copy state
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // State for Domain Ownership Verification
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerificationMsg, setDomainVerificationMsg] = useState<string | null>(null);
  const [domainVerificationMsgType, setDomainVerificationMsgType] = useState<'info' | 'success' | 'error' | null>(null);
  const [domainVerificationSuccess, setDomainVerificationSuccess] = useState<boolean | null>(null);
  const [verifiedUrl, setVerifiedUrl] = useState<string | null>(
    formData.isDomainVerified ? (formData.integrationConfigWebView?.productionUrl || '') : null
  );

  // Auto-generate token on mount if empty or placeholder
  useEffect(() => {
    const currentToken =
      formData.integrationConfigWebView?.verificationToken ||
      formData.verificationToken;
    if (!currentToken || currentToken === 'tok_live_pending_save') {
      const newToken = generateClientVerificationToken();
      if (handleWebViewChange) {
        handleWebViewChange({
          target: { name: 'verificationToken', value: newToken },
        } as any);
      }
    }
  }, [formData.verificationToken, formData.integrationConfigWebView?.verificationToken, handleWebViewChange]);

  const handleGenerateToken = async () => {
    let newToken = generateClientVerificationToken();
    try {
      const res = await fetch('/api/mini-apps/generate-token');
      if (res.ok) {
        const data = await res.json();
        if (data.token) newToken = data.token;
      }
    } catch {
      // Fallback already assigned
    }

    if (handleWebViewChange) {
      handleWebViewChange({
        target: { name: 'verificationToken', value: newToken },
      } as any);
    }

    setDomainVerificationSuccess(false);
    setVerifiedUrl(null);
    setDomainVerificationMsg('New verification token generated. Please update your association file and verify domain.');
    setDomainVerificationMsgType('info');
    if (onDomainVerified) {
      onDomainVerified({ verified: false, isDomainVerified: false, verificationToken: newToken });
    }
  };

  const onWebViewInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'productionUrl') {
      const newVal = e.target.value.trim();
      if (!verifiedUrl || newVal !== verifiedUrl.trim()) {
        setDomainVerificationSuccess(false);
        setDomainVerificationMsg(null);
        setDomainVerificationMsgType(null);
        if (onDomainVerified) {
          onDomainVerified({ verified: false, isDomainVerified: false });
        }
      }
    }
    handleWebViewChange(e);
  };

  const handleVerifyDomain = async () => {
    const targetUrl = formData.integrationConfigWebView?.productionUrl;
    if (!targetUrl || !targetUrl.trim()) {
      setDomainVerificationMsg('Please enter a Production URL first.');
      setDomainVerificationMsgType('error');
      setDomainVerificationSuccess(false);
      return;
    }

    let currentToken =
      formData.integrationConfigWebView?.verificationToken ||
      formData.verificationToken;

    if (!currentToken || currentToken === 'tok_live_pending_save') {
      currentToken = generateClientVerificationToken();
      if (handleWebViewChange) {
        handleWebViewChange({
          target: { name: 'verificationToken', value: currentToken },
        } as any);
      }
    }

    const currentAppId = formData.appId || 'miniapp_8f32a1';

    setIsVerifyingDomain(true);
    setDomainVerificationMsg(null);
    setDomainVerificationMsgType(null);
    try {
      let res: Response;
      if (formData.id) {
        res = await fetch(`/api/mini-apps/${formData.id}/verify-domain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productionUrl: targetUrl.trim() }),
        });
      } else {
        res = await fetch(`/api/mini-apps/verify-domain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productionUrl: targetUrl.trim(),
            appId: currentAppId,
            verificationToken: currentToken,
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.verified) {
        setDomainVerificationSuccess(true);
        setVerifiedUrl(targetUrl.trim());
        setDomainVerificationMsg(data.message || 'Domain ownership verified successfully.');
        setDomainVerificationMsgType('success');
        if (onDomainVerified) {
          onDomainVerified({
            ...data,
            isDomainVerified: true,
            verified: true,
            verificationToken: currentToken,
          });
        }
        if (data.allowedDomains && Array.isArray(data.allowedDomains) && data.allowedDomains.length > 0) {
          handleWebViewChange({
            target: { name: 'allowedDomains', value: data.allowedDomains.join(', ') },
          } as any);
        }
      } else {
        setDomainVerificationSuccess(false);
        setVerifiedUrl(null);
        setDomainVerificationMsg(data.message || 'Domain verification failed.');
        setDomainVerificationMsgType('error');
        if (onDomainVerified) {
          onDomainVerified({
            verified: false,
            isDomainVerified: false,
            validationErrors: data.validationErrors,
          });
        }
      }
    } catch (err: any) {
      setDomainVerificationSuccess(false);
      setVerifiedUrl(null);
      setDomainVerificationMsg(err.message || 'Failed to connect to verification service.');
      setDomainVerificationMsgType('error');
      if (onDomainVerified) {
        onDomainVerified({ verified: false, isDomainVerified: false });
      }
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  // Real-time Production URL format and reachability check
  useEffect(() => {
    const prodUrl = (formData.integrationConfigWebView?.productionUrl || '').trim();

    if (!prodUrl) {
      setProdUrlValidation({ status: 'idle', message: null });
      return;
    }

    // 1. Immediate synchronous format check (0ms)
    const formatRes = validateProductionUrlFormat(prodUrl);
    if (!formatRes.valid) {
      setProdUrlValidation({ status: 'invalid', message: formatRes.error });
      return;
    }

    // Check in-memory cache for instant feedback (< 1ms)
    const cached = prodUrlCacheRef.current.get(prodUrl);
    if (cached && Date.now() - cached.timestamp < 30000) {
      if (cached.reachable) {
        setProdUrlValidation({ status: 'valid', message: 'URL format valid & server is online' });
      } else {
        setProdUrlValidation({ status: 'unreachable', message: 'URL format valid, but server is offline or unreachable' });
      }
      return;
    }

    // 2. Format is valid -> Fast debounced reachability check (250ms)
    setProdUrlValidation({ status: 'checking', message: 'Checking server...' });

    if (prodUrlDebounceRef.current) {
      clearTimeout(prodUrlDebounceRef.current);
    }

    const abortCtrl = new AbortController();

    prodUrlDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mini-apps/check-url?url=${encodeURIComponent(prodUrl)}`, {
          signal: abortCtrl.signal,
        });
        const data = await res.json();
        const isReachable = Boolean(data.reachable);

        prodUrlCacheRef.current.set(prodUrl, { reachable: isReachable, timestamp: Date.now() });

        if (isReachable) {
          setProdUrlValidation({
            status: 'valid',
            message: 'URL format valid & server is online',
          });
        } else {
          setProdUrlValidation({
            status: 'unreachable',
            message: 'URL format valid, but server is offline or unreachable',
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setProdUrlValidation({
          status: 'unreachable',
          message: 'URL format valid, but could not connect to server',
        });
      }
    }, 250);

    return () => {
      abortCtrl.abort();
      if (prodUrlDebounceRef.current) {
        clearTimeout(prodUrlDebounceRef.current);
      }
    };
  }, [formData.integrationConfigWebView?.productionUrl]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Production URL <span className="text-rose-500">*</span></Label>
          <div className="relative">
            <Input
              name="productionUrl"
              value={formData.integrationConfigWebView?.productionUrl || ''}
              onChange={onWebViewInputChange}
              required
              disabled={!isEditable}
              type="url"
              placeholder="https://banking.example.com/app"
              className={`pr-9 ${
                prodUrlValidation.status === 'invalid'
                  ? 'border-rose-500 ring-1 ring-rose-500/40 focus:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                  : prodUrlValidation.status === 'valid'
                  ? 'border-emerald-500 ring-1 ring-emerald-500/40 focus:ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : prodUrlValidation.status === 'unreachable'
                  ? 'border-amber-500 ring-1 ring-amber-500/40 focus:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                  : ''
              }`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {prodUrlValidation.status === 'checking' && (
                <svg className="animate-spin w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {prodUrlValidation.status === 'valid' && (
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {prodUrlValidation.status === 'invalid' && (
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {prodUrlValidation.status === 'unreachable' && (
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
          </div>

          {/* Dynamic Real-Time Feedback Messages */}
          {prodUrlValidation.status === 'invalid' && (
            <p className="mt-1.5 text-sm text-rose-600 font-medium flex items-center gap-1">
              <span>✕</span> {prodUrlValidation.message}
            </p>
          )}
          {prodUrlValidation.status === 'unreachable' && (
            <p className="mt-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span>⚠</span> {prodUrlValidation.message}
            </p>
          )}
          {prodUrlValidation.status === 'valid' && (
            <p className="mt-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span>✓</span> {prodUrlValidation.message}
            </p>
          )}
          {prodUrlValidation.status === 'idle' && allErrors['integrationConfigWebView.productionUrl'] && (
            <p className="mt-1.5 text-sm text-rose-600 font-medium">
              {allErrors['integrationConfigWebView.productionUrl']}
            </p>
          )}
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Primary HTTPS endpoint loaded by the Super App WebView container.
          </p>
        </div>

        <div>
          <Label>Staging / Test URL (Optional)</Label>
          <Input
            name="stagingUrl"
            value={formData.integrationConfigWebView?.stagingUrl || ''}
            onChange={handleWebViewChange}
            disabled={!isEditable}
            type="url"
            placeholder="https://staging-banking.example.com/app"
          />
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Secondary endpoint used during internal test builds and staging.
          </p>
        </div>
      </div>

      {/* Domain Ownership Verification Section */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Domain Ownership Verification
              </h4>
              {(() => {
                const currentProdUrl = (formData.integrationConfigWebView?.productionUrl || '').trim();
                const isActuallyVerified =
                  domainVerificationSuccess === true ||
                  (formData.isDomainVerified &&
                    domainVerificationSuccess !== false &&
                    Boolean(verifiedUrl) &&
                    verifiedUrl!.trim() === currentProdUrl);

                return isActuallyVerified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Pending Verification (Required)
                  </span>
                );
              })()}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Prove administrative control of the target domain by hosting the public association file.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/guidelines?method=webview#domain-verification"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800/60 transition shadow-sm"
              title="Open Domain Ownership Documentation in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              <span>Verification Guide</span>
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>

            <Button
              type="button"
              onClick={handleVerifyDomain}
              disabled={isVerifyingDomain || !isEditable}
              className="text-sm px-4 py-2 font-semibold flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm"
            >
              {isVerifyingDomain && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{isVerifyingDomain ? 'Verifying...' : 'Verify Domain'}</span>
            </Button>
          </div>
        </div>

        {/* Step-by-Step Setup Guide Callout */}
        <div className="p-4 mb-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-sm text-slate-700 dark:text-slate-300 space-y-3">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>How to Host the Domain Association File</span>
            </div>
            <a
              href="/guidelines?method=webview#domain-verification"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 font-semibold text-sm"
            >
              <span>Learn more in documentation</span>
              <span>→</span>
            </a>
          </div>
          <ol className="list-decimal list-inside space-y-2.5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed pl-0.5">
            <li>
              <strong className="text-slate-800 dark:text-slate-200">File Name & Directory:</strong> Create a JSON file named <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-slate-100 font-semibold">superapp-miniapp-association.json</code> and place it inside your web application's public root under the <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-slate-100 font-semibold">/.well-known/</code> folder.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-200">Public HTTP/HTTPS Accessibility:</strong> Deploy the file so it is publicly accessible returning HTTP status <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-sm text-emerald-600 dark:text-emerald-400 font-semibold">200 OK</code> with <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-slate-100 font-semibold">Content-Type: application/json</code>.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-200">Copy JSON & Verify:</strong> Copy the generated JSON manifest below into that file, publish your website, and click <strong>Verify Domain</strong> above.
            </li>
          </ol>
        </div>

        {(() => {
          const currentProdUrl = (formData.integrationConfigWebView?.productionUrl || '').trim();
          const isActuallyVerified =
            domainVerificationSuccess === true ||
            (formData.isDomainVerified &&
              domainVerificationSuccess !== false &&
              Boolean(verifiedUrl) &&
              verifiedUrl!.trim() === currentProdUrl);

          if (domainVerificationMsg) {
            const isInfo =
              domainVerificationMsgType === 'info' ||
              domainVerificationMsg.toLowerCase().includes('token generated');

            if (isInfo) {
              return (
                <div className="p-3.5 mb-4 rounded-xl text-sm font-medium bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{domainVerificationMsg}</span>
                </div>
              );
            }

            if (isActuallyVerified && domainVerificationSuccess === true) {
              return (
                <div className="p-3.5 mb-4 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{domainVerificationMsg}</span>
                </div>
              );
            }

            return (
              <div className="p-3.5 mb-4 rounded-xl text-sm font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{domainVerificationMsg}</span>
              </div>
            );
          }

          if (!isActuallyVerified && allErrors['integrationConfigWebView.domainVerification']) {
            return (
              <div className="p-3.5 mb-4 rounded-xl text-sm font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{allErrors['integrationConfigWebView.domainVerification']}</span>
              </div>
            );
          }

          return null;
        })()}

        {/* Verification JSON Code View */}
        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-sm space-y-2 font-mono">
          {(() => {
            const prodUrlInput = formData.integrationConfigWebView?.productionUrl || '';

            const extractHost = (urlStr: string) => {
              if (!urlStr || !urlStr.trim()) return 'domain.com';
              try {
                return new URL(urlStr).hostname;
              } catch {
                const match = urlStr.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
                if (match) return match[1];
                const clean = urlStr.replace(/^https?:\/\//, '').split(/[:/]/)[0];
                return clean || 'domain.com';
              }
            };

            const extractOrigin = (urlStr: string) => {
              if (!urlStr || !urlStr.trim()) return 'https://<domain>';
              try {
                return new URL(urlStr).origin;
              } catch {
                const match = urlStr.match(/^([a-zA-Z]+:\/\/[^/]+)/);
                if (match) return match[1];
                const clean = urlStr.replace(/^https?:\/\//, '').split('/')[0];
                return `http://${clean}`;
              }
            };

            const currentHost = extractHost(prodUrlInput);
            const currentOrigin = extractOrigin(prodUrlInput);
            const fullEndpointUrl = `${currentOrigin}/.well-known/superapp-miniapp-association.json`;

            const rawAllowed = formData.integrationConfigWebView?.allowedDomains;
            let userAllowedDomains: string[] = [];
            if (Array.isArray(rawAllowed)) {
              userAllowedDomains = rawAllowed.map((d: any) => String(d).trim()).filter(Boolean);
            } else if (typeof rawAllowed === 'string') {
              userAllowedDomains = rawAllowed.split(',').map((d: string) => d.trim()).filter(Boolean);
            }

            if (userAllowedDomains.length === 0 && currentHost && currentHost !== 'domain.com') {
              userAllowedDomains = [currentHost];
            } else if (userAllowedDomains.length === 0) {
              userAllowedDomains = ['domain.com'];
            }

            const dynamicEnv =
              formData.environment ||
              (process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' ? 'DEV' : 'PROD');

            const defaultCategoryPerms: Record<string, string[]> = {
              insurance: ['Camera'],
              banking: ['Camera', 'Biometrics'],
              travel: ['Location'],
              transport: ['Location'],
              healthcare: ['Camera', 'Biometrics'],
              food: ['Location'],
              shopping: ['Location'],
            };
            const catKey = (formData.category || '').toLowerCase();
            const fallbackPerms = defaultCategoryPerms[catKey] || ['Camera', 'Location'];

            const activePerms =
              Array.isArray(formData.permissions) && formData.permissions.length > 0
                ? formData.permissions.map((p: any) => p.type || p)
                : fallbackPerms;

            const dynamicPayload = {
              appId: formData.appId || 'miniapp_8f32a1',
              verificationToken:
                formData.integrationConfigWebView?.verificationToken ||
                formData.verificationToken ||
                'tok_live_pending_save',
              environment: dynamicEnv,
              allowedDomains: userAllowedDomains,
              permissions: activePerms,
            };

            const dynamicJsonString = JSON.stringify(dynamicPayload, null, 2);

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400 pb-3 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 font-semibold text-sm">Endpoint:</span>
                      <code className="text-indigo-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded text-xs sm:text-sm break-all">
                        {fullEndpointUrl}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(fullEndpointUrl);
                        setCopiedPath(true);
                        setTimeout(() => setCopiedPath(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-slate-200 font-semibold transition flex items-center gap-1"
                    >
                      {copiedPath ? '✓ Copied URL' : 'Copy URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dynamicJsonString);
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs sm:text-sm text-white font-semibold transition flex items-center gap-1 shadow-sm"
                    >
                      {copiedJson ? '✓ Copied JSON' : 'Copy JSON'}
                    </button>
                  </div>
                </div>

                <div className="relative pt-2">
                  <pre className="text-slate-300 overflow-x-auto leading-relaxed text-xs sm:text-sm max-h-56 scrollbar-thin font-mono">
                    {dynamicJsonString}
                  </pre>
                </div>

                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs sm:text-sm">Verification Token:</span>
                    <span className="font-semibold text-emerald-400 font-mono text-xs sm:text-sm">
                      {dynamicPayload.verificationToken}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEditable && (
                      <button
                        type="button"
                        onClick={handleGenerateToken}
                        className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 underline font-sans font-medium"
                      >
                        Regenerate Token
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dynamicPayload.verificationToken);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="text-xs sm:text-sm text-slate-400 hover:text-slate-200 underline font-sans font-medium"
                    >
                      {copiedToken ? '✓ Copied' : 'Copy Token'}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Allowed Domains input */}
      <div>
        <Label>Allowed Navigation Domains (Optional Allowlist)</Label>
        <Input
          name="allowedDomains"
          value={formData.integrationConfigWebView?.allowedDomains || ''}
          onChange={handleWebViewChange}
          disabled={!isEditable}
          placeholder="banking.example.com, auth.example.com, cdn.example.com"
        />
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Comma-separated allowlist of external domains that the WebView is permitted to navigate to.
        </p>
      </div>
    </div>
  );
}
