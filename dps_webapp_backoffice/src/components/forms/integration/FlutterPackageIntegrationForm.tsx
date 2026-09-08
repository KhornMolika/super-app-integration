'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Label, Select } from '@/components/ui/inputs';
import { SourceType } from '@/types/miniapp.types';

export interface FlutterPackageIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleFlutterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isEditable?: boolean;
}

export default function FlutterPackageIntegrationForm({
  formData,
  allErrors = {},
  handleFlutterChange,
  isEditable = true,
}: FlutterPackageIntegrationFormProps) {
  const flutterConfig = formData.integrationConfigFlutter || {};

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

  // State for Flutter Package Archive Upload (.zip / .tar.gz)
  const [isUploadingArchive, setIsUploadingArchive] = useState(false);
  const [archiveUploadSuccess, setArchiveUploadSuccess] = useState<any>(null);
  const [archiveUploadError, setArchiveUploadError] = useState<string | null>(null);

  // State for Git SHA Locking
  const [lockedCommitSha, setLockedCommitSha] = useState<string>('');

  // Snippet and copy state
  const [generatedSnippet, setGeneratedSnippet] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Debounce timers
  const gitDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nexusDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Archive upload handler
  const handleArchiveFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingArchive(true);
    setArchiveUploadError(null);
    setArchiveUploadSuccess(null);

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    if (formData.id) uploadFormData.append('miniAppId', formData.id);
    uploadFormData.append('version', flutterConfig.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0');

    try {
      const res = await fetch('/api/mini-apps/upload-artifact', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setArchiveUploadSuccess(data);

        if (data.pubspec?.name) {
          handleFlutterChange({
            target: { name: 'packageName', value: data.pubspec.name },
          } as any);
        }
        if (data.pubspec?.version) {
          handleFlutterChange({
            target: { name: 'versionConstraint', value: `^${data.pubspec.version}` },
          } as any);
        }
        if (data.packageStoragePath) {
          handleFlutterChange({
            target: { name: 'packageStoragePath', value: data.packageStoragePath },
          } as any);
        }
        if (data.sha256) {
          handleFlutterChange({
            target: { name: 'archiveChecksum', value: data.sha256 },
          } as any);
        }
      } else {
        setArchiveUploadError(data.message || 'Failed to extract archive.');
      }
    } catch (err: any) {
      setArchiveUploadError(err.message || 'Network error uploading archive bundle.');
    } finally {
      setIsUploadingArchive(false);
    }
  };

  // Auto-detect deep monorepo URLs and extract path/ref
  const handleGitUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    let cleanUrl = rawVal;
    let extractedPath = '';
    let extractedRef = '';

    const ghTreeMatch = rawVal.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)(?:\/(.*))?$/);
    if (ghTreeMatch) {
      const owner = ghTreeMatch[1];
      const repo = ghTreeMatch[2].replace(/\.git$/, '');
      extractedRef = ghTreeMatch[3];
      extractedPath = ghTreeMatch[4] || '';
      cleanUrl = `https://github.com/${owner}/${repo}`;
    }

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
      } as any);
    }

    if (extractedRef) {
      setSelectedRef(extractedRef);
      setSelectedRefType('branch');
      handleFlutterChange({
        target: { name: 'gitBranch', value: extractedRef },
      } as any);
    }

    handleFlutterChange({
      target: { name: 'gitUrl', value: cleanUrl },
    } as any);
  };

  // Real-time Git URL Validation with Debounce (600ms)
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

    const lower = url.toLowerCase();
    if (lower.includes('gitlab')) {
      setDetectedProvider('gitlab');
    } else if (lower.includes('github') || lower.split('/').length === 2) {
      setDetectedProvider('github');
    } else {
      setDetectedProvider(null);
    }

    if (gitDebounceRef.current) {
      clearTimeout(gitDebounceRef.current);
    }

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
            } as any);
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
          } catch {}

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
          } catch {}

          // Resolve commit SHA
          try {
            const shaRes = await fetch('/api/integrations/git/resolve-sha', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url,
                ref: selectedRef || flutterConfig.gitBranch || 'main',
              }),
            });
            const shaData = await shaRes.json();
            if (shaData.sha) {
              setLockedCommitSha(shaData.sha);
              handleFlutterChange({
                target: { name: 'commitSha', value: shaData.sha },
              } as any);
            }
          } catch {}
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

  // Real-time Nexus Package Validation with Debounce (500ms)
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

        if (data.exists && data.latestVersion && !flutterConfig.versionConstraint) {
          handleFlutterChange({
            target: { name: 'versionConstraint', value: `^${data.latestVersion}` },
          } as any);
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

  // Generated Snippet Preview
  useEffect(() => {
    if (flutterConfig.sourceType === SourceType.GIT) {
      if (flutterConfig.gitUrl) {
        const pkgName = gitValidationResult?.packageName || flutterConfig.packageName || 'mini_app_package';
        const ref = selectedRef || flutterConfig.gitBranch || 'main';
        const path = (flutterConfig.gitPath || flutterConfig.path || '').trim();

        let s = `dependencies:\n  ${pkgName}:\n    git:\n      url: ${flutterConfig.gitUrl}`;
        if (ref) s += `\n      ref: ${ref}`;
        if (path) s += `\n      path: ${path}`;
        setGeneratedSnippet(s);
      } else {
        setGeneratedSnippet('');
      }
    } else if (flutterConfig.sourceType === SourceType.ARTIFACT) {
      const pkgName = flutterConfig.packageName || 'dps_core_package';
      const ver = flutterConfig.versionConstraint || '^1.0.0';
      const s = `dependencies:\n  ${pkgName}: ${ver}\n\n# Hosted on Sonatype Nexus Private Registry\n# Resolves via pubspec / environment pub-group`;
      setGeneratedSnippet(s);
    }
  }, [flutterConfig, gitValidationResult, selectedRef]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Label>Package Integration Mode</Label>
        <Select
          name="sourceType"
          value={flutterConfig?.sourceType || SourceType.ARTIFACT}
          onChange={handleFlutterChange}
          disabled={!isEditable}
        >
          <option value={SourceType.ARTIFACT}>Package Artifact (.zip / Nexus Private Pub Registry)</option>
          <option value={SourceType.GIT}>Source Code (GitHub / GitLab Repository)</option>
        </Select>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {flutterConfig?.sourceType === SourceType.GIT
            ? 'Integrates source code directly from a Git repository or monorepo subfolder using branch, tag, or commit SHA.'
            : 'Upload a .zip/.tar.gz package bundle or consume versioned artifacts hosted on Sonatype Nexus private registry.'}
        </p>
      </div>

      {flutterConfig?.sourceType === SourceType.GIT ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label>Git Repository URL <span className="text-rose-500">*</span></Label>
                <div className="flex items-center gap-2">
                  {isGitValidating && (
                    <span className="text-xs text-blue-500 animate-pulse">Validating repository...</span>
                  )}
                  {detectedProvider && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        detectedProvider === 'github'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                      }`}
                    >
                      {detectedProvider === 'github' ? 'GitHub App Enabled' : 'GitLab OAuth Enabled'}
                    </span>
                  )}
                </div>
              </div>
              <Input
                required
                name="gitUrl"
                value={flutterConfig?.gitUrl || ''}
                onChange={handleGitUrlChange}
                disabled={!isEditable}
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
                Tip: You can paste repository root or direct subfolder links (e.g. <code>.../tree/main/packages/miniapp</code>).
              </p>
            </div>

            {/* Monorepo Subdirectory / Path Field */}
            <div className="col-span-1 md:col-span-2">
              <Label>Monorepo Subdirectory / Package Path (Optional)</Label>
              <Input
                name="gitPath"
                value={flutterConfig?.gitPath || flutterConfig?.path || ''}
                onChange={handleFlutterChange}
                disabled={!isEditable}
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
                disabled={!isEditable}
              >
                <option value="tag">Tag (Recommended for stable releases)</option>
                <option value="branch">Branch (Development / Active feature)</option>
                <option value="commit">Commit SHA (Exact Lock)</option>
              </Select>
            </div>

            <div>
              <Label>
                Reference Value (
                {selectedRefType === 'tag' ? 'Tag' : selectedRefType === 'branch' ? 'Branch' : 'Commit SHA'})
              </Label>
              {selectedRefType === 'tag' && tags.length > 0 ? (
                <Select
                  value={selectedRef}
                  onChange={(e: any) => setSelectedRef(e.target.value)}
                  disabled={!isEditable}
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
                  disabled={!isEditable}
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
                  disabled={!isEditable}
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

            {/* Tokenless Architecture Banner with Git SHA Locking */}
            <div className="col-span-1 md:col-span-2 p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Tokenless Git Authorization:
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    Authenticated via Platform GitHub App / GitLab OAuth (No personal PATs required).
                  </span>
                </div>
              </div>
              {lockedCommitSha && (
                <div className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded-lg shrink-0 flex items-center gap-1.5">
                  <span>🔒 Locked SHA:</span>
                  <span>{lockedCommitSha.substring(0, 8)}...</span>
                </div>
              )}
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
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <span>{gitValidationResult.isValid ? '✓' : '✗'}</span>
                  <span>{gitValidationResult.isValid ? 'Repository & pubspec.yaml Verified' : 'Validation Error'}</span>
                </span>
                {gitValidationResult.packageName && (
                  <span className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-[11px]">
                    Package: {gitValidationResult.packageName}
                  </span>
                )}
              </div>
              {gitValidationResult.error && <p className="mt-1">{gitValidationResult.error}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Direct Package Archive (.zip / .tar.gz) Upload Section */}
          <div className="p-5 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-indigo-950/20 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 transition-colors">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold shadow-inner">
                  📦
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upload Flutter Package Archive (.zip / .tar.gz)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Zero credentials required. Upload your zipped package bundle to auto-extract metadata & capabilities.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label
                  className={`cursor-pointer w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
                    isUploadingArchive || !isEditable
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isUploadingArchive ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Extracting pubspec...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Choose Archive</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".zip,.tar.gz,.tgz,application/zip,application/gzip,application/x-tar"
                    onChange={handleArchiveFileChange}
                    disabled={isUploadingArchive || !isEditable}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {archiveUploadSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>Archive Ingested & Stored in MinIO: {archiveUploadSuccess.filename}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    SHA: {archiveUploadSuccess.sha256?.substring(0, 12)}...
                  </span>
                </div>
              </div>
            )}

            {archiveUploadError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <span>✕</span>
                <span>{archiveUploadError}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Package Name <span className="text-rose-500">*</span></Label>
                {isNexusValidating && (
                  <span className="text-xs text-blue-500 animate-pulse">Checking Nexus...</span>
                )}
              </div>
              <Input
                required
                name="packageName"
                value={flutterConfig?.packageName || ''}
                onChange={handleFlutterChange}
                disabled={!isEditable}
                placeholder="e.g. dps_core_package"
                className={
                  nexusValidationResult?.exists === false
                    ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                    : nexusValidationResult?.exists === true
                    ? 'border-emerald-500 ring-1 ring-emerald-500 focus:ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : ''
                }
              />
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
                      <span>Package &quot;{flutterConfig?.packageName}&quot; not found in Nexus pub-group. It will be validated and published to Nexus during review.</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Version Constraint <span className="text-rose-500">*</span></Label>
              {nexusValidationResult?.versions && nexusValidationResult.versions.length > 0 ? (
                <div className="flex gap-2">
                  <Input
                    name="versionConstraint"
                    value={flutterConfig?.versionConstraint || ''}
                    onChange={handleFlutterChange}
                    disabled={!isEditable}
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
                      } as any)
                    }
                    disabled={!isEditable}
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
                  disabled={!isEditable}
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
      )}

      {/* Generated Pubspec Snippet Preview */}
      {generatedSnippet && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Super App Generated Dependency Snippet:
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedSnippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto">
            {generatedSnippet}
          </pre>
        </div>
      )}
    </div>
  );
}
