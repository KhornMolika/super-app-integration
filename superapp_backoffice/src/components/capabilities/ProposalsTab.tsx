'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { GitPullRequest, ExternalLink, GitBranch, User, Smartphone } from 'lucide-react';
import { PermissionProposal } from '@/api/permissions.api';
import { Pagination, usePagination } from '@/components/ui/Pagination';

interface ProposalsTabProps {
  proposals: PermissionProposal[];
  proposalSubFilter: 'PENDING' | 'ALL';
  setProposalSubFilter: (filter: 'PENDING' | 'ALL') => void;
  pendingCount: number;
  canReview: boolean;
  onSelectProposal: (proposal: PermissionProposal) => void;
}

export function ProposalsTab({
  proposals = [],
  proposalSubFilter,
  setProposalSubFilter,
  pendingCount,
  canReview,
  onSelectProposal,
}: ProposalsTabProps) {
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  const filtered = safeProposals.filter((p) => {
    if (proposalSubFilter === 'PENDING') return p.status === 'PENDING_REVIEW';
    return true;
  });

  const { paginatedItems, paginationProps } = usePagination(filtered, 6);

  return (
    <div className="space-y-4">
      {/* Subfilter Pills */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProposalSubFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            proposalSubFilter === 'PENDING'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setProposalSubFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            proposalSubFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          All ({safeProposals.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
          <GitPullRequest className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No proposals in this view
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When MiniApp developers request unlisted capabilities, they appear here for automated code injection.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedItems.map((prop) => (
            <Card
              key={prop.id || prop.permissionKey}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900/60"
            >
              <div className="space-y-2 min-w-0">
                {/* Title & Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {prop.permissionName || prop.permissionKey}
                  </span>
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-400">
                    {prop.permissionKey}
                  </code>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      prop.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : prop.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {prop.status}
                  </span>
                </div>

                {/* Justification text */}
                {prop.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700 line-clamp-2">
                    {prop.description}
                  </p>
                )}

                {/* Metadata Chips */}
                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap pt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{prop.miniApp?.name || prop.metadata?.miniAppName || 'Platform Core'}</strong>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {prop.requestedBy?.name || 'Developer'}
                  </span>
                  {prop.targetSuperAppVersion && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        v{prop.targetSuperAppVersion}
                      </span>
                    </>
                  )}
                  {prop.metadata?.branchName && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-brand-600 dark:text-brand-400">
                        <GitBranch className="w-3 h-3" />
                        <span>
                          {prop.metadata.branchName} → {prop.metadata.targetBranch || 'development'}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {prop.metadata?.mrUrl && (
                  <a
                    href={prop.metadata.mrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    GitLab MR
                  </a>
                )}

                {canReview && (
                  <Button
                    variant={prop.status === 'PENDING_REVIEW' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onSelectProposal(prop)}
                  >
                    {prop.status === 'PENDING_REVIEW' ? 'Review & Inject' : 'Details'}
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
              <Pagination
                {...paginationProps}
                pageSizeOptions={[3, 6, 9, 12]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
