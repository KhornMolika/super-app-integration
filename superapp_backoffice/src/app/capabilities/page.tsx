"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import {
  permissionsApi,
  PermissionProposal,
  CapabilityItem,
  CodeChange,
} from '@/api/permissions.api';
import { unwrapData } from '@/api';
import { CapabilitiesTab } from '@/components/capabilities/CapabilitiesTab';
import { ProposalsTab } from '@/components/capabilities/ProposalsTab';
import { ProposalReviewModal } from '@/components/capabilities/ProposalReviewModal';
import { ProposalProgressModal } from '@/components/capabilities/ProposalProgress';
import { CreateProposalModal } from '@/components/capabilities/CreateProposalModal';
import { Button } from '@/components/ui/inputs';
import {
  Zap,
  GitPullRequest,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { renderCapabilityIcon } from '@/lib/capability-visuals';

function CapabilitiesContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseTab = (t: string | null | undefined): 'CAPABILITIES' | 'PROPOSALS' =>
    t === 'proposals' ? 'PROPOSALS' : 'CAPABILITIES';
  const parseFilter = (f: string | null | undefined): 'PENDING' | 'ALL' =>
    f === 'all' ? 'ALL' : 'PENDING';

  const { can, user } = useAuth();
  // Local state enables instant 0ms tab transitions
  const [activeTab, setActiveTab] = useState<'CAPABILITIES' | 'PROPOSALS'>(() =>
    parseTab(searchParams?.get('tab'))
  );
  const [proposalSubFilter, setProposalSubFilter] = useState<'PENDING' | 'ALL'>(() =>
    parseFilter(searchParams?.get('filter'))
  );
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [proposals, setProposals] = useState<PermissionProposal[]>([]);

  // Sync state if URL changes externally (e.g. back/forward button)
  useEffect(() => {
    const tabFromUrl = parseTab(searchParams?.get('tab'));
    const filterFromUrl = parseFilter(searchParams?.get('filter'));

    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    if (filterFromUrl !== proposalSubFilter) {
      setProposalSubFilter(filterFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setActiveTab(parseTab(urlParams.get('tab')));
      setProposalSubFilter(parseFilter(urlParams.get('filter')));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (newTab: 'CAPABILITIES' | 'PROPOSALS') => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (newTab === 'PROPOSALS') {
        params.set('tab', 'proposals');
        if (proposalSubFilter !== 'PENDING') {
          params.set('filter', proposalSubFilter.toLowerCase());
        }
      } else {
        params.delete('tab');
        params.delete('filter');
      }
      const q = params.toString();
      const newUrl = q ? `${pathname}?${q}` : pathname;
      window.history.replaceState(null, '', newUrl);
    }
  };

  const handleProposalFilterChange = (filter: 'PENDING' | 'ALL') => {
    setProposalSubFilter(filter);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (filter === 'ALL') {
        params.set('filter', 'all');
      } else {
        params.delete('filter');
      }
      const q = params.toString();
      const newUrl = q ? `${pathname}?${q}` : pathname;
      window.history.replaceState(null, '', newUrl);
    }
  };

  // Review Modal State
  const [selectedProposal, setSelectedProposal] = useState<PermissionProposal | null>(null);
  // Read-only progress view for people who cannot review
  const [progressProposal, setProgressProposal] = useState<PermissionProposal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingGitLab, setIsSyncingGitLab] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [capData, propData] = await Promise.all([
        permissionsApi.getCapabilities().catch(() => []),
        permissionsApi.getProposals().catch(() => []),
      ]);
      setCapabilities(unwrapData(capData));
      setProposals(unwrapData(propData));
    } catch (err: any) {
      console.error('Failed to load capabilities data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGitLab = async () => {
    try {
      setIsSyncingGitLab(true);
      toast.info('Fetching SuperApp capabilities strictly from GitLab (branch: main)...');
      const res: any = await permissionsApi.syncGitLab();
      const count =
        res?.syncedCount ??
        res?.data?.syncedCount ??
        (Array.isArray(res?.capabilities) ? res.capabilities.length : 0);
      toast.success(
        `Synced ${count} capabilities from GitLab main directly into database registry!`,
      );
      await loadData();
    } catch (err: any) {
      toast.error(`GitLab sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSyncingGitLab(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingProposalsCount = proposals.filter((p) => p.status === 'PENDING_REVIEW').length;

  const handleApproveWithMr = async (
    proposal: PermissionProposal,
    targetVersion: string,
    targetBranch: string,
  ): Promise<CodeChange | null | undefined> => {
    try {
      setIsSubmitting(true);
      toast.info('Preparing the Super App update...');

      const res = await permissionsApi.reviewProposal(proposal.id, {
        decision: 'APPROVED',
        targetVersion,
        targetBranch,
        createMr: true,
      });
      const codeChange = res.codeChange ?? null;

      if (codeChange?.status === 'failed') {
        toast.error('Approved, but the code change could not be prepared. See the details and retry.');
      } else if (codeChange?.status === 'needs_work') {
        toast.success('Approved. A task was created for the Super App team.');
      } else if (codeChange?.status === 'not_needed') {
        toast.success('Approved. Nothing in the Super App had to change.');
      } else {
        toast.success('Approved. The code change is ready for review.');
      }

      // The modal stays open to show the outcome; refresh the list behind it
      void loadData();
      return codeChange;
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message || 'Unknown error'}`);
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (proposal: PermissionProposal, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    try {
      setIsSubmitting(true);
      await permissionsApi.reviewProposal(proposal.id, {
        decision: 'REJECTED',
        reason: reason.trim(),
        createMr: false,
      });
      toast.success(`Proposal '${proposal.permissionKey}' rejected.`);
      setSelectedProposal(null);
      await loadData();
    } catch (err: any) {
      toast.error(`Rejection failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPermissionIcon = (key?: string) => renderCapabilityIcon(key);

  return (
    <ProtectedRoute permission="permission:read">
      <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-500 pb-12">
        {/* Sleek Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                <Zap className="w-5 h-5" />
              </div>
              Capabilities
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Platform bridge features, JS SDK methods, and integration proposals.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncGitLab}
              disabled={isSyncingGitLab || loading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold h-8 px-3"
              title="Synchronize SuperApp capabilities strictly from GitLab main into Database Registry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGitLab ? 'animate-spin' : ''}`} />
              <span>{isSyncingGitLab ? 'Syncing...' : 'Sync from GitLab'}</span>
            </Button>

            {can('permission_proposal:create') && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold h-8 px-3"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Propose Capability</span>
              </Button>
            )}
          </div>
        </div>

        {/* Streamlined 2-Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => handleTabChange('CAPABILITIES')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
              activeTab === 'CAPABILITIES'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Capabilities
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {Array.isArray(capabilities) ? capabilities.length : 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('PROPOSALS')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer ${
              activeTab === 'PROPOSALS'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            Proposals
            {pendingProposalsCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {pendingProposalsCount}
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                {proposals.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Panels with Smooth Enter Animation */}
        <div key={activeTab} className="tab-panel-enter">
          {activeTab === 'CAPABILITIES' && (
            <CapabilitiesTab
              capabilities={capabilities}
              loading={loading}
              onSyncGitLab={handleSyncGitLab}
              isSyncingGitLab={isSyncingGitLab}
              getPermissionIcon={getPermissionIcon}
            />
          )}

          {activeTab === 'PROPOSALS' && (
            <ProposalsTab
              proposals={proposals}
              proposalSubFilter={proposalSubFilter}
              setProposalSubFilter={handleProposalFilterChange}
              pendingCount={pendingProposalsCount}
              canReview={can('permission_proposal:review')}
              onSelectProposal={(prop) => setSelectedProposal(prop)}
              onViewProgress={(prop) => setProgressProposal(prop)}
              currentUserId={user?.id}
            />
          )}
        </div>

        {/* Review Modal */}
        <ProposalReviewModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onApprove={handleApproveWithMr}
          onReject={handleReject}
          onChanged={() => void loadData()}
          isSubmitting={isSubmitting}
          canApprove={can('permission_proposal:approve')}
        />

        <ProposalProgressModal proposal={progressProposal} onClose={() => setProgressProposal(null)} />

        {/* Create Proposal Modal */}
        <CreateProposalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            await loadData();
            handleTabChange('PROPOSALS');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}

export default function CapabilitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Capabilities...</div>}>
      <CapabilitiesContent />
    </Suspense>
  );
}
