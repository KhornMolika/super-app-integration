'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { Code, GitPullRequest, GitBranch, Smartphone, User, X } from 'lucide-react';
import { PermissionProposal } from '@/api/permissions.api';
import { getCapabilityVisual } from '@/lib/capability-visuals';

interface ProposalReviewModalProps {
  proposal: PermissionProposal | null;
  onClose: () => void;
  onApprove: (proposal: PermissionProposal, targetVersion: string, targetBranch: string) => Promise<void>;
  onReject: (proposal: PermissionProposal, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

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
  const [activeAction, setActiveAction] = useState<'VIEW' | 'REJECT'>('VIEW');
  const [rejectReason, setRejectReason] = useState('');

  // Sync state whenever selected proposal changes
  useEffect(() => {
    if (proposal) {
      setTargetVersion(proposal.targetSuperAppVersion || '1.1.0');
      setTargetBranch(proposal.metadata?.targetBranch || 'development');
      setActiveAction('VIEW');
      setRejectReason('');
    }
  }, [proposal]);

  if (!proposal) return null;

  const permKey = proposal.permissionKey || '';
  const permPascal = permKey
    ? permKey.charAt(0).toUpperCase() + permKey.slice(1)
    : '';

  const visual = getCapabilityVisual(proposal.permissionKey, proposal.permissionName, proposal.description);
  const Icon = visual.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border-slate-700 bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${visual.bgColor} ${visual.borderColor} border shrink-0 transition-colors`}>
              <Icon className={`w-4 h-4 ${visual.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {proposal.permissionName || 'Review Capability Proposal'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visual.pillBgColor} ${visual.badgeTextColor}`}>
                  {visual.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {proposal.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Capability Key</span>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {proposal.permissionKey}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Requester</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400 shrink-0" />
              {proposal.requestedBy?.name || 'Developer'}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MiniApp</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
              {proposal.miniApp?.name || (proposal.metadata as any)?.miniAppName || 'Platform / SuperApp Core'}
            </p>
          </div>
        </div>

        {/* Description quote */}
        {proposal.description && (
          <div className="text-xs text-slate-600 dark:text-slate-300 pl-3 border-l-2 border-brand-500 bg-slate-50/50 dark:bg-slate-950/30 py-1.5 pr-2 rounded-r-lg">
            {proposal.description}
          </div>
        )}

        {/* Code Diff Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
              Generated Code Injections
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Auto-branch &amp; MR
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto space-y-2.5 border border-slate-800">
            <div>
              <span className="text-slate-500">// android/app/src/main/AndroidManifest.xml</span>
              <p className="text-emerald-400 mt-0.5">
                {`+ <uses-permission android:name="android.permission.${permKey.toUpperCase()}"/>`}
              </p>
            </div>

            <div>
              <span className="text-slate-500">// ios/Runner/Info.plist</span>
              <p className="text-emerald-400 mt-0.5">
                {`+ <key>NS${permPascal}UsageDescription</key>`}
              </p>
              <p className="text-emerald-400">
                {`+ <string>Required for mini application capabilities.</string>`}
              </p>
            </div>

            {proposal.metadata?.flutterPlugin && (
              <div>
                <span className="text-slate-500">// pubspec.yaml</span>
                <p className="text-emerald-400 mt-0.5">
                  {`+   ${proposal.metadata.flutterPlugin}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {proposal.status === 'PENDING_REVIEW' && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Branch (GitLab MR)
                </label>
                <input
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  placeholder="development"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target SuperApp Version
                </label>
                <input
                  type="text"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  placeholder="1.1.0"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {activeAction === 'REJECT' && (
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this proposal cannot be integrated..."
                  className="w-full text-xs p-2.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {activeAction === 'VIEW' ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setActiveAction('REJECT')}
                    disabled={isSubmitting}
                  >
                    Reject
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApprove(proposal, targetVersion, targetBranch)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Generating MR...' : 'Approve & Create MR'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveAction('VIEW')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onReject(proposal, rejectReason)}
                    disabled={isSubmitting || !rejectReason.trim()}
                  >
                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {proposal.status !== 'PENDING_REVIEW' && (
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
