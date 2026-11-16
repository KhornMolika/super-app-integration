'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { miniappsApi } from '@/api/miniapps.api';
import { toast } from '@/components/ui/Toast';
import { copyText } from '@/lib/clipboard';
import { CheckIcon, GlobeIcon, TagIcon, HashIcon, FolderIcon } from '@/components/ui/Icons';
import { generateClientVerificationToken } from '@/lib/integration-utils';

export function DomainTokenGeneratorCard() {
  const [domainInput, setDomainInput] = useState('');
  const [appIdInput, setAppIdInput] = useState('');
  const [environment, setEnvironment] = useState<'DEV' | 'PROD'>('PROD');
  const [token, setToken] = useState<string>(() => generateClientVerificationToken());
  const [activeTab, setActiveTab] = useState<'dns' | 'meta' | 'json'>('dns');

  // Copy states
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedDnsHost, setCopiedDnsHost] = useState(false);
  const [copiedDnsVal, setCopiedDnsVal] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Live pre-flight verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Normalize host
  const rawInput = domainInput.trim();
  const host = (() => {
    if (!rawInput) return 'yourdomain.com';
    try {
      if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
        return new URL(rawInput).hostname;
      }
      return rawInput.split(/[:/]/)[0];
    } catch {
      return rawInput.replace(/^https?:\/\//, '').split(/[:/]/)[0] || 'yourdomain.com';
    }
  })();

  const normalizedUrl = (() => {
    if (!rawInput) return `https://${host}`;
    if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
      return rawInput;
    }
    return `https://${rawInput}`;
  })();

  const currentAppId = appIdInput.trim() || 'miniapp_sample_id';

  const manifest = JSON.stringify(
    {
      appId: currentAppId,
      verificationToken: token,
      environment,
      allowedDomains: [host],
      permissions: ['Camera', 'Location', 'Biometrics'],
    },
    null,
    2
  );

  const fileUrl = `${normalizedUrl}/.well-known/superapp-miniapp-association.json`;

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateNewToken = async () => {
    let newToken = generateClientVerificationToken();
    try {
      const res = await miniappsApi.generateToken();
      if (res && res.token) newToken = res.token;
    } catch {
      // client fallback already generated
    }
    setToken(newToken);
    setVerifyResult(null);
    toast.success('Generated fresh domain challenge token.');
  };

  const handleDownloadJson = () => {
    const blob = new Blob([manifest], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'superapp-miniapp-association.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded superapp-miniapp-association.json');
  };

  const handlePreflightCheck = async () => {
    if (!domainInput.trim()) {
      toast.error('Please enter a target domain or production URL first.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerifyResult(null);

      const res = await miniappsApi.verifyDomain({
        productionUrl: normalizedUrl,
        appId: currentAppId,
        verificationToken: token,
      });

      if (res && res.verified) {
        setVerifyResult({
          success: true,
          message: (res as any).message || 'Domain successfully pre-verified! Your deployment is ready for registration.',
        });
        toast.success('Domain ownership confirmed!');
      } else {
        setVerifyResult({
          success: false,
          message: (res as any)?.message || 'Domain verification check failed. Ensure DNS TXT, Meta Tag, or JSON file is live.',
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || 'Could not connect to domain or verification service.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 space-y-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">
            <GlobeIcon className="w-3.5 h-3.5" />
            <span>Developer Pre-Flight Tools</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Domain Pre-Verification Tool
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Generate and configure domain ownership tokens during local development <strong>before deploying</strong> your WebView MiniApp.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleGenerateNewToken}
            className="h-8 px-3 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            Generate New Token
          </button>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="pre-domain" className="text-xs font-semibold">
            Target Domain / Production URL <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="pre-domain"
            value={domainInput}
            onChange={(e) => {
              setDomainInput(e.target.value);
              setVerifyResult(null);
            }}
            placeholder="e.g. insurance.example.com or https://my-app.vercel.app"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pre-appid" className="text-xs font-semibold">
            App ID / Package Slug <span className="text-slate-400 text-[11px]">(Optional)</span>
          </Label>
          <Input
            id="pre-appid"
            value={appIdInput}
            onChange={(e) => {
              setAppIdInput(e.target.value);
              setVerifyResult(null);
            }}
            placeholder="e.g. insurance-portal"
            className="text-sm font-mono"
          />
        </div>
      </div>

      {/* Challenge Token Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
            Active Challenge Token
          </span>
          <code className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-slate-100 break-all select-all">
            {token}
          </code>
        </div>
        <button
          type="button"
          onClick={() => copy(token, setCopiedToken)}
          className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shrink-0 shadow-xs transition-colors cursor-pointer"
        >
          {copiedToken ? 'Copied Token!' : 'Copy Token'}
        </button>
      </div>

      {/* Method Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Verification Method:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('dns')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeTab === 'dns'
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Method A: DNS TXT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('meta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeTab === 'meta'
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Method B: HTML &lt;meta&gt; Tag
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Method C: Association JSON
            </button>
          </div>
        </div>

        {/* Tab A: DNS TXT Record */}
        {activeTab === 'dns' && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Add a DNS TXT record in your DNS provider (Cloudflare, Route53, GoDaddy, Vercel). <strong>Requires zero code changes or redeployments.</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Record Name / Host</span>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] truncate">
                    {`_superapp-challenge.${host}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(`_superapp-challenge.${host}`, setCopiedDnsHost)}
                    className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {copiedDnsHost ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500">TXT Record Value</span>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 p-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] truncate">
                    {`superapp-site-verification=${token}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(`superapp-site-verification=${token}`, setCopiedDnsVal)}
                    className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {copiedDnsVal ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab B: HTML Meta Tag */}
        {activeTab === 'meta' && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Place this tag inside the <code className="font-mono text-emerald-600 dark:text-emerald-400">&lt;head&gt;</code> of your app's root page (<code className="font-mono">index.html</code> or <code className="font-mono">app/layout.tsx</code>):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
                {`<meta name="superapp-site-verification" content="${token}" />`}
              </code>
              <button
                type="button"
                onClick={() => copy(`<meta name="superapp-site-verification" content="${token}" />`, setCopiedMeta)}
                className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
              >
                {copiedMeta ? 'Copied!' : 'Copy Tag'}
              </button>
            </div>
          </div>
        )}

        {/* Tab C: Association JSON File */}
        {activeTab === 'json' && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Place this file in <code className="font-mono text-emerald-600 dark:text-emerald-400">public/.well-known/superapp-miniapp-association.json</code> so it serves over HTTPS:
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-sm">
                {fileUrl}
              </code>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copy(manifest, setCopiedJson)}
                  className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {copiedJson ? 'Copied JSON' : 'Copy JSON'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="h-8 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-xs transition-colors cursor-pointer"
                >
                  Download .json File
                </button>
              </div>
            </div>
            <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200">
              {manifest}
            </pre>
          </div>
        )}
      </div>

      {/* Pre-flight Live Verification Test */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
            Test Live Verification
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Confirm your DNS TXT, Meta Tag, or JSON file is live and reachable before app registration.
          </span>
        </div>

        <button
          type="button"
          onClick={handlePreflightCheck}
          disabled={isVerifying || !domainInput.trim()}
          className={`h-10 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
            !domainInput.trim() || isVerifying
              ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/25 cursor-pointer'
          }`}
        >
          {isVerifying ? (
            <>
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Checking Live Domain...</span>
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              <span>Test Verification Now</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Feedback Banner */}
      {verifyResult && (
        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
            verifyResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {verifyResult.success ? (
            <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              !
            </span>
          )}
          <div>
            <strong className="font-bold block mb-0.5">
              {verifyResult.success ? 'Verification Confirmed' : 'Verification Incomplete'}
            </strong>
            <p>{verifyResult.message}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default DomainTokenGeneratorCard;
