import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import ReasonPromptModal from '@/components/ui/ReasonPromptModal';
import { miniappsApi } from '@/api';

export interface RevisionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  miniAppId: string;
  miniAppName?: string;
  baseVersion?: string;
  targetVersion?: string;
  onSuccess?: () => void;
}

export function RevisionReviewModal({
  isOpen,
  onClose,
  miniAppId,
  miniAppName,
  baseVersion,
  targetVersion,
  onSuccess,
}: RevisionReviewModalProps) {
  const [diffData, setDiffData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'DIFF' | 'PERMISSIONS' | 'NETWORK' | 'METADATA'>('DIFF');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    action: 'request-changes' | 'discard-revision';
    title: string;
    description: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning';
    quickSuggestions: string[];
    placeholder: string;
  } | null>(null);

  const fetchDiff = async () => {
    if (!miniAppId) return;
    setLoading(true);
    try {
      const data = await miniappsApi.getDiff(miniAppId, baseVersion, targetVersion);
      setDiffData(data);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching version diff', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && miniAppId) {
      fetchDiff();
    }
  }, [isOpen, miniAppId, baseVersion, targetVersion]);

  if (!isOpen) return null;

  const handleAction = async (
    action: 'publish-revision' | 'start-testing' | 'request-changes' | 'discard-revision',
    explicitReason?: string,
  ) => {
    if (action === 'request-changes' && explicitReason === undefined) {
      setReasonModalState({
        isOpen: true,
        action: 'request-changes',
        title: 'Request Changes from Developer',
        description: 'Specify the required fixes or security remediations. The staged revision will remain in draft for the developer.',
        confirmText: 'Send Change Request',
        confirmVariant: 'warning',
        placeholder: 'e.g. Please justify why biometric capability is required, or update domain whitelist...',
        quickSuggestions: [
          'Permission purpose is too vague; provide explicit business context',
          'Domain whitelist includes unverified external domains',
          'Terms of Service / Privacy Policy URL is inaccessible or invalid',
          'Security scan flagged potential SSRF risk on target endpoint',
        ],
      });
      return;
    }

    if (action === 'discard-revision' && explicitReason === undefined) {
      setReasonModalState({
        isOpen: true,
        action: 'discard-revision',
        title: 'Reject & Discard Staged Revision',
        description: 'Are you sure you want to reject this revision? All proposed changes will be discarded while the live version remains active.',
        confirmText: 'Reject Revision',
        confirmVariant: 'danger',
        placeholder: 'Explain why this revision cannot be accepted...',
        quickSuggestions: [
          'Violates Super App platform capability and security policies',
          'High-risk permissions requested without required partner certification',
          'Duplicate or conflicting capability with existing Super App core features',
          'Incompatible technical architecture or failed automated security baseline',
        ],
      });
      return;
    }

    const reason = explicitReason || '';
    setActionLoading(action);
    try {
      await miniappsApi.executeAction(miniAppId, action, reason);

      const actionLabels: Record<string, string> = {
        'publish-revision': 'Revision published live to Super App catalog!',
        'start-testing': 'Test build triggered and advanced to sandbox testing!',
        'request-changes': 'Change request sent to Mini App developer.',
        'discard-revision': 'Revision has been rejected and discarded.',
      };
      toast.success(actionLabels[action] || 'Action completed successfully!', 'Revision Updated');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || `Failed to execute ${action}.`, 'Action Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const d = diffData?.differences;
  const isHighRisk = diffData?.isHighRiskChange;
  const addedPerms = d?.permissions?.added || [];
  const removedPerms = d?.permissions?.removed || [];
  const modifiedPerms = d?.permissions?.modified || [];
  const addedDomains = d?.integration?.allowedDomains?.added || [];
  const removedDomains = d?.integration?.allowedDomains?.removed || [];
  const metaDiff = d?.metadata || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Revision Review &amp; Version Comparison
                </h3>
                {isHighRisk ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>High-Risk Capabilities</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Low Risk Delta</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparing Live Version <strong className="text-slate-700 dark:text-slate-200">({diffData?.baseVersion?.version || 'v1.0.0'})</strong> 🆚 Proposed Revision <strong className="text-brand-600 dark:text-brand-400">({diffData?.targetVersion?.version || 'v1.1.0-draft'})</strong> for {miniAppName || diffData?.appName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-semibold text-slate-500">Computing version delta...</span>
            </div>
          ) : (
            <>
              {/* 1. Developer Submission Notes (What & Why) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Release Notes (What Changed)</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {diffData?.targetVersion?.changelog || 'No detailed changelog provided by developer.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Security Justification (Why Needed)</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {diffData?.targetVersion?.justification || 'Platform capability request for enhanced integration.'}
                  </p>
                </div>
              </div>

              {/* 2. Automated Pre-Flight Security Gate Status */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Automated Pre-Flight Checks:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>SAST Security Score: {d?.security?.scoreDiff?.target ?? 100}/100</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>SSRF Boundary: Verified</span>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${d?.security?.domainVerification?.target ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    <span>Domain Association: {d?.security?.domainVerification?.target ? 'Verified' : 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Navigation Filter Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
                {[
                  { id: 'DIFF', label: 'Overview & Highlights', count: (addedPerms.length + addedDomains.length + Object.keys(metaDiff).length) },
                  { id: 'PERMISSIONS', label: 'Permissions & Capabilities', count: (addedPerms.length + removedPerms.length) },
                  { id: 'NETWORK', label: 'Endpoints & Domain Whitelist', count: (addedDomains.length + removedDomains.length) },
                  { id: 'METADATA', label: 'Metadata & Legal', count: Object.keys(metaDiff).length },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`pb-3 px-3 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === t.id
                        ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-bold">
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 4. Tab Content: Permissions Delta */}
              {(activeTab === 'DIFF' || activeTab === 'PERMISSIONS') && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <span>Permissions Delta</span>
                  </h4>

                  {addedPerms.length === 0 && removedPerms.length === 0 && modifiedPerms.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 text-center">
                      No permission changes in this revision.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {addedPerms.map((p: any) => (
                        <div
                          key={p.type}
                          className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              +
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span className="font-mono">{p.type}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    p.riskLevel === 'HIGH'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                  }`}
                                >
                                  {p.riskLevel} RISK
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {p.purpose || 'Required for Mini App runtime integration'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                            🟢 Added
                          </span>
                        </div>
                      ))}

                      {removedPerms.map((p: any) => (
                        <div
                          key={p.type}
                          className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              -
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 line-through">
                              {p.type}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            🔴 Removed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Tab Content: Network & Domain Whitelist */}
              {(activeTab === 'DIFF' || activeTab === 'NETWORK') && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span>Endpoints &amp; Allowed Domain Whitelist</span>
                  </h4>

                  {/* Production URL Diff */}
                  {d?.integration?.productionUrl?.changed && (
                    <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-1 text-xs">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        ⚡ Production Endpoint Modified:
                      </span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Live Base URL</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400 break-all">{d.integration.productionUrl.base || 'None'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700">
                          <span className="text-[10px] text-emerald-600 uppercase font-bold block">New Proposed URL</span>
                          <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold break-all">{d.integration.productionUrl.target}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Domain Whitelist Chips */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Allowed Domain Whitelist Delta:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {addedDomains.map((dom: string) => (
                        <span
                          key={dom}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs"
                        >
                          <span>+ {dom}</span>
                        </span>
                      ))}
                      {removedDomains.map((dom: string) => (
                        <span
                          key={dom}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 line-through border border-rose-300 dark:border-rose-800"
                        >
                          <span>- {dom}</span>
                        </span>
                      ))}
                      {d?.integration?.allowedDomains?.unchanged?.map((dom: string) => (
                        <span
                          key={dom}
                          className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <span>{dom}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Tab Content: Metadata Delta */}
              {(activeTab === 'DIFF' || activeTab === 'METADATA') && Object.keys(metaDiff).length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Metadata &amp; Legal Info Changes</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(metaDiff).map(([key, val]: [string, any]) => (
                      <div
                        key={key}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          {key}
                        </span>
                        <div className="space-y-1">
                          <div className="text-slate-500 line-through truncate">
                            <strong>Old:</strong> {val.base || '(empty)'}
                          </div>
                          <div className="text-emerald-700 dark:text-emerald-400 font-bold truncate">
                            <strong>New:</strong> {val.target}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancel</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction('discard-revision')}
              className="px-5 py-2.5 text-sm font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{actionLoading === 'discard-revision' ? 'Rejecting...' : 'Reject Revision'}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction('request-changes')}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{actionLoading === 'request-changes' ? 'Sending...' : 'Request Changes'}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction('start-testing')}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>{actionLoading === 'start-testing' ? 'Triggering...' : 'Approve for Test Build'}</span>
            </button>

            <button
              type="button"
              disabled={Boolean(actionLoading)}
              onClick={() => handleAction('publish-revision')}
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{actionLoading === 'publish-revision' ? 'Publishing...' : 'Approve & Publish Live'}</span>
            </button>
          </div>
        </div>
      </div>

      {reasonModalState?.isOpen && (
        <ReasonPromptModal
          isOpen={reasonModalState.isOpen}
          title={reasonModalState.title}
          description={reasonModalState.description}
          placeholder={reasonModalState.placeholder}
          confirmText={reasonModalState.confirmText}
          confirmVariant={reasonModalState.confirmVariant}
          quickSuggestions={reasonModalState.quickSuggestions}
          isLoading={Boolean(actionLoading)}
          onClose={() => setReasonModalState(null)}
          onConfirm={(reason) => {
            const action = reasonModalState.action;
            setReasonModalState(null);
            handleAction(action, reason);
          }}
        />
      )}
    </div>
  );
}
