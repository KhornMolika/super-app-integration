"use client";

import { useEffect, useRef, useState } from 'react';
import { Button, Input, Label, Select } from '@/components/ui/inputs';
import { IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function IntegrationForm({
  formData,
  handleChange,
  allErrors = {},
  handleWebViewChange,
  handleFlutterChange,
  handleDeepLinkChange,
}: any) {
  const flutterConfig = formData.integrationConfigFlutter || {};
  const deepLinkConfig = formData.integrationConfigDeepLink || {};

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
        <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <Label>Production URL</Label>
            <Input
              name="productionUrl"
              value={formData.integrationConfigWebView?.productionUrl || ''}
              onChange={handleWebViewChange}
              type="url"
              placeholder="https://..."
              className={
                allErrors['integrationConfigWebView.productionUrl']
                  ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50'
                  : ''
              }
            />
            {allErrors['integrationConfigWebView.productionUrl'] && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {allErrors['integrationConfigWebView.productionUrl']}
              </p>
            )}
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
