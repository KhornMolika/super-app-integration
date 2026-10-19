"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import {
  permissionsApi,
  PermissionProposal,
  CapabilityItem,
} from '@/api/permissions.api';
import { CapabilitiesTab } from '@/components/capabilities/CapabilitiesTab';
import { ProposalsTab } from '@/components/capabilities/ProposalsTab';
import { ProposalReviewModal } from '@/components/capabilities/ProposalReviewModal';
import { CreateProposalModal } from '@/components/capabilities/CreateProposalModal';
import { Button } from '@/components/ui/inputs';
import {
  Zap,
  GitPullRequest,
  PlusCircle,
  RefreshCw,
  Camera,
  MapPin,
  Fingerprint,
  Mic,
  Folder,
  CreditCard,
  Key,
} from 'lucide-react';

function CapabilitiesContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'proposals' ? 'PROPOSALS' : 'CAPABILITIES';

  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<'CAPABILITIES' | 'PROPOSALS'>(
    initialTab as any,
  );
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [proposals, setProposals] = useState<PermissionProposal[]>([]);
  const [proposalSubFilter, setProposalSubFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  // Review Modal State
  const [selectedProposal, setSelectedProposal] = useState<PermissionProposal | null>(null);
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
      setCapabilities(capData);
      setProposals(propData);
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
      const res = await permissionsApi.syncGitLab();
      toast.success(
        `Synced ${res.syncedCount} capabilities from GitLab main directly into database registry!`,
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
  ) => {
    try {
      setIsSubmitting(true);
      toast.info(`Generating branch and code injection for '${proposal.permissionKey}'...`);

      const res = await permissionsApi.reviewProposal(proposal.id, {
        decision: 'APPROVED',
        targetVersion: targetVersion || '1.1.0',
        targetBranch: targetBranch || 'development',
        createMr: true,
      });

      toast.success(
        res.mrUrl
          ? `Approved. Branch '${res.branchName}' created with MR targeting '${res.targetBranch || targetBranch || 'development'}'.`
          : 'Proposal approved.',
      );

      setSelectedProposal(null);
      await loadData();
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message || 'Unknown error'}`);
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

  const getPermissionIcon = (key?: string) => {
    const k = (key || '').toLowerCase();
    if (k.includes('camera') || k.includes('qr') || k.includes('photo')) return <Camera className="w-4 h-4 text-amber-500" />;
    if (k.includes('location')) return <MapPin className="w-4 h-4 text-emerald-500" />;
    if (k.includes('biometric') || k.includes('face')) return <Fingerprint className="w-4 h-4 text-cyan-500" />;
    if (k.includes('mic') || k.includes('audio')) return <Mic className="w-4 h-4 text-rose-500" />;
    if (k.includes('storage') || k.includes('file')) return <Folder className="w-4 h-4 text-blue-500" />;
    if (k.includes('pay') || k.includes('bakong')) return <CreditCard className="w-4 h-4 text-violet-500" />;
    return <Key className="w-4 h-4 text-slate-400" />;
  };

  return (
    <ProtectedRoute permission="permission:read">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Shell Synced
            </span>
            {pendingProposalsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('PROPOSALS')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {pendingProposalsCount} Pending
              </button>
            )}

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
          </div>
        </div>

        {/* Streamlined 2-Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('CAPABILITIES')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'CAPABILITIES'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Capabilities
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {capabilities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROPOSALS')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'PROPOSALS'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
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

        {/* Tab 1: Capabilities */}
        {activeTab === 'CAPABILITIES' && (
          <CapabilitiesTab
            capabilities={capabilities}
            getPermissionIcon={getPermissionIcon}
          />
        )}

        {/* Tab 2: Proposals */}
        {activeTab === 'PROPOSALS' && (
          <ProposalsTab
            proposals={proposals}
            proposalSubFilter={proposalSubFilter}
            setProposalSubFilter={setProposalSubFilter}
            pendingCount={pendingProposalsCount}
            canReview={can('permission_proposal:review')}
            onSelectProposal={(prop) => setSelectedProposal(prop)}
          />
        )}

        {/* Review Modal */}
        <ProposalReviewModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onApprove={handleApproveWithMr}
          onReject={handleReject}
          isSubmitting={isSubmitting}
        />

        {/* Create Proposal Modal */}
        <CreateProposalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            await loadData();
            setActiveTab('PROPOSALS');
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
