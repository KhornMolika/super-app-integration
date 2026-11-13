'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Label } from '@/components/ui/inputs';
import { validateProductionUrlFormat, generateClientVerificationToken } from '@/lib/integration-utils';
import { miniappsApi } from '@/api';
import { CheckIcon } from '@/components/ui/Icons';
import { copyText } from '@/lib/clipboard';

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
      const data = await miniappsApi.generateToken();
      if (data && data.token) newToken = data.token;
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
      const data = await miniappsApi.verifyDomain(
        formData.id
          ? { id: formData.id, productionUrl: targetUrl.trim() }
          : {
              productionUrl: targetUrl.trim(),
              appId: currentAppId,
              verificationToken: currentToken,
            }
      );

      if (data && data.verified) {
        setDomainVerificationSuccess(true);
        setVerifiedUrl(targetUrl.trim());
        setDomainVerificationMsg((data as any).message || 'Domain ownership verified successfully.');
        setDomainVerificationMsgType('success');
        if (onDomainVerified) {
          onDomainVerified({
            ...data,
            isDomainVerified: true,
            verified: true,
            verificationToken: currentToken,
          });
        }
        if ((data as any).allowedDomains && Array.isArray((data as any).allowedDomains) && (data as any).allowedDomains.length > 0) {
          handleWebViewChange({
            target: { name: 'allowedDomains', value: (data as any).allowedDomains.join(', ') },
          } as any);
        }
      } else {
        setDomainVerificationSuccess(false);
        setVerifiedUrl(null);
        setDomainVerificationMsg((data as any)?.message || 'Domain verification failed.');
        setDomainVerificationMsgType('error');
        if (onDomainVerified) {
          onDomainVerified({
            verified: false,
            isDomainVerified: false,
            validationErrors: (data as any)?.validationErrors,
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

    prodUrlDebounceRef.current = setTimeout(async () => {
      try {
        const data = await miniappsApi.checkUrl(prodUrl);
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
        setProdUrlValidation({
          status: 'unreachable',
          message: 'URL format valid, but could not connect to server',
        });
      }
    }, 250);

    return () => {
      if (prodUrlDebounceRef.current) {
        clearTimeout(prodUrlDebounceRef.current);
      }
    };
  }, [formData.integrationConfigWebView?.productionUrl]);

  // ---------- view model ----------
  const prodUrlInput = (formData.integrationConfigWebView?.productionUrl || '').trim();
  const isVerified =
    domainVerificationSuccess === true ||
    Boolean(
      formData.isDomainVerified &&
        domainVerificationSuccess !== false &&
        verifiedUrl &&
        verifiedUrl.trim() === prodUrlInput,
    );

  const host = (() => {
    if (!prodUrlInput) return '';
    try {
      return new URL(prodUrlInput).hostname;
    } catch {
      return prodUrlInput.replace(/^https?:\/\//, '').split(/[:/]/)[0];
    }
  })();
  const origin = (() => {
    if (!prodUrlInput) return 'https://your-domain';
    try {
      return new URL(prodUrlInput).origin;
    } catch {
      return `https://${host || 'your-domain'}`;
    }
  })();
  const fileUrl = `${origin}/.well-known/superapp-miniapp-association.json`;

  const rawAllowed = formData.integrationConfigWebView?.allowedDomains;
  let allowed: string[] = Array.isArray(rawAllowed)
    ? rawAllowed.map((d: any) => String(d).trim()).filter(Boolean)
    : typeof rawAllowed === 'string'
      ? rawAllowed.split(',').map((d: string) => d.trim()).filter(Boolean)
      : [];
  if (allowed.length === 0) allowed = [host || 'your-domain'];

  const token =
    formData.integrationConfigWebView?.verificationToken || formData.verificationToken || 'tok_live_pending_save';
  const manifest = JSON.stringify(
    {
      appId: formData.appId || 'miniapp_8f32a1',
      verificationToken: token,
      environment: formData.environment || (process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' ? 'DEV' : 'PROD'),
      allowedDomains: allowed,
      permissions: Array.isArray(formData.permissions) ? formData.permissions.map((p: any) => p.type || p) : [],
    },
    null,
    2,
  );

  const copy = (text: string, done: (v: boolean) => void) => {
    copyText(text);
    done(true);
    setTimeout(() => done(false), 2000);
  };

  const urlTone =
    prodUrlValidation.status === 'invalid'
      ? 'text-rose-600 dark:text-rose-400'
      : prodUrlValidation.status === 'unreachable'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';
  const urlMessage =
    prodUrlValidation.status === 'valid'
      ? 'Server is online.'
      : prodUrlValidation.status === 'unreachable'
        ? 'Can’t reach the server right now. You can still continue once the domain is verified.'
        : prodUrlValidation.status === 'checking'
          ? 'Checking the server...'
          : prodUrlValidation.status === 'invalid'
            ? prodUrlValidation.message
            : allErrors['integrationConfigWebView.productionUrl'] || '';

  const verifyError =
    !isVerified && domainVerificationMsgType === 'error'
      ? domainVerificationMsg
      : !isVerified && !domainVerificationMsg
        ? allErrors['integrationConfigWebView.domainVerification']
        : null;

  const stepBadge = (n: number, done = false) => (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
        done ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
      }`}
    >
      {done ? <CheckIcon className="w-3.5 h-3.5" /> : n}
    </span>
  );
  const smallBtn =
    'h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors';

  return (
    <div className="space-y-6">
      {/* URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="wv-prod-url">
            App URL <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="wv-prod-url"
              name="productionUrl"
              value={formData.integrationConfigWebView?.productionUrl || ''}
              onChange={onWebViewInputChange}
              required
              disabled={!isEditable}
              type="url"
              placeholder="https://app.example.com"
              className={`pr-9 ${prodUrlValidation.status === 'invalid' ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {prodUrlValidation.status === 'checking' && (
                <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {prodUrlValidation.status === 'valid' && <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
            </span>
          </div>
          {urlMessage && <p className={`mt-1.5 text-xs ${urlTone}`}>{urlMessage}</p>}
        </div>

        <div>
          <Label htmlFor="wv-staging-url">
            Test URL <span className="text-xs font-normal text-slate-400">Optional</span>
          </Label>
          <Input
            id="wv-staging-url"
            name="stagingUrl"
            value={formData.integrationConfigWebView?.stagingUrl || ''}
            onChange={handleWebViewChange}
            disabled={!isEditable}
            type="url"
            placeholder="https://staging.example.com"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Used in test builds.</p>
        </div>
      </div>

      {/* Domain verification */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/70 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Verify your domain
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                <CheckIcon className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Required</span>
            )}
          </h3>
          <a
            href="/guidelines?method=webview#domain-verification"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Guide
          </a>
        </header>

        <ol className="divide-y divide-slate-200/70 dark:divide-slate-800">
          <li className="flex gap-3 p-4">
            {stepBadge(1, isVerified)}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Publish a JSON file at this address. It must return <code className="font-mono text-xs">200</code> as{' '}
                <code className="font-mono text-xs">application/json</code>.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-slate-200">
                  {fileUrl}
                </code>
                <button type="button" onClick={() => copy(fileUrl, setCopiedPath)} className={smallBtn}>
                  {copiedPath ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </li>

          <li className="flex gap-3 p-4">
            {stepBadge(2, isVerified)}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">Put this in the file.</p>
                <div className="flex items-center gap-2">
                  {isEditable && (
                    <button type="button" onClick={handleGenerateToken} className={smallBtn} title="Makes a new token. Update the file after.">
                      New token
                    </button>
                  )}
                  <button type="button" onClick={() => copy(manifest, setCopiedJson)} className={smallBtn}>
                    {copiedJson ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
              </div>
              <pre className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200">
                {manifest}
              </pre>
            </div>
          </li>

          <li className="flex gap-3 p-4">
            {stepBadge(3, isVerified)}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleVerifyDomain}
                  disabled={isVerifyingDomain || !isEditable || !prodUrlInput}
                  className="h-9 px-4 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isVerifyingDomain ? 'Verifying...' : isVerified ? 'Verify again' : 'Verify domain'}
                </Button>
                {isVerified && (
                  <span className="text-sm text-slate-600 dark:text-slate-300">{host} is verified.</span>
                )}
                {!isVerified && !prodUrlInput && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Enter the app URL first.</span>
                )}
              </div>
              {verifyError && <p className="text-sm text-rose-600 dark:text-rose-400">{verifyError}</p>}
              {!isVerified && domainVerificationMsgType === 'info' && domainVerificationMsg && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{domainVerificationMsg}</p>
              )}
            </div>
          </li>
        </ol>
      </section>

      {/* Other domains */}
      <div>
        <Label htmlFor="wv-allowed">
          Other domains it can open <span className="text-xs font-normal text-slate-400">Optional</span>
        </Label>
        <Input
          id="wv-allowed"
          name="allowedDomains"
          value={formData.integrationConfigWebView?.allowedDomains || ''}
          onChange={handleWebViewChange}
          disabled={!isEditable}
          placeholder="auth.example.com, cdn.example.com"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Separate with commas.</p>
      </div>
    </div>
  );
}
