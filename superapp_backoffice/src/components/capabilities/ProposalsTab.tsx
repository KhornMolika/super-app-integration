'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import {
  GitPullRequest,
  ExternalLink,
  GitBranch,
  User,
  Smartphone,
  Search,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Globe,
  Tag,
} from 'lucide-react';
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

type StatusFilterType = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export function ProposalsTab({
  proposals = [],
  proposalSubFilter,
  setProposalSubFilter,
  pendingCount,
  canReview,
  onSelectProposal,
}: ProposalsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>(
    proposalSubFilter === 'PENDING' ? 'PENDING_REVIEW' : 'ALL',
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const safeProposals = Array.isArray(proposals) ? proposals : [];

  // Compute status counts
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    safeProposals.forEach((p) => {
      if (p.status === 'PENDING_REVIEW') pending++;
      else if (p.status === 'APPROVED') approved++;
      else if (p.status === 'REJECTED') rejected++;
    });
    return {
      all: safeProposals.length,
      pending,
      approved,
      rejected,
    };
  }, [safeProposals]);

  // Handle filter changes
  const handleStatusFilterChange = (filter: StatusFilterType) => {
    setStatusFilter(filter);
    setCurrentPage(1);
    if (filter === 'PENDING_REVIEW') {
      setProposalSubFilter('PENDING');
    } else {
      setProposalSubFilter('ALL');
    }
  };

  // Filtered proposals based on search and status
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return safeProposals.filter((p) => {
      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (q) {
        const matchesName = p.permissionName?.toLowerCase().includes(q);
        const matchesKey = p.permissionKey?.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesRequester = p.requestedBy?.name?.toLowerCase().includes(q) ||
          p.requestedBy?.email?.toLowerCase().includes(q);
        const matchesMiniApp = p.miniApp?.name?.toLowerCase().includes(q) ||
          (p.metadata as any)?.miniAppName?.toLowerCase().includes(q);

        return (
          matchesName ||
          matchesKey ||
          matchesDesc ||
          matchesRequester ||
          matchesMiniApp
        );
      }

      return true;
    });
  }, [safeProposals, statusFilter, searchQuery]);

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search proposals by name, key, mini-app, or requester..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => handleStatusFilterChange('PENDING_REVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'PENDING_REVIEW'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold shadow-xs border border-amber-500/30'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'PENDING_REVIEW'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs border border-emerald-500/30'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Approved</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {counts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold shadow-xs border border-rose-500/30'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Rejected</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {counts.rejected}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-bold shadow-xs border border-brand-500/20'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'ALL'
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {counts.all}
            </span>
          </button>
        </div>
      </div>

      {/* Proposals List */}
      {paginatedItems.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <GitPullRequest className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No capability proposals found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No proposals match "${searchQuery}". Try clearing the search query or changing filters.`
                : 'When developers or partners propose unlisted device features, they will appear here for review and automated MR generation.'}
            </p>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
            >
              Clear Search &amp; Filters
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedItems.map((prop) => {
            const visual = getCapabilityVisual(prop.permissionKey, prop.permissionName, prop.description);
            const Icon = visual.Icon;
            const isPlatform = !prop.miniApp?.name && !(prop.metadata as any)?.miniAppName;
            const miniAppName = prop.miniApp?.name || (prop.metadata as any)?.miniAppName || 'Platform / Core Shell';

            return (
              <Card
                key={prop.id || prop.permissionKey}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs group"
              >
                {/* Left: Icon, Details & Justification */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-xl ${visual.bgColor} ${visual.borderColor} border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 mt-0.5`}
                  >
                    <Icon className={`w-5 h-5 ${visual.iconColor}`} />
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Title, Key & Status Chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {prop.permissionName || prop.permissionKey}
                      </span>

                      {/* Copyable Key Badge */}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, prop.permissionKey, `key-${prop.id}`)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Click to copy capability key"
                      >
                        <span>#{prop.permissionKey}</span>
                        {copiedKey === `key-${prop.id}` ? (
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
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          prop.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : prop.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prop.status === 'APPROVED'
                              ? 'bg-emerald-500'
                              : prop.status === 'REJECTED'
                              ? 'bg-rose-500'
                              : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        <span>
                          {prop.status === 'PENDING_REVIEW'
                            ? 'Pending Review'
                            : prop.status === 'APPROVED'
                            ? 'Approved'
                            : prop.status === 'REJECTED'
                            ? 'Rejected'
                            : prop.status}
                        </span>
                      </span>
                    </div>

                    {/* Justification Text */}
                    {prop.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {prop.description}
                      </p>
                    )}

                    {/* Meta Row: Scope, Requester, Version, Target Branch */}
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                      {/* MiniApp or Platform Scope */}
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        {isPlatform ? (
                          <Globe className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        )}
                        <span>{miniAppName}</span>
                      </span>

                      <span>•</span>

                      {/* Requester */}
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{prop.requestedBy?.name || 'Developer'}</span>
                      </span>

                      {/* Target Version */}
                      {prop.targetSuperAppVersion && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>v{prop.targetSuperAppVersion}</span>
                          </span>
                        </>
                      )}

                      {/* Target Branch */}
                      {prop.metadata?.targetBranch && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            <GitBranch className="w-3 h-3 text-slate-400" />
                            <span>{prop.metadata.targetBranch}</span>
                          </span>
                        </>
                      )}

                      {/* Rejection reason preview */}
                      {prop.status === 'REJECTED' && prop.adminDecisionReason && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] text-rose-500 dark:text-rose-400 italic truncate max-w-xs">
                            Reason: {prop.adminDecisionReason}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* GitLab MR link */}
                  {prop.metadata?.mrUrl && (
                    <a
                      href={prop.metadata.mrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>GitLab MR</span>
                    </a>
                  )}

                  {canReview && (
                    <Button
                      variant={prop.status === 'PENDING_REVIEW' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => onSelectProposal(prop)}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        prop.status === 'PENDING_REVIEW'
                          ? 'bg-brand-600 hover:bg-brand-700 text-white'
                          : ''
                      }`}
                    >
                      {prop.status === 'PENDING_REVIEW' ? (
                        <>
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>Review &amp; Decide</span>
                        </>
                      ) : (
                        <span>View</span>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
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
                pageSizeOptions={[4, 6, 10, 20]}
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
