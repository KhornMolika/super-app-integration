'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { ExternalLink, User, Users, Smartphone, Search, X, Globe, Tag, FileCode, ClipboardCheck, ListChecks, Info, PlusCircle } from 'lucide-react';
import { PermissionProposal } from '@/api/permissions.api';
import { Pagination } from '@/components/ui/Pagination';
import { getCapabilityVisual } from '@/lib/capability-visuals';
import type { CapabilityAudience } from '@/components/capabilities/capability-view';

interface ProposalsTabProps {
  proposals: PermissionProposal[];
  proposalSubFilter: 'PENDING' | 'ALL';
  setProposalSubFilter: (filter: 'PENDING' | 'ALL') => void;
  pendingCount: number;
  canReview: boolean;
  onSelectProposal: (proposal: PermissionProposal) => void;
  /** Opens the read-only progress view (for people who cannot review) */
  onViewProgress?: (proposal: PermissionProposal) => void;
  /** Signed-in user, for the "Mine" filter */
  currentUserId?: string;
  /** Who is looking: changes the tiles, wording and links (default: decider) */
  audience?: CapabilityAudience;
  /** Opens the request form (shown in the empty state for requesters) */
  onRequest?: () => void;
}

/** True when the user made the request or added their mini app to it. */
export function isMine(p: PermissionProposal, userId?: string): boolean {
  if (!userId) return false;
  if (p.requestedBy?.id === userId) return true;
  return (p.metadata?.supporters || []).some((s) => s?.userId === userId);
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
type FilterKey = 'ALL' | 'pending' | 'accepted' | 'code_ready' | 'needs_work' | 'code_failed' | 'rejected';

/** Every state after an approval, shown as one group outside the decider view. */
const ACCEPTED_STATES: ProposalState[] = ['code_ready', 'needs_work', 'code_failed', 'approved', 'in_development'];

function matchesFilter(p: PermissionProposal, key: FilterKey): boolean {
  if (key === 'ALL') return true;
  const state = proposalState(p);
  return key === 'accepted' ? ACCEPTED_STATES.includes(state) : state === key;
}

/** Plain wording for the developer who asked; no internal steps. */
export function requesterChip(p: PermissionProposal): { label: string; className: string; dot: string } {
  const state = proposalState(p);
  if (state === 'pending' || state === 'rejected') return STATE_CHIP[state];
  const version = p.implementedInSuperAppVersion || p.targetSuperAppVersion;
  return {
    label: p.implementedInSuperAppVersion
      ? `Available from v${p.implementedInSuperAppVersion}`
      : version && (state === 'code_ready' || state === 'approved')
        ? `Approved, ships in v${version}`
        : 'Approved, being added to the Super App',
    className: STATE_CHIP.approved.className,
    dot: STATE_CHIP.approved.dot,
  };
}

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
  onViewProgress,
  currentUserId,
  audience = 'decider',
  onRequest,
}: ProposalsTabProps) {
  const isDecider = audience === 'decider';
  const isRequester = audience === 'requester';
  const [searchQuery, setSearchQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  // Deciders start on the waiting list; others see all their requests
  const [filter, setFilter] = useState<FilterKey>(
    isDecider && proposalSubFilter === 'PENDING' ? 'pending' : 'ALL',
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeProposals = useMemo(() => {
    const list = Array.isArray(proposals) ? proposals : [];
    return mineOnly ? list.filter((p) => isMine(p, currentUserId)) : list;
  }, [proposals, mineOnly, currentUserId]);

  const counts = useMemo(() => {
    const keys: FilterKey[] = ['ALL', 'pending', 'accepted', 'code_ready', 'needs_work', 'code_failed', 'rejected'];
    return Object.fromEntries(
      keys.map((k) => [k, safeProposals.filter((p) => matchesFilter(p, k)).length]),
    ) as Record<FilterKey, number>;
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
        if (!matchesFilter(p, filter)) return false;
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

  const tiles: Array<{ key: FilterKey; label: string; tone: string }> = isDecider
    ? [
        { key: 'ALL', label: 'All proposals', tone: 'text-slate-900 dark:text-slate-100' },
        { key: 'pending', label: 'Waiting for review', tone: 'text-amber-600 dark:text-amber-400' },
        { key: 'code_ready', label: 'Code change ready', tone: 'text-violet-600 dark:text-violet-400' },
        { key: 'needs_work', label: 'Waiting for Super App team', tone: 'text-orange-600 dark:text-orange-400' },
        { key: 'code_failed', label: 'Code change failed', tone: 'text-rose-600 dark:text-rose-400' },
        { key: 'rejected', label: 'Rejected', tone: 'text-slate-500 dark:text-slate-400' },
      ]
    : [
        { key: 'ALL', label: isRequester ? 'All my requests' : 'All requests', tone: 'text-slate-900 dark:text-slate-100' },
        { key: 'pending', label: 'Waiting for review', tone: 'text-amber-600 dark:text-amber-400' },
        { key: 'accepted', label: 'Approved', tone: 'text-emerald-600 dark:text-emerald-400' },
        { key: 'rejected', label: 'Rejected', tone: 'text-slate-500 dark:text-slate-400' },
      ];

  /** Who asked, as this viewer should read it. */
  const requesterLabel = (p: PermissionProposal): string => {
    const others = p.metadata?.supporters?.length ?? 0;
    if (isRequester && isMine(p, currentUserId)) {
      return others > 0 && p.requestedBy?.id === currentUserId
        ? `You and ${others} other${others === 1 ? '' : 's'} asked`
        : 'You asked';
    }
    return p.requestedBy?.name || (isRequester ? 'Another developer' : 'Developer');
  };

  return (
    <div className="space-y-3">
      {audience === 'overseer' && (
        <p className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 text-xs text-sky-800 dark:text-sky-200">
          <Info className="w-4 h-4 shrink-0 mt-px" />
          Only Super Admins approve or reject requests. You can follow each one&apos;s progress.
        </p>
      )}

      {/* Summary counts; each one filters the list */}
      <div
        className={`grid grid-cols-2 gap-2 ${isDecider ? 'sm:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-4'}`}
        role="group"
        aria-label="Filter requests"
      >
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

      {/* Search, and "Mine" */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={isRequester ? 'Search your requests...' : 'Search by capability, mini app or requester...'}
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
        {currentUserId && isDecider && (
          <button
            type="button"
            onClick={() => {
              setMineOnly((v) => !v);
              setCurrentPage(1);
            }}
            aria-pressed={mineOnly}
            title="Only requests you made or added your mini app to"
            className={`shrink-0 inline-flex items-center gap-1.5 h-[34px] px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              mineOnly
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Mine
          </button>
        )}
      </div>

      {paginatedItems.length === 0 ? (
        <Card className="p-10 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {searchQuery || filter !== 'ALL' || mineOnly
                ? 'Nothing found'
                : isRequester
                  ? 'You haven\'t requested any capabilities yet'
                  : audience === 'overseer'
                    ? 'No requests yet'
                    : 'No capability proposals found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || filter !== 'ALL' || mineOnly
                ? 'Nothing matches this search or filter.'
                : isRequester
                  ? 'If your mini app needs a device feature that is not in the catalog, request it here. You can follow it until it ships.'
                  : audience === 'overseer'
                    ? 'Requests for new device features appear here with their progress.'
                    : 'When developers or partners ask for a device feature the Super App does not support yet, the request appears here for review and an automatic Super App update.'}
            </p>
          </div>
          {isRequester && onRequest && !searchQuery && filter === 'ALL' && (
            <button
              type="button"
              onClick={onRequest}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Request a capability
            </button>
          )}
          {(searchQuery || filter !== 'ALL' || mineOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setMineOnly(false);
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
            const chip = isRequester ? requesterChip(prop) : STATE_CHIP[state];
            const codeUrl = prop.metadata?.codeChange?.mrUrl || prop.metadata?.mrUrl;
            const supporterCount = prop.metadata?.supporters?.length ?? 0;

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
                        {requesterLabel(prop)}
                      </span>
                      {supporterCount > 0 && !(isRequester && isMine(prop, currentUserId)) && (
                        <span
                          className="inline-flex items-center gap-1"
                          title="Other mini apps that asked for the same capability"
                        >
                          <Users className="w-3 h-3 text-slate-400" />+{supporterCount} more asked
                        </span>
                      )}
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
                  {codeUrl && state === 'code_ready' && !isRequester && (
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
                  {!canReview && onViewProgress && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewProgress(prop)}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>Progress</span>
                    </Button>
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
