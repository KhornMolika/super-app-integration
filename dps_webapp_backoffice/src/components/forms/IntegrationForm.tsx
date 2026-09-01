"use client";

import { useEffect, useRef, useState } from 'react';
import { Button, Input, Label, Select } from '@/components/ui/inputs';
import { IntegrationMethod, SourceType } from '@/types/miniapp.types';

export const validateProductionUrlFormat = (url: string) => {
  if (!url || !url.trim()) {
    return { valid: false, error: 'Production URL is required.' };
  }
  const trimmed = url.trim();

  // Whitespace check
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'URL must not contain whitespace.' };
  }

  // Protocol check
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' || process.env.NEXT_PUBLIC_ALLOW_LOCAL_PROD_URLS === 'true' || process.env.NODE_ENV !== 'production';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  if (!isDev && trimmed.startsWith('http://')) {
    return { valid: false, error: 'Production URL strictly requires HTTPS in production mode.' };
  }

  // Check for IPv4 out-of-range octets (e.g. 172.20.684.1)
  const hostMatch = trimmed.match(/^https?:\/\/([^/:]+)/);
  if (hostMatch) {
    const hostCandidate = hostMatch[1];
    const octets = hostCandidate.split('.');
    if (octets.length === 4 && octets.every(o => /^\d+$/.test(o))) {
      const invalidOctet = octets.find(o => Number(o) < 0 || Number(o) > 255);
      if (invalidOctet !== undefined) {
        return { valid: false, error: `Invalid IPv4 address: octet "${invalidOctet}" exceeds maximum range (0-255).` };
      }
    }
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.port) {
      const portNum = Number(parsed.port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return { valid: false, error: `Port "${parsed.port}" is invalid (must be between 1 and 65535).` };
      }
    }

    if (!isDev) {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return { valid: false, error: 'Localhost is not allowed in production.' };
      }
      if (!parsed.hostname.includes('.')) {
        return { valid: false, error: 'Production URL must be a fully qualified domain (e.g. https://app.example.com).' };
      }
    }

    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Invalid URL syntax. Please enter a valid URL.' };
  }
};

export const generateClientVerificationToken = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return 'tok_live_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'tok_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function IntegrationForm({
  formData,
  handleChange,
  allErrors = {},
  handleWebViewChange,
  handleFlutterChange,
  handleDeepLinkChange,
  onDomainVerified,
}: any) {
  const flutterConfig = formData.integrationConfigFlutter || {};
  const deepLinkConfig = formData.integrationConfigDeepLink || {};

  // State for Production URL Real-Time Validation
  const [prodUrlValidation, setProdUrlValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'unreachable';
    message: string | null;
  }>({ status: 'idle', message: null });
  const prodUrlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const prodUrlCacheRef = useRef<Map<string, { reachable: boolean; timestamp: number }>>(new Map());

  // State for Git Real-Time Validation
  const [detectedProvider, setDetectedProvider] = useState<'github' | 'gitlab' | null>(null);
  const [isGitValidating, setIsGitValidating] = useState(false);
  const [gitValidationResult, setGitValidationResult] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedRefType, setSelectedRefType] = useState<'tag' | 'branch' | 'commit'>('tag');
  const [selectedRef, setSelectedRef] = useState<string>('');

  // State for Nexus Real-Time Validation
  const [isNexusValidating, setIsNexusValidating] = useState(false);
  const [nexusValidationResult, setNexusValidationResult] = useState<any>(null);

  // Snippet and copy state
  const [generatedSnippet, setGeneratedSnippet] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // State for Domain Ownership Verification
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerificationMsg, setDomainVerificationMsg] = useState<string | null>(null);
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
        });
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
      });
    }

    setDomainVerificationSuccess(false);
    setVerifiedUrl(null);
    setDomainVerificationMsg('New verification token generated. Please update your association file and verify domain.');
    if (onDomainVerified) {
      onDomainVerified({ verified: false, isDomainVerified: false, verificationToken: newToken });
    }
  };

  const onWebViewInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'productionUrl') {
      const newVal = e.target.value;
      if (verifiedUrl && newVal !== verifiedUrl) {
        setDomainVerificationSuccess(false);
        setDomainVerificationMsg(null);
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
        });
      }
    }

    const currentAppId = formData.appId || 'com.fsa.banking';

    setIsVerifyingDomain(true);
    setDomainVerificationMsg(null);
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
          });
        }
      } else {
        setDomainVerificationSuccess(false);
        setVerifiedUrl(null);
        setDomainVerificationMsg(data.message || 'Domain verification failed.');
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
      if (onDomainVerified) {
        onDomainVerified({ verified: false, isDomainVerified: false });
      }
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  // Debounce timers
  const gitDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nexusDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect deep monorepo URLs and extract path/ref
  const handleGitUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    let cleanUrl = rawVal;
    let extractedPath = '';
    let extractedRef = '';

    // Check for GitHub tree URL: https://github.com/owner/repo/tree/branch/subpath...
    const ghTreeMatch = rawVal.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)(?:\/(.*))?$/);
    if (ghTreeMatch) {
      const owner = ghTreeMatch[1];
      const repo = ghTreeMatch[2].replace(/\.git$/, '');
      extractedRef = ghTreeMatch[3];
      extractedPath = ghTreeMatch[4] || '';
      cleanUrl = `https://github.com/${owner}/${repo}`;
    }

    // Check for GitLab tree URL: https://gitlab.com/group/repo/-/tree/branch/subpath...
    const glTreeMatch = rawVal.match(/^https?:\/\/([^/]+)\/(.+?)\/-\/(?:tree|blob)\/([^/]+)(?:\/(.*))?$/);
    if (glTreeMatch) {
      const host = glTreeMatch[1];
      const project = glTreeMatch[2].replace(/\.git$/, '');
      extractedRef = glTreeMatch[3];
      extractedPath = glTreeMatch[4] || '';
      cleanUrl = `https://${host}/${project}`;
    }

    if (extractedPath) {
      handleFlutterChange({
        target: { name: 'gitPath', value: extractedPath },
      });
    }

    if (extractedRef) {
      setSelectedRef(extractedRef);
      setSelectedRefType('branch');
      handleFlutterChange({
        target: { name: 'gitBranch', value: extractedRef },
      });
    }

    handleFlutterChange({
      target: { name: 'gitUrl', value: cleanUrl },
    });
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

  // 1. Real-time Git URL Validation with Debounce (600ms)
  useEffect(() => {
    const url = flutterConfig.gitUrl?.trim() || '';
    const path = (flutterConfig.gitPath || flutterConfig.path || '').trim();

    if (!url) {
      setDetectedProvider(null);
      setGitValidationResult(null);
      setTags([]);
      setBranches([]);
      return;
    }

    // Instant detection of provider badge
    const lower = url.toLowerCase();
    if (lower.includes('gitlab')) {
      setDetectedProvider('gitlab');
    } else if (lower.includes('github') || lower.split('/').length === 2) {
      setDetectedProvider('github');
    } else {
      setDetectedProvider(null);
    }

    // Cancel previous debounce
    if (gitDebounceRef.current) {
      clearTimeout(gitDebounceRef.current);
    }

    // Trigger real-time validation if URL looks like a complete path or URL
    if (url.length > 3 && (url.includes('/') || url.startsWith('http') || url.startsWith('git@'))) {
      setIsGitValidating(true);
      gitDebounceRef.current = setTimeout(async () => {
        try {
          const valRes = await fetch('/api/integrations/git/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              ref: selectedRef || flutterConfig.gitBranch || undefined,
              token: flutterConfig.gitAccessToken || undefined,
              path: path || undefined,
            }),
          });

          const valData = await valRes.json();
          setGitValidationResult(valData.validation || valData);

          if (valData.provider) {
            setDetectedProvider(valData.provider);
          }

          if (valData.validation?.packageName && !flutterConfig.packageName) {
            handleFlutterChange({
              target: { name: 'packageName', value: valData.validation.packageName },
            });
          }

          // Fetch tags in background
          try {
            const tagsRes = await fetch('/api/integrations/git/tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url,
                token: flutterConfig.gitAccessToken || undefined,
              }),
            });
            const tagsData = await tagsRes.json();
            if (tagsData.tags && Array.isArray(tagsData.tags)) {
              setTags(tagsData.tags);
              if (tagsData.tags.length > 0 && !selectedRef && !flutterConfig.gitBranch) {
                setSelectedRef(tagsData.tags[0]);
              }
            }
          } catch {
            // ignore
          }

          // Fetch branches in background
          try {
            const branchesRes = await fetch('/api/integrations/git/branches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url,
                token: flutterConfig.gitAccessToken || undefined,
              }),
            });
            const branchesData = await branchesRes.json();
            if (branchesData.branches && Array.isArray(branchesData.branches)) {
              setBranches(branchesData.branches);
            }
          } catch {
            // ignore
          }
        } catch (err: any) {
          setGitValidationResult({
            isValid: false,
            error: err.message || 'Real-time validation error.',
          });
        } finally {
          setIsGitValidating(false);
        }
      }, 600);
    } else {
      setIsGitValidating(false);
    }

    return () => {
      if (gitDebounceRef.current) clearTimeout(gitDebounceRef.current);
    };
  }, [flutterConfig.gitUrl, flutterConfig.gitPath, flutterConfig.path, flutterConfig.gitAccessToken, selectedRef]);

  // 2. Real-time Nexus Package Validation with Debounce (500ms)
  useEffect(() => {
    const pkg = flutterConfig.packageName?.trim() || '';

    if (!pkg || flutterConfig.sourceType !== SourceType.ARTIFACT) {
      setNexusValidationResult(null);
      setIsNexusValidating(false);
      return;
    }

    if (nexusDebounceRef.current) {
      clearTimeout(nexusDebounceRef.current);
    }

    setIsNexusValidating(true);
    nexusDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/integrations/nexus/packages/${encodeURIComponent(pkg)}`);
        const data = await res.json();
        setNexusValidationResult(data);

        // If latest version found and no versionConstraint entered, set default ^latest
        if (data.exists && data.latestVersion && !flutterConfig.versionConstraint) {
          handleFlutterChange({
            target: { name: 'versionConstraint', value: `^${data.latestVersion}` },
          });
        }
      } catch (err: any) {
        setNexusValidationResult({
          isValid: false,
          exists: false,
          error: 'Could not connect to Nexus registry.',
        });
      } finally {
        setIsNexusValidating(false);
      }
    }, 500);

    return () => {
      if (nexusDebounceRef.current) clearTimeout(nexusDebounceRef.current);
    };
  }, [flutterConfig.packageName, flutterConfig.sourceType]);

  // 3. Real-Time Generated Snippet Preview
  useEffect(() => {
    if (formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE) {
      if (flutterConfig.sourceType === SourceType.GIT) {
        if (flutterConfig.gitUrl) {
          const pkgName =
            gitValidationResult?.packageName || flutterConfig.packageName || 'payment_miniapp';
          const ref = selectedRef || flutterConfig.gitBranch || 'main';
          const path = (flutterConfig.gitPath || flutterConfig.path || '').trim();

          let s = `dependencies:\n  ${pkgName}:\n    git:\n      url: ${flutterConfig.gitUrl}`;
          if (ref) {
            s += `\n      ref: ${ref}`;
          }
          if (path) {
            s += `\n      path: ${path}`;
          }
          setGeneratedSnippet(s);
        } else {
          setGeneratedSnippet('');
        }
      } else if (flutterConfig.sourceType === SourceType.ARTIFACT) {
        const pkgName = flutterConfig.packageName || 'dps_core_package';
        const ver = flutterConfig.versionConstraint || '^1.0.0';
        setGeneratedSnippet(
          `dependencies:\n  ${pkgName}:\n    hosted: http://localhost:8081/repository/pub-group\n    version: ${ver}`
        );
      }
    }
  }, [formData.integrationMethod, flutterConfig, selectedRef, gitValidationResult]);

  const copyToClipboard = () => {
    if (generatedSnippet) {
      navigator.clipboard.writeText(generatedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Label>Integration Method</Label>
        <Select name="integrationMethod" value={formData.integrationMethod} onChange={handleChange}>
          <option value={IntegrationMethod.WEBVIEW}>WebView (Web App)</option>
          <option value={IntegrationMethod.FLUTTER_PACKAGE}>Flutter Package (Super App)</option>
          <option value={IntegrationMethod.DEEP_LINK}>Deep Link (External App / App Links)</option>
          <option value={IntegrationMethod.NATIVE_SDK} disabled>Native SDK (Coming Soon)</option>
        </Select>
      </div>

      {formData.integrationMethod === IntegrationMethod.DEEP_LINK && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label>URL Scheme / Deep Link URI <span className="text-rose-500">*</span></Label>
              <span className="text-xs text-slate-400 font-mono">e.g. trustregulator:// or myapp://open</span>
            </div>
            <Input
              name="urlScheme"
              value={deepLinkConfig?.urlScheme || ''}
              onChange={handleDeepLinkChange}
              placeholder="trustregulator://open"
              className={
                allErrors['integrationConfigDeepLink.urlScheme']
                  ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50'
                  : ''
              }
            />
            {allErrors['integrationConfigDeepLink.urlScheme'] && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {allErrors['integrationConfigDeepLink.urlScheme']}
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              The custom URI scheme or universal app link invoked by the Super App to launch this Mini App externally.
            </p>
          </div>

          <div>
            <Label>Package Name / Bundle ID (Optional)</Label>
            <Input
              name="packageName"
              value={deepLinkConfig?.packageName || ''}
              onChange={handleDeepLinkChange}
              placeholder="com.fsa.trustregulator"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Android package name or iOS bundle ID for native app installation checks.
            </p>
          </div>

          <div>
            <Label>App Store / Play Store Fallback URL (Optional)</Label>
            <Input
              name="appStoreUrl"
              value={deepLinkConfig?.appStoreUrl || ''}
              onChange={handleDeepLinkChange}
              type="url"
              placeholder="https://play.google.com/store/apps/details?id=..."
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Web store redirect URL if the target app is not installed on the user&apos;s device.
            </p>
          </div>
        </div>
      )}

      {formData.integrationMethod === IntegrationMethod.WEBVIEW && (
        <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Production URL <span className="text-rose-500">*</span></Label>
                {prodUrlValidation.status !== 'idle' && (
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${
                    prodUrlValidation.status === 'valid'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : prodUrlValidation.status === 'checking'
                      ? 'text-sky-600 dark:text-sky-400'
                      : prodUrlValidation.status === 'unreachable'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {prodUrlValidation.status === 'checking' && (
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {prodUrlValidation.status === 'valid' && '✓ Reachable'}
                    {prodUrlValidation.status === 'unreachable' && '⚠ Unreachable'}
                    {prodUrlValidation.status === 'invalid' && '✕ Format Error'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  name="productionUrl"
                  value={formData.integrationConfigWebView?.productionUrl || ''}
                  onChange={onWebViewInputChange}
                  type="url"
                  placeholder="https://banking.example.com/app"
                  className={`pr-8 ${
                    prodUrlValidation.status === 'invalid' || allErrors['integrationConfigWebView.productionUrl']
                      ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
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
                <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                  <span>✕</span> {prodUrlValidation.message}
                </p>
              )}
              {prodUrlValidation.status === 'unreachable' && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <span>⚠</span> {prodUrlValidation.message}
                </p>
              )}
              {prodUrlValidation.status === 'valid' && (
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span>✓</span> {prodUrlValidation.message}
                </p>
              )}
              {prodUrlValidation.status === 'idle' && allErrors['integrationConfigWebView.productionUrl'] && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">
                  {allErrors['integrationConfigWebView.productionUrl']}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Primary HTTPS endpoint loaded by the Super App WebView container.
              </p>
            </div>

            <div>
              <Label>Staging / Test URL (Optional)</Label>
              <Input
                name="stagingUrl"
                value={formData.integrationConfigWebView?.stagingUrl || ''}
                onChange={handleWebViewChange}
                type="url"
                placeholder="https://staging-banking.example.com/app"
              />
              <p className="mt-1 text-xs text-slate-500">
                Secondary endpoint used during internal test builds and staging.
              </p>
            </div>
          </div>

          <div>
            <Label>Allowed Navigation Domains (Whitelist)</Label>
            <Input
              name="allowedDomains"
              value={
                Array.isArray(formData.integrationConfigWebView?.allowedDomains)
                  ? formData.integrationConfigWebView.allowedDomains.join(', ')
                  : (formData.integrationConfigWebView?.allowedDomains || '')
              }
              onChange={handleWebViewChange}
              placeholder="banking.example.com, api.banking.example.com, auth.example.com"
            />
            {allErrors['integrationConfigWebView.allowedDomains'] && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {allErrors['integrationConfigWebView.allowedDomains']}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Comma-separated list of external domains the WebView is permitted to navigate to or invoke via bridge.
            </p>
          </div>

          {/* Domain Ownership Verification Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Domain Ownership Verification</span>
                  {(() => {
                    const currentProdUrl = (formData.integrationConfigWebView?.productionUrl || '').trim();
                    const isActuallyVerified =
                      domainVerificationSuccess === true ||
                      (formData.isDomainVerified &&
                        domainVerificationSuccess !== false &&
                        Boolean(verifiedUrl) &&
                        verifiedUrl!.trim() === currentProdUrl);

                    return isActuallyVerified ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Pending Verification
                      </span>
                    );
                  })()}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Prove administrative control of the target domain by hosting the public association file.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleVerifyDomain}
                disabled={isVerifyingDomain}
                className="text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                {isVerifyingDomain && (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                <span>{isVerifyingDomain ? 'Verifying...' : 'Verify Domain'}</span>
              </Button>
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
                if (isActuallyVerified && domainVerificationSuccess === true) {
                  return (
                    <div className="p-3 mb-4 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{domainVerificationMsg}</span>
                    </div>
                  );
                }

                return (
                  <div className="p-3 mb-4 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{domainVerificationMsg}</span>
                  </div>
                );
              }

              if (!isActuallyVerified && allErrors['integrationConfigWebView.domainVerification']) {
                return (
                  <p className="mb-3 text-xs text-rose-600 font-medium flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {allErrors['integrationConfigWebView.domainVerification']}
                  </p>
                );
              }

              return null;
            })()}

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-2 font-mono">
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

                // Parse user-specified allowed domains
                const rawAllowed = formData.integrationConfigWebView?.allowedDomains;
                let userAllowedDomains: string[] = [];
                if (Array.isArray(rawAllowed)) {
                  userAllowedDomains = rawAllowed.map((d: any) => String(d).trim()).filter(Boolean);
                } else if (typeof rawAllowed === 'string') {
                  userAllowedDomains = rawAllowed
                    .split(',')
                    .map((d: string) => d.trim())
                    .filter(Boolean);
                }

                // Fallback to productionUrl hostname if empty
                if (userAllowedDomains.length === 0 && currentHost && currentHost !== 'domain.com') {
                  userAllowedDomains = [currentHost];
                } else if (userAllowedDomains.length === 0) {
                  userAllowedDomains = ['domain.com'];
                }

                const dynamicEnv =
                  formData.environment ||
                  (process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' ? 'DEV' : 'PRODUCTION');

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
                  appId: formData.appId || 'com.fsa.appname',
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
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400">Expected Host:</span>
                          <span className="text-sky-300 font-semibold">
                            {currentHost}
                          </span>
                          {userAllowedDomains.length > 0 && (
                            <span className="text-slate-500 text-[11px]">
                              (Allowed: {userAllowedDomains.join(', ')})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 flex-wrap">
                          <span>Endpoint:</span>
                          <span className="text-emerald-400/90 font-mono">
                            {currentOrigin}/.well-known/superapp-miniapp-association.json
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={handleGenerateToken}
                          className="px-2.5 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-indigo-200 border border-indigo-700/60 font-sans text-xs transition flex items-center gap-1.5"
                          title="Generate a new cryptographic verification token"
                        >
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Generate Token</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const token = dynamicPayload.verificationToken;
                            navigator.clipboard.writeText(token);
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-sans text-xs transition"
                        >
                          {copiedToken ? '✓ Copied Token' : 'Copy Token'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(dynamicJsonString);
                            setCopiedJson(true);
                            setTimeout(() => setCopiedJson(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-sans text-xs transition"
                        >
                          {copiedJson ? '✓ Copied JSON' : 'Copy JSON'}
                        </button>
                      </div>
                    </div>
                    <pre className="text-emerald-400 whitespace-pre-wrap overflow-x-auto text-[11px] leading-relaxed">
                      {dynamicJsonString}
                    </pre>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
        <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <Label>Package Integration Mode</Label>
            <Select
              name="sourceType"
              value={flutterConfig?.sourceType}
              onChange={handleFlutterChange}
            >
              <option value={SourceType.ARTIFACT}>Package Artifact (Nexus Private Pub Registry)</option>
              <option value={SourceType.GIT}>Source Code (GitHub / GitLab Repository)</option>
            </Select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {flutterConfig?.sourceType === SourceType.ARTIFACT
                ? 'Consumes versioned package artifacts hosted on Sonatype Nexus private registry.'
                : 'Integrates source code directly from a Git repository or monorepo subfolder using branch, tag, or commit SHA.'}
            </p>
          </div>

          {flutterConfig?.sourceType === SourceType.ARTIFACT ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Package Name</Label>
                    {isNexusValidating && (
                      <span className="text-xs text-blue-500 animate-pulse">Checking Nexus...</span>
                    )}
                  </div>
                  <Input
                    required
                    name="packageName"
                    value={flutterConfig?.packageName || ''}
                    onChange={handleFlutterChange}
                    placeholder="e.g. dps_core_package"
                    className={
                      nexusValidationResult?.exists === false
                        ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                        : nexusValidationResult?.exists === true
                        ? 'border-emerald-500 ring-1 ring-emerald-500 focus:ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : ''
                    }
                  />
                  {/* Real-time Nexus Package Status */}
                  {nexusValidationResult && !isNexusValidating && (
                    <div className="mt-1.5 text-xs">
                      {nexusValidationResult.exists ? (
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <span>✓</span>
                          <span>Found on Nexus (Latest: {nexusValidationResult.latestVersion || '1.0.0'})</span>
                        </p>
                      ) : (
                        <p className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                          <span>✗</span>
                          <span>Package &quot;{flutterConfig?.packageName}&quot; not found in Nexus pub-group. It must be published before review approval.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Version Constraint</Label>
                  {nexusValidationResult?.versions && nexusValidationResult.versions.length > 0 ? (
                    <div className="flex gap-2">
                      <Input
                        name="versionConstraint"
                        value={flutterConfig?.versionConstraint || ''}
                        onChange={handleFlutterChange}
                        placeholder="e.g. ^1.0.0"
                        className={
                          allErrors['integrationConfigFlutter.versionConstraint']
                            ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50'
                            : ''
                        }
                      />
                      <Select
                        value={flutterConfig?.versionConstraint || ''}
                        onChange={(e: any) =>
                          handleFlutterChange({
                            target: { name: 'versionConstraint', value: `^${e.target.value}` },
                          })
                        }
                        className="w-36 text-xs"
                      >
                        <option value="">Versions ▼</option>
                        {nexusValidationResult.versions.map((v: string) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <Input
                      name="versionConstraint"
                      value={flutterConfig?.versionConstraint || ''}
                      onChange={handleFlutterChange}
                      placeholder="e.g. ^1.0.0"
                      className={
                        allErrors['integrationConfigFlutter.versionConstraint']
                          ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50'
                          : ''
                      }
                    />
                  )}
                  {allErrors['integrationConfigFlutter.versionConstraint'] && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                      {allErrors['integrationConfigFlutter.versionConstraint']}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">Nexus Endpoint:</span> Resolves packages through{' '}
                <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">
                  http://localhost:8081/repository/pub-group
                </code>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Git Repository URL</Label>
                    <div className="flex items-center gap-2">
                      {isGitValidating && (
                        <span className="text-xs text-blue-500 animate-pulse">
                          Validating repository...
                        </span>
                      )}
                      {detectedProvider && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            detectedProvider === 'github'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                          }`}
                        >
                          {detectedProvider === 'github' ? 'GitHub Detected' : 'GitLab Detected'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Input
                    required
                    name="gitUrl"
                    value={flutterConfig?.gitUrl || ''}
                    onChange={handleGitUrlChange}
                    placeholder="https://github.com/org/repo or paste direct subfolder link..."
                    className={
                      gitValidationResult?.isValid === true
                        ? 'border-emerald-500 ring-1 ring-emerald-500'
                        : gitValidationResult?.isValid === false
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : ''
                    }
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Tip: You can paste repository root or direct subfolder links (e.g. <code>.../tree/main/dsp_miniapp_trust_regulator</code>).
                  </p>
                </div>

                {/* Monorepo Subdirectory / Path Field */}
                <div className="col-span-1 md:col-span-2">
                  <Label>Monorepo Subdirectory / Package Path (Optional)</Label>
                  <Input
                    name="gitPath"
                    value={flutterConfig?.gitPath || flutterConfig?.path || ''}
                    onChange={handleFlutterChange}
                    placeholder="e.g. dsp_miniapp_trust_regulator or packages/miniapp"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    If your repository is a monorepo, specify the relative path to the folder containing <code>pubspec.yaml</code>.
                  </p>
                </div>

                <div>
                  <Label>Reference Type</Label>
                  <Select
                    value={selectedRefType}
                    onChange={(e: any) => setSelectedRefType(e.target.value)}
                  >
                    <option value="tag">Tag (Recommended for stable releases)</option>
                    <option value="branch">Branch (Development / Active feature)</option>
                    <option value="commit">Commit SHA (Exact Lock)</option>
                  </Select>
                </div>

                <div>
                  <Label>
                    Reference Value (
                    {selectedRefType === 'tag'
                      ? 'Tag'
                      : selectedRefType === 'branch'
                      ? 'Branch'
                      : 'Commit SHA'}
                    )
                  </Label>
                  {selectedRefType === 'tag' && tags.length > 0 ? (
                    <Select
                      value={selectedRef}
                      onChange={(e: any) => setSelectedRef(e.target.value)}
                    >
                      {tags.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  ) : selectedRefType === 'branch' && branches.length > 0 ? (
                    <Select
                      value={selectedRef}
                      onChange={(e: any) => setSelectedRef(e.target.value)}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={selectedRef}
                      onChange={(e: any) => setSelectedRef(e.target.value)}
                      placeholder={
                        selectedRefType === 'tag'
                          ? 'e.g. v1.0.0'
                          : selectedRefType === 'branch'
                          ? 'e.g. main'
                          : 'e.g. 7f8b9c0d1e2f'
                      }
                    />
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <Label>Personal Access Token (Optional for Private Repositories)</Label>
                  <Input
                    name="gitAccessToken"
                    type="password"
                    value={flutterConfig?.gitAccessToken || ''}
                    onChange={handleFlutterChange}
                    placeholder="Leave empty to use server default credentials"
                  />
                </div>
              </div>

              {/* Real-Time Git Validation Feedback Card */}
              {gitValidationResult && (
                <div
                  className={`p-4 rounded-xl border text-xs transition-all duration-200 ${
                    gitValidationResult.isValid
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    {gitValidationResult.isValid ? (
                      <>
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Valid Flutter Package Verified in Real Time</span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-600 font-bold">✗</span>
                        <span>Package Validation Issue</span>
                      </>
                    )}
                  </div>
                  {gitValidationResult.isValid ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                      <div>
                        <span className="text-slate-500 font-medium">Package:</span>{' '}
                        <span className="font-semibold">{gitValidationResult.packageName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Version:</span>{' '}
                        <span className="font-semibold">{gitValidationResult.version}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Path:</span>{' '}
                        <span className="font-semibold">{gitValidationResult.path || 'root'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Ref:</span>{' '}
                        <span className="font-semibold">{selectedRef || flutterConfig.gitBranch || 'default'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1">{gitValidationResult.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Generated Flutter pubspec.yaml Snippet Preview */}
          {generatedSnippet && (
            <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs relative shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                <span className="font-semibold">Live Generated pubspec.yaml Dependency Snippet</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="text-xs h-7 px-2 text-slate-300 hover:text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  {copied ? '✓ Copied' : 'Copy Snippet'}
                </Button>
              </div>
              <pre className="overflow-x-auto whitespace-pre leading-relaxed">{generatedSnippet}</pre>
            </div>
          )}
        </div>
      )}
    </>
  );
}
