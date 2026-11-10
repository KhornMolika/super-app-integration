'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { ExternalLink, User, Smartphone, Search, X, Globe, Tag, FileCode, ClipboardCheck } from 'lucide-react';
import { PermissionProposal } from '@/api/permissions.api';
import { Pagination } from '@/components/ui/Pagination';
import { getCapabilityVisual } from '@/lib/capability-visuals';

interface ProposalsTabProps {
  proposals: PermissionProposal[];
  proposalSubFilter: 'PENDING' | 'ALL';
  setProposalSubFilter: (filter: 'PENDING' | 'ALL') => void;
  pendingCount: number;
  canReview: boolean;
  onSelectProposal: (proposal: PermissionProposal) => void;
}

/** Where a proposal is in its life, from the reviewer's point of view. */
type ProposalState =
  | 'pending'
  | 'code_ready'
  | 'needs_work'
  | 'code_failed'
  | 'approved'
  | 'in_development'
  | 'rejected';
type FilterKey = 'ALL' | 'pending' | 'code_ready' | 'needs_work' | 'code_failed' | 'rejected';

export function proposalState(p: PermissionProposal): ProposalState {
  if (p.status === 'PENDING_REVIEW') return 'pending';
  if (p.status === 'REJECTED') return 'rejected';
  if (p.status === 'IN_DEVELOPMENT') return 'in_development';
  const cc = p.metadata?.codeChange;
  if (cc?.status === 'failed') return 'code_failed';
  if (cc?.status === 'needs_work') return 'needs_work';
  if (cc?.status === 'created' || (!cc && p.metadata?.mrUrl)) return 'code_ready';
  return 'approved';
}

const STATE_CHIP: Record<ProposalState, { label: string; className: string; dot: string }> = {
  pending: {
    label: 'Waiting for review',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500 animate-pulse',
  },
  code_ready: {
    label: 'Code change ready',
    className: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
  needs_work: {
    label: 'Waiting for the Super App team',
    className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
  },
  code_failed: {
    label: 'Code change failed',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
  },
  approved: {
    label: 'Approved, no code change needed',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  in_development: {
    label: 'In development',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

const time = (p: PermissionProposal) => (p.createdAt ? new Date(p.createdAt).getTime() : 0);

export function ProposalsTab({
  proposals = [],
  proposalSubFilter,
  setProposalSubFilter,
  canReview,
  onSelectProposal,
}: ProposalsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>(proposalSubFilter === 'PENDING' ? 'pending' : 'ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeProposals = useMemo(() => (Array.isArray(proposals) ? proposals : []), [proposals]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      ALL: safeProposals.length,
      pending: 0,
      code_ready: 0,
      needs_work: 0,
      code_failed: 0,
      rejected: 0,
    };
    for (const p of safeProposals) {
      const s = proposalState(p);
      if (s in c) c[s as FilterKey]++;
    }
    return c;
  }, [safeProposals]);

  const changeFilter = (next: FilterKey) => {
    setFilter(next);
    setCurrentPage(1);
    setProposalSubFilter(next === 'pending' ? 'PENDING' : 'ALL');
  };

  // Filter, then sort: waiting proposals first (oldest first: longest wait on top), then newest first
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return safeProposals
      .filter((p) => {
        if (filter !== 'ALL' && proposalState(p) !== filter) return false;
        if (!q) return true;
        return [
          p.permissionName,
          p.permissionKey,
          p.description,
          p.requestedBy?.name,
          p.requestedBy?.email,
          p.miniApp?.name,
          (p.metadata as any)?.miniAppName,
        ].some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const ap = a.status === 'PENDING_REVIEW' ? 0 : 1;
        const bp = b.status === 'PENDING_REVIEW' ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return ap === 0 ? time(a) - time(b) : time(b) - time(a);
      });
  }, [safeProposals, filter, searchQuery]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const tiles: Array<{ key: FilterKey; label: string; tone: string }> = [
    { key: 'ALL', label: 'All proposals', tone: 'text-slate-900 dark:text-slate-100' },
    { key: 'pending', label: 'Waiting for review', tone: 'text-amber-600 dark:text-amber-400' },
    { key: 'code_ready', label: 'Code change ready', tone: 'text-violet-600 dark:text-violet-400' },
    { key: 'needs_work', label: 'Waiting for Super App team', tone: 'text-orange-600 dark:text-orange-400' },
    { key: 'code_failed', label: 'Code change failed', tone: 'text-rose-600 dark:text-rose-400' },
    { key: 'rejected', label: 'Rejected', tone: 'text-slate-500 dark:text-slate-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Summary counts; each one filters the list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="group" aria-label="Filter proposals">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeFilter(t.key)}
            aria-pressed={filter === t.key}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filter === t.key
                ? 'bg-white dark:bg-slate-900 border-brand-500/50 ring-2 ring-brand-500/15 shadow-xs'
                : 'bg-white/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span className={`block text-xl font-bold tabular-nums ${t.tone}`}>{counts[t.key]}</span>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by capability, mini app or requester..."
          aria-label="Search proposals"
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {paginatedItems.length === 0 ? (
        <Card className="p-10 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No capability proposals found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || filter !== 'ALL'
                ? 'Nothing matches this search or filter.'
                : 'When developers or partners ask for a device feature the Super App does not support yet, the request appears here for review and an automatic Super App update.'}
            </p>
          </div>
          {(searchQuery || filter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                changeFilter('ALL');
              }}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
            >
              Show all proposals
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {paginatedItems.map((prop) => {
            const visual = getCapabilityVisual(prop.permissionKey, prop.permissionName, prop.description);
            const Icon = visual.Icon;
            const isPlatform = !prop.miniApp?.name && !(prop.metadata as any)?.miniAppName;
            const miniAppName = prop.miniApp?.name || (prop.metadata as any)?.miniAppName || 'Platform / Core Shell';
            const state = proposalState(prop);
            const chip = STATE_CHIP[state];
            const codeUrl = prop.metadata?.codeChange?.mrUrl || prop.metadata?.mrUrl;

            return (
              <Card
                key={prop.id || prop.permissionKey}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg ${visual.bgColor} ${visual.borderColor} border flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${visual.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {prop.permissionName || prop.permissionKey}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {prop.permissionKey}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${chip.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
                        {chip.label}
                      </span>
                    </div>
                    {prop.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{prop.description}</p>
                    )}
                    <div className="flex items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        {isPlatform ? <Globe className="w-3 h-3 text-brand-500" /> : <Smartphone className="w-3 h-3 text-brand-500" />}
                        {miniAppName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {prop.requestedBy?.name || 'Developer'}
                      </span>
                      {prop.targetSuperAppVersion && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                          <Tag className="w-3 h-3 text-slate-400" />v{prop.targetSuperAppVersion}
                        </span>
                      )}
                      {state === 'rejected' && prop.adminDecisionReason && (
                        <span className="text-rose-500 dark:text-rose-400 truncate max-w-xs">Reason: {prop.adminDecisionReason}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {codeUrl && state === 'code_ready' && (
                    <a
                      href={codeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View code change</span>
                    </a>
                  )}
                  {canReview && (
                    <Button
                      variant={state === 'pending' || state === 'code_failed' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => onSelectProposal(prop)}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        state === 'pending' ? 'bg-brand-600 hover:bg-brand-700 text-white' : ''
                      }`}
                    >
                      {state === 'pending' ? (
                        <>
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </>
                      ) : state === 'code_failed' ? (
                        <span>View &amp; retry</span>
                      ) : (
                        <span>View</span>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {totalItems > 0 && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                showPageSizeSelector={true}
                pageSizeOptions={[10, 20, 50]}
                showTotal={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProposalsTab;
