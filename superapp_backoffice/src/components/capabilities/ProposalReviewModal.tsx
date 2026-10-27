import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/inputs';
import {
  GitPullRequest,
  GitBranch,
  Smartphone,
  User,
  X,
  Sparkles,
  Tag,
  Check,
  Copy,
  ExternalLink,
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileCode,
} from 'lucide-react';
import { PermissionProposal } from '@/api/permissions.api';
import { getCapabilityVisual } from '@/lib/capability-visuals';

interface ProposalReviewModalProps {
  proposal: PermissionProposal | null;
  onClose: () => void;
  onApprove: (proposal: PermissionProposal, targetVersion: string, targetBranch: string) => Promise<void>;
  onReject: (proposal: PermissionProposal, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

type DecisionTab = 'APPROVE' | 'REJECT';

const REJECTION_PRESETS = [
  'Duplicate of existing capability',
  'Security & privacy policy concern',
  'Incomplete technical justification',
  'Not supported on current shell architecture',
  'Third-party SDK integration not verified',
];

export function ProposalReviewModal({
  proposal,
  onClose,
  onApprove,
  onReject,
  isSubmitting,
}: ProposalReviewModalProps) {
  const [targetVersion, setTargetVersion] = useState(
    proposal?.targetSuperAppVersion || '1.1.0',
  );
  const [targetBranch, setTargetBranch] = useState(
    proposal?.metadata?.targetBranch || 'development',
  );
  const [decisionTab, setDecisionTab] = useState<DecisionTab>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state whenever selected proposal changes
  useEffect(() => {
    if (proposal) {
      setTargetVersion(proposal.targetSuperAppVersion || '1.1.0');
      setTargetBranch(proposal.metadata?.targetBranch || 'development');
      setDecisionTab('APPROVE');
      setRejectReason('');
      setCopiedKey(null);
    }
  }, [proposal]);

  if (!proposal || !mounted) return null;

  const permKey = proposal.permissionKey || '';
  
  // Format clean PascalCase for iOS Info.plist: e.g. biometric_auth_v2 -> BiometricAuthV2
  const permPascal = permKey
    ? permKey
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
    : 'Capability';

  const visual = getCapabilityVisual(proposal.permissionKey, proposal.permissionName, proposal.description);
  const Icon = visual.Icon;

  const isPlatform = !proposal.miniApp?.name && !(proposal.metadata as any)?.miniAppName;
  const miniAppName = proposal.miniApp?.name || (proposal.metadata as any)?.miniAppName || 'Platform / Core Shell';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const codeSnippet = `// android/app/src/main/AndroidManifest.xml
+ <uses-permission android:name="android.permission.${permKey.toUpperCase()}"/>

// ios/Runner/Info.plist
+ <key>NS${permPascal}UsageDescription</key>
+ <string>Required for mini application capabilities.</string>${
    proposal.metadata?.flutterPlugin
      ? `\n\n// pubspec.yaml\n+   ${proposal.metadata.flutterPlugin}`
      : ''
  }`;

  const isPending = proposal.status === 'PENDING_REVIEW';

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 text-left">
      <div className="relative w-full max-w-2xl my-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 transition-all text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl ${visual.bgColor} ${visual.borderColor} border flex items-center justify-center shrink-0 shadow-xs`}
            >
              <Icon className={`w-5 h-5 ${visual.iconColor}`} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {proposal.permissionName || proposal.permissionKey}
                </h3>

                {/* Key Chip */}
                <button
                  type="button"
                  onClick={() => handleCopy(proposal.permissionKey, 'key')}
                  className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Click to copy key"
                >
                  <span>#{proposal.permissionKey}</span>
                  {copiedKey === 'key' ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60" />
                  )}
                </button>

                {/* Category Pill */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visual.pillBgColor} ${visual.badgeTextColor} border ${visual.borderColor}`}
                >
                  {visual.category}
                </span>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    proposal.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : proposal.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      proposal.status === 'APPROVED'
                        ? 'bg-emerald-500'
                        : proposal.status === 'REJECTED'
                        ? 'bg-rose-500'
                        : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span>
                    {proposal.status === 'PENDING_REVIEW'
                      ? 'Pending Review'
                      : proposal.status === 'APPROVED'
                      ? 'Approved'
                      : proposal.status === 'REJECTED'
                      ? 'Rejected'
                      : proposal.status}
                  </span>
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Ref: prop-{proposal.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope & Requester 3-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              {isPlatform ? <Globe className="w-3 h-3 text-brand-500" /> : <Smartphone className="w-3 h-3 text-brand-500" />}
              <span>Target Scope</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
              {miniAppName}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Requested By</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
              {proposal.requestedBy?.name || 'Developer'}
            </p>
            {proposal.requestedBy?.email && (
              <p className="text-[10px] text-slate-400 truncate">
                {proposal.requestedBy.email}
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Target Version</span>
            </span>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
              v{proposal.targetSuperAppVersion || targetVersion || '1.1.0'}
            </p>
          </div>
        </div>

        {/* Technical Justification */}
        {proposal.description && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border-l-4 border-brand-500 border-r border-t border-b border-slate-200/60 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Purpose &amp; Technical Justification
            </span>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
              {proposal.description}
            </p>
          </div>
        )}

        {/* Generated Code Injections Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
              <span>Automated Native Code Injections</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopy(codeSnippet, 'code')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              {copiedKey === 'code' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto space-y-2.5 border border-slate-800 shadow-inner">
            <div>
              <span className="text-slate-500 text-[10px]">// android/app/src/main/AndroidManifest.xml</span>
              <p className="text-emerald-400 mt-0.5">
                {`+ <uses-permission android:name="android.permission.${permKey.toUpperCase()}"/>`}
              </p>
            </div>

            <div>
              <span className="text-slate-500 text-[10px]">// ios/Runner/Info.plist</span>
              <p className="text-emerald-400 mt-0.5">
                {`+ <key>NS${permPascal}UsageDescription</key>`}
              </p>
              <p className="text-emerald-400">
                {`+ <string>Required for mini application capabilities.</string>`}
              </p>
            </div>

            {proposal.metadata?.flutterPlugin && (
              <div>
                <span className="text-slate-500 text-[10px]">// pubspec.yaml</span>
                <p className="text-emerald-400 mt-0.5">
                  {`+   ${proposal.metadata.flutterPlugin}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Review Decision Controls (If Pending) */}
        {isPending ? (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Decision Mode Segmented Bar */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDecisionTab('APPROVE')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  decisionTab === 'APPROVE'
                    ? 'bg-emerald-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve &amp; Create MR</span>
              </button>

              <button
                type="button"
                onClick={() => setDecisionTab('REJECT')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  decisionTab === 'REJECT'
                    ? 'bg-rose-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Proposal</span>
              </button>
            </div>

            {/* Approve Panel */}
            {decisionTab === 'APPROVE' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-brand-500" />
                      <span>Target GitLab Branch</span>
                    </label>
                    <input
                      type="text"
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      placeholder="development"
                      className="w-full h-9 text-xs px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-brand-500" />
                      <span>Target SuperApp Release</span>
                    </label>
                    <input
                      type="text"
                      value={targetVersion}
                      onChange={(e) => setTargetVersion(e.target.value)}
                      placeholder="1.1.0"
                      className="w-full h-9 text-xs px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Approval automatically generates a dedicated GitLab branch and opens a Merge Request with code injection into <strong>{targetBranch}</strong>.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onApprove(proposal, targetVersion, targetBranch)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Creating MR...' : 'Approve & Create GitLab MR'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Reject Panel */}
            {decisionTab === 'REJECT' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span>Rejection Reason (Required)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Sent to requester</span>
                  </div>

                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {REJECTION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          rejectReason === preset
                            ? 'bg-rose-500 text-white border-rose-500 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide specific feedback or rationale for declining this capability proposal..."
                    className="w-full text-xs p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none leading-relaxed placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onReject(proposal, rejectReason)}
                    disabled={isSubmitting || !rejectReason.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Already Reviewed Banner & Close */
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {proposal.status === 'APPROVED' ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold">Approved for release v{proposal.targetSuperAppVersion || '1.1.0'}</span>
                    {proposal.metadata?.branchName && (
                      <span className="block text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono mt-0.5">
                        Branch: {proposal.metadata.branchName}
                      </span>
                    )}
                  </div>
                </div>

                {proposal.metadata?.mrUrl && (
                  <a
                    href={proposal.metadata.mrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open GitLab MR</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Proposal Declined</span>
                </div>
                {proposal.adminDecisionReason && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 pl-6 italic">
                    Reason: {proposal.adminDecisionReason}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ProposalReviewModal;
