'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Label } from '@/components/ui/inputs';
import { validateProductionUrlFormat, generateClientVerificationToken } from '@/lib/integration-utils';
import { miniappsApi } from '@/api';
import { CheckIcon } from '@/components/ui/Icons';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/components/ui/Toast';

export interface WebViewIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleWebViewChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDomainVerified?: (data: any) => void;
  isEditable?: boolean;
}

async function verifyDomainViaBrowser(
  targetUrl: string,
  expectedAppId: string,
  expectedToken: string
): Promise<{
  success: boolean;
  message: string;
  mismatch?: boolean;
  allowedDomains?: string[];
  permissions?: string[];
}> {
  let origin: string;
  let hostname: string;
  try {
    const parsed = new URL(targetUrl);
    origin = parsed.origin;
    hostname = parsed.hostname;
  } catch {
    return { success: false, message: 'Invalid URL format' };
  }

  // 1. Check Association JSON file
  const assocUrl = `${origin}/.well-known/superapp-miniapp-association.json`;
  try {
    const res = await fetch(assocUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          mismatch: true,
          message: `Endpoint ${assocUrl} returned ${contentType || 'non-JSON'} instead of application/json. Ensure the static file exists and is not falling back to index.html.`,
        };
      }
      const payload = await res.json();
      const candidateIds: string[] = [
        typeof payload.appId === 'string' ? payload.appId : null,
        ...(Array.isArray(payload.appIds) ? payload.appIds : []),
      ].filter((id): id is string => Boolean(id));

      const normalize = (id: string) => id.toLowerCase().replace(/^com\.fsa\./, '').replace(/_/g, '-');
      const matchesAppId = candidateIds.some(
        (id) => id === expectedAppId || normalize(id) === normalize(expectedAppId)
      );

      if (!matchesAppId) {
        return {
          success: false,
          mismatch: true,
          message: `appId mismatch in association file: Expected "${expectedAppId}", found "${payload.appId || 'none'}".`,
        };
      }

      if (!payload.verificationToken || payload.verificationToken.trim() !== expectedToken.trim()) {
        return {
          success: false,
          mismatch: true,
          message: `verificationToken mismatch in association file: Expected "${expectedToken}", found "${payload.verificationToken || 'none'}".`,
        };
      }

      const allowedList =
        Array.isArray(payload.allowedDomains) && payload.allowedDomains.length > 0
          ? payload.allowedDomains
          : [hostname];

      const perms = Array.isArray(payload.permissions) ? payload.permissions : [];

      return {
        success: true,
        message: `Domain ownership verified successfully for ${hostname} (via association file).`,
        allowedDomains: allowedList,
        permissions: perms,
      };
    }
  } catch {
    // Association file fetch failed or network error
  }

  // 2. Check HTML Meta Tag
  try {
    const metaRes = await fetch(origin);
    if (metaRes.ok) {
      const html = await metaRes.text();
      const metaRegex = /<meta\s+[^>]*name=["']superapp-site-verification["'][^>]*content=["']([^"']+)["'][^>]*>/i;
      const metaRegexAlt = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']superapp-site-verification["'][^>]*>/i;
      const match = html.match(metaRegex) || html.match(metaRegexAlt);
      if (match && match[1].trim() === expectedToken.trim()) {
        return {
          success: true,
          message: `Domain ownership verified successfully via HTML meta tag on ${origin}.`,
          allowedDomains: [hostname],
          permissions: [],
        };
      }
    }
  } catch {
    // Meta check failed
  }

  return {
    success: false,
    message: `Could not verify domain ownership. Please ensure the association file or meta tag is deployed.`,
  };
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
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedDnsHost, setCopiedDnsHost] = useState(false);
  const [copiedDnsVal, setCopiedDnsVal] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [verificationTab, setVerificationTab] = useState<'dns' | 'meta' | 'json'>('dns');
  const [isEditingCustomToken, setIsEditingCustomToken] = useState(false);

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
        return;
      }

      // Check if backend verification failed due to network egress isolation (e.g. "fetch failed")
      const backendMsg = (data as any)?.message || '';
      const isNetworkIssue =
        backendMsg.includes('fetch failed') ||
        backendMsg.includes('Error connecting to') ||
        backendMsg.includes('ECONNREFUSED') ||
        backendMsg.includes('ETIMEDOUT') ||
        backendMsg.includes('ENOTFOUND');

      if (isNetworkIssue) {
        const clientVerified = await verifyDomainViaBrowser(targetUrl.trim(), currentAppId, currentToken);
        if (clientVerified.success) {
          if (formData.id) {
            try {
              await miniappsApi.verifyDomain({
                id: formData.id,
                productionUrl: targetUrl.trim(),
                clientVerified: true,
                allowedDomains: clientVerified.allowedDomains,
                permissions: clientVerified.permissions,
              });
            } catch (_) {}
          }
          setDomainVerificationSuccess(true);
          setVerifiedUrl(targetUrl.trim());
          setDomainVerificationMsg(clientVerified.message);
          setDomainVerificationMsgType('success');
          if (onDomainVerified) {
            onDomainVerified({
              verified: true,
              isDomainVerified: true,
              verificationToken: currentToken,
              allowedDomains: clientVerified.allowedDomains,
              permissions: clientVerified.permissions,
            });
          }
          if (clientVerified.allowedDomains && clientVerified.allowedDomains.length > 0) {
            handleWebViewChange({
              target: { name: 'allowedDomains', value: clientVerified.allowedDomains.join(', ') },
            } as any);
          }
          return;
        } else if (clientVerified.mismatch) {
          setDomainVerificationSuccess(false);
          setVerifiedUrl(null);
          setDomainVerificationMsg(clientVerified.message);
          setDomainVerificationMsgType('error');
          if (onDomainVerified) {
            onDomainVerified({ verified: false, isDomainVerified: false });
          }
          return;
        }
      }

      setDomainVerificationSuccess(false);
      setVerifiedUrl(null);
      setDomainVerificationMsg(backendMsg || 'Domain verification failed.');
      setDomainVerificationMsgType('error');
      if (onDomainVerified) {
        onDomainVerified({
          verified: false,
          isDomainVerified: false,
          validationErrors: (data as any)?.validationErrors,
        });
      }
    } catch (err: any) {
      // If backend API request errored, attempt browser-assisted verification as fallback
      const clientVerified = await verifyDomainViaBrowser(targetUrl.trim(), currentAppId, currentToken);
      if (clientVerified.success) {
        if (formData.id) {
          try {
            await miniappsApi.verifyDomain({
              id: formData.id,
              productionUrl: targetUrl.trim(),
              clientVerified: true,
              allowedDomains: clientVerified.allowedDomains,
              permissions: clientVerified.permissions,
            });
          } catch (_) {}
        }
        setDomainVerificationSuccess(true);
        setVerifiedUrl(targetUrl.trim());
        setDomainVerificationMsg(clientVerified.message);
        setDomainVerificationMsgType('success');
        if (onDomainVerified) {
          onDomainVerified({
            verified: true,
            isDomainVerified: true,
            verificationToken: currentToken,
            allowedDomains: clientVerified.allowedDomains,
            permissions: clientVerified.permissions,
          });
        }
        if (clientVerified.allowedDomains && clientVerified.allowedDomains.length > 0) {
          handleWebViewChange({
            target: { name: 'allowedDomains', value: clientVerified.allowedDomains.join(', ') },
          } as any);
        }
        return;
      }

      setDomainVerificationSuccess(false);
      setVerifiedUrl(null);
      setDomainVerificationMsg(clientVerified.mismatch ? clientVerified.message : (err.message || 'Failed to connect to verification service.'));
      setDomainVerificationMsgType('error');
      if (onDomainVerified) {
        onDomainVerified({ verified: false, isDomainVerified: false });
      }
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const prodUrlInput = (formData.integrationConfigWebView?.productionUrl || '').trim();
  const isVerified =
    domainVerificationSuccess === true ||
    Boolean(
      formData.isDomainVerified &&
        domainVerificationSuccess !== false &&
        verifiedUrl &&
        verifiedUrl.trim() === prodUrlInput,
    );

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
        if (data.reachable) {
          prodUrlCacheRef.current.set(prodUrl, { reachable: true, timestamp: Date.now() });
          setProdUrlValidation({
            status: 'valid',
            message: 'URL format valid & server is online',
          });
          return;
        }
      } catch {
        // Backend check failed, fall through to browser test
      }

      // Browser reachability test fallback when backend has restricted network egress
      try {
        await fetch(prodUrl, { method: 'HEAD', mode: 'no-cors' });
        prodUrlCacheRef.current.set(prodUrl, { reachable: true, timestamp: Date.now() });
        setProdUrlValidation({
          status: 'valid',
          message: 'Server is online.',
        });
      } catch {
        if (isVerified) {
          prodUrlCacheRef.current.set(prodUrl, { reachable: true, timestamp: Date.now() });
          setProdUrlValidation({
            status: 'valid',
            message: 'Domain ownership verified & server configured.',
          });
        } else {
          prodUrlCacheRef.current.set(prodUrl, { reachable: false, timestamp: Date.now() });
          setProdUrlValidation({
            status: 'unreachable',
            message: 'Can’t reach the server right now. You can still continue once the domain is verified.',
          });
        }
      }
    }, 250);

    return () => {
      if (prodUrlDebounceRef.current) {
        clearTimeout(prodUrlDebounceRef.current);
      }
    };
  }, [formData.integrationConfigWebView?.productionUrl, isVerified]);

  // ---------- view model ----------
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
    prodUrlValidation.status === 'invalid' ||
    (prodUrlValidation.status === 'idle' && Boolean(allErrors['integrationConfigWebView.productionUrl']))
      ? 'text-rose-600 dark:text-rose-400'
      : prodUrlValidation.status === 'unreachable'
        ? 'text-amber-600 dark:text-amber-400'
        : prodUrlValidation.status === 'valid'
          ? 'text-emerald-600 dark:text-emerald-400'
          : prodUrlValidation.status === 'checking'
            ? 'text-sky-600 dark:text-sky-400'
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
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Verify domain ownership
            </h3>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckIcon className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Required for Live
              </span>
            )}
          </div>
          <a
            href="/guidelines?method=webview#domain-verification"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            Guidelines Guide &rarr;
          </a>
        </header>

        {/* Prominent Verification Token Card */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            {isEditingCustomToken ? (
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Custom Challenge Token (from Settings or pre-deployed project)
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    value={token}
                    onChange={(e) => {
                      if (handleWebViewChange) {
                        handleWebViewChange({
                          target: { name: 'verificationToken', value: e.target.value.trim() },
                        } as any);
                      }
                    }}
                    placeholder="e.g. tok_live_..."
                    className="h-8 font-mono text-xs max-w-md"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingCustomToken(false)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shrink-0"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                  Verification Challenge Token
                </span>
                <code className="text-xs sm:text-sm font-mono font-bold text-brand-600 dark:text-brand-400 break-all select-all">
                  {token}
                </code>
              </div>
            )}
            {!isEditingCustomToken && (
              <div className="flex items-center gap-2 shrink-0">
                {isEditable && (
                  <>
                    {typeof window !== 'undefined' && localStorage.getItem('superapp_preverification_token') && (
                      <button
                        type="button"
                        onClick={() => {
                          const saved = localStorage.getItem('superapp_preverification_token');
                          if (saved && handleWebViewChange) {
                            handleWebViewChange({
                              target: { name: 'verificationToken', value: saved },
                            } as any);
                            toast.success('Pasted verification token from Settings.');
                          }
                        }}
                        className={smallBtn}
                        title="Use token pre-generated in Settings"
                      >
                        Paste from Settings
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingCustomToken(true)}
                      className={smallBtn}
                      title="Paste or enter a custom token"
                    >
                      Edit Token
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateToken}
                      className={smallBtn}
                      title="Generate a fresh token"
                    >
                      New token
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => copy(token, setCopiedToken)}
                  className="h-8 px-3 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copiedToken ? 'Copied!' : 'Copy Token'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Verification Method Tabs */}
        <div className="p-4 space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Choose your verification method:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVerificationTab('dns')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  verificationTab === 'dns'
                    ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-950/60 dark:border-brand-400 dark:text-brand-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Method A: DNS TXT Record (No Redeploy)
              </button>
              <button
                type="button"
                onClick={() => setVerificationTab('meta')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  verificationTab === 'meta'
                    ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-950/60 dark:border-brand-400 dark:text-brand-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Method B: HTML Meta Tag
              </button>
              <button
                type="button"
                onClick={() => setVerificationTab('json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  verificationTab === 'json'
                    ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-950/60 dark:border-brand-400 dark:text-brand-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                Method C: Association File (.well-known)
              </button>
            </div>
          </div>

          {/* Tab 1: DNS TXT Record */}
          {verificationTab === 'dns' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Add a DNS TXT record to your domain. Works immediately without modifying code or redeploying.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">Record Type / Host</span>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs truncate">
                      {`_superapp-challenge.${host || 'yourdomain.com'}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(`_superapp-challenge.${host || 'yourdomain.com'}`, setCopiedDnsHost)}
                      className={smallBtn}
                    >
                      {copiedDnsHost ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500">TXT Value</span>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 p-2 rounded-lg bg-slate-900 text-brand-300 font-mono text-xs truncate">
                      {`superapp-site-verification=${token}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(`superapp-site-verification=${token}`, setCopiedDnsVal)}
                      className={smallBtn}
                    >
                      {copiedDnsVal ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: HTML Meta Tag */}
          {verificationTab === 'meta' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Add this meta tag inside the <code className="font-mono text-brand-600">&lt;head&gt;</code> of your app's homepage (<code className="font-mono">index.html</code> or <code className="font-mono">layout.tsx</code>):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2.5 rounded-lg bg-slate-900 text-brand-300 font-mono text-xs overflow-x-auto">
                  {`<meta name="superapp-site-verification" content="${token}" />`}
                </code>
                <button
                  type="button"
                  onClick={() => copy(`<meta name="superapp-site-verification" content="${token}" />`, setCopiedMeta)}
                  className={smallBtn}
                >
                  {copiedMeta ? 'Copied' : 'Copy Tag'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Association JSON File */}
          {verificationTab === 'json' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Publish a static JSON file returning <code className="font-mono text-brand-600">200 OK</code> with <code className="font-mono">application/json</code>:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs truncate">
                  {fileUrl}
                </code>
                <button type="button" onClick={() => copy(fileUrl, setCopiedPath)} className={smallBtn}>
                  {copiedPath ? 'Copied' : 'Copy URL'}
                </button>
                <button type="button" onClick={() => copy(manifest, setCopiedJson)} className={smallBtn}>
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200">
                {manifest}
              </pre>
            </div>
          )}

          {/* Trigger Verification Action */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleVerifyDomain}
                disabled={isVerifyingDomain || !isEditable || !prodUrlInput}
                className={`h-9 px-4 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                  isVerifyingDomain || !isEditable || !prodUrlInput
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/25 cursor-pointer'
                }`}
              >
                {isVerifyingDomain ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Verifying domain...</span>
                  </>
                ) : isVerified ? (
                  'Re-verify domain'
                ) : (
                  'Verify domain now'
                )}
              </button>
              {isVerified && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckIcon className="w-3.5 h-3.5" />
                  {host} is verified
                </span>
              )}
            </div>

            {verifyError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium w-full mt-1">
                {verifyError}
              </p>
            )}
            {isVerified && domainVerificationMsgType === 'success' && domainVerificationMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium w-full mt-1">
                {domainVerificationMsg}
              </p>
            )}
            {!isVerified && domainVerificationMsgType === 'info' && domainVerificationMsg && (
              <p className="text-xs text-sky-600 dark:text-sky-400 font-medium w-full mt-1">
                {domainVerificationMsg}
              </p>
            )}
          </div>
        </div>
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
