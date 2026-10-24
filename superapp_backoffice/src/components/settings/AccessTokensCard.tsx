'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/inputs';
import { authApi, AccessTokenItem } from '@/api/auth.api';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmationProvider';

export function AccessTokensCard() {
  const confirm = useConfirm();
  const [tokens, setTokens] = useState<AccessTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevealedModalOpen, setIsRevealedModalOpen] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedNpmrc, setCopiedNpmrc] = useState(false);
  const [copiedDartPub, setCopiedDartPub] = useState(false);

  // Form states
  const [tokenName, setTokenName] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [scopes, setScopes] = useState<string[]>(['sdk:read', 'packages:read']);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await authApi.getAccessTokens();
      if (res && res.tokens) {
        setTokens(res.tokens);
      }
    } catch (err: any) {
      console.error('Failed to load access tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) {
      toast.error('Please enter a descriptive name for this token.');
      return;
    }

    try {
      setCreating(true);
      const res = await authApi.createAccessToken({
        name: tokenName.trim(),
        expirationDays: parseInt(expirationDays, 10),
        scopes,
      });

      if (res && res.token) {
        setRevealedToken(res.token);
        setIsCreateModalOpen(false);
        setIsRevealedModalOpen(true);
        setTokenName('');
        setExpirationDays('7');
        setScopes(['sdk:read', 'packages:read']);
        fetchTokens();
        toast.success('Personal access token generated successfully!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate access token.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Revoke Access Token',
      message: `Are you sure you want to revoke "${name}"? Any build systems, scripts, or local IDEs using this token will lose access to the private SDK registries immediately.`,
      confirmText: 'Revoke Token',
      cancelText: 'Keep Token',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await authApi.revokeAccessToken(tokenId);
      toast.success(`Token "${name}" has been revoked.`);
      fetchTokens();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke token.');
    }
  };

  const copyToClipboard = (text: string, type: 'token' | 'npm' | 'dart') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === 'npm') {
      setCopiedNpmrc(true);
      setTimeout(() => setCopiedNpmrc(false), 2000);
    } else if (type === 'dart') {
      setCopiedDartPub(true);
      setTimeout(() => setCopiedDartPub(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <Card className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Personal Access Tokens (PAT)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                  All Roles: SDK &amp; Registry Auth
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Personal Access Tokens (PAT) allow any authenticated user (<strong className="text-slate-700 dark:text-slate-300">Super Admin, Admin, MiniApp Developer</strong>) to authenticate CLI package managers and download official scoped SDKs (<code className="text-brand-600 dark:text-brand-400 font-mono text-2xs">@fsasuperapp/*</code> and <code className="text-brand-600 dark:text-brand-400 font-mono text-2xs">fsa_superapp_flutter_sdk</code>). You do not need to register a MiniApp first to obtain SDKs.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Generate New Token</span>
          </Button>
        </div>

        {/* Quick Reference Code Snippets */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to Use Your Token in Local Development
            </span>
            <a
              href="/guidelines#section-04-pillar-0"
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              View Full Setup Guide &rarr;
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 relative group">
              <div className="text-slate-400 text-2xs mb-1 font-sans font-semibold">Web MiniApps (.npmrc):</div>
              <div className="text-emerald-400 overflow-x-auto whitespace-nowrap">
                //app.fintechcenterfsa.com/api/sdk/:_authToken=&quot;&lt;YOUR_TOKEN&gt;&quot;
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 relative group">
              <div className="text-slate-400 text-2xs mb-1 font-sans font-semibold">Flutter MiniApps (Dart CLI):</div>
              <div className="text-sky-400 overflow-x-auto whitespace-nowrap">
                dart pub token add https://app.fintechcenterfsa.com/pub
              </div>
            </div>
          </div>
        </div>

        {/* Token List */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Active Tokens ({tokens.length})
          </h4>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading access tokens...
            </div>
          ) : tokens.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                No Personal Access Tokens Found
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Generate a Personal Access Token to download official private SDKs to your local machine.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Token Name</th>
                    <th className="py-3 px-4">Token Identifier</th>
                    <th className="py-3 px-4">Scopes</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {tokens.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-2xs text-slate-500 dark:text-slate-400">
                        {t.tokenPrefix}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(t.scopes || ['sdk:read']).map((scope) => (
                            <span
                              key={scope}
                              className="px-2 py-0.5 rounded text-2xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {t.expiresAt
                          ? new Date(t.expiresAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeToken(t.id, t.name)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal 1: Generate New Token Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Generate Personal Access Token
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="p-5 space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Token Name / Description *
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Local Macbook Pro / CI Pipeline"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full text-xs"
                  required
                />
                <p className="text-2xs text-slate-500 mt-1">
                  Use a friendly name to identify which computer or service is using this token.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Expiration
                  </Label>
                  <span className="text-2xs text-brand-600 dark:text-brand-400 font-semibold">
                    Zero-Trust Default: 7 Days
                  </span>
                </div>
                <select
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                >
                  <option value="1">1 day (24 hours - Quick Setup)</option>
                  <option value="7">7 days (Recommended for SDK Download)</option>
                  <option value="14">14 days (2 weeks - Sprint Milestone)</option>
                  <option value="30">30 days (1 month - Development)</option>
                  <option value="60">60 days (2 months)</option>
                  <option value="90">90 days (Quarterly CI/CD)</option>
                  <option value="180">180 days (Semi-Annual)</option>
                  <option value="365">1 year</option>
                </select>
                <p className="text-2xs text-slate-500 mt-1">
                  Keep expiration brief for local development. Tokens can be revoked or re-issued anytime.
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Token Scopes
                </Label>
                <div className="space-y-2 mt-2">
                  {[
                    {
                      id: 'sdk:read',
                      title: 'sdk:read',
                      desc: 'Download private scoped SDK packages from @fsasuperapp and /pub gateway.',
                    },
                    {
                      id: 'packages:read',
                      title: 'packages:read',
                      desc: 'Query versions, packuments, and tarball checksums.',
                    },
                    {
                      id: 'miniapp:read',
                      title: 'miniapp:read',
                      desc: 'Access capability directory and public metadata.',
                    },
                  ].map((s) => (
                    <label
                      key={s.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={scopes.includes(s.id)}
                        onChange={() => toggleScope(s.id)}
                        className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <div className="font-mono font-bold text-2xs text-slate-900 dark:text-white">
                          {s.title}
                        </div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">
                          {s.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  {creating ? 'Generating...' : 'Generate Token'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Token Disclosure (One-time viewing) */}
      {isRevealedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Token Generated Successfully
                  </h4>
                  <p className="text-2xs text-amber-600 dark:text-amber-400 font-semibold">
                    Make sure to copy your access token now. You will not be able to see it again!
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Your Personal Access Token
                </Label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={revealedToken}
                    className="w-full font-mono text-xs py-2.5 pl-3 pr-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(revealedToken, 'token')}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-2xs transition-colors cursor-pointer"
                  >
                    {copiedToken ? '✓ Copied' : 'Copy Token'}
                  </button>
                </div>
              </div>

              {/* Direct Setup Configurations */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-2xs border border-slate-800 relative">
                  <div className="flex items-center justify-between mb-1.5 text-slate-400 font-sans font-semibold">
                    <span>Web MiniApp Config (.npmrc):</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `@fsasuperapp:registry=https://app.fintechcenterfsa.com/api/sdk/\n//app.fintechcenterfsa.com/api/sdk/:_authToken="${revealedToken}"`,
                          'npm'
                        )
                      }
                      className="text-brand-400 hover:text-brand-300 cursor-pointer font-bold"
                    >
                      {copiedNpmrc ? '✓ Copied' : 'Copy .npmrc Snippet'}
                    </button>
                  </div>
                  <pre className="text-emerald-400 overflow-x-auto whitespace-pre">
{`@fsasuperapp:registry=https://app.fintechcenterfsa.com/api/sdk/
//app.fintechcenterfsa.com/api/sdk/:_authToken="${revealedToken}"`}
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-2xs border border-slate-800 relative">
                  <div className="flex items-center justify-between mb-1.5 text-slate-400 font-sans font-semibold">
                    <span>Flutter CLI Command:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `dart pub token add https://app.fintechcenterfsa.com/pub`,
                          'dart'
                        )
                      }
                      className="text-brand-400 hover:text-brand-300 cursor-pointer font-bold"
                    >
                      {copiedDartPub ? '✓ Copied' : 'Copy CLI Command'}
                    </button>
                  </div>
                  <pre className="text-sky-400 overflow-x-auto whitespace-pre">
{`dart pub token add https://app.fintechcenterfsa.com/pub`}
                  </pre>
                  <p className="text-2xs text-slate-400 font-sans mt-1.5">
                    When prompted by the Dart CLI, paste the token shown above.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-end border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  onClick={() => setIsRevealedModalOpen(false)}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs py-2 px-6 rounded-xl cursor-pointer"
                >
                  I Have Copied My Token
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Backwards-compatible alias
export const DeveloperTokensCard = AccessTokensCard;

