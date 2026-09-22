"use client";

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { RevisionReviewModal } from '@/components/review/RevisionReviewModal';
import { permissionsApi, miniappsApi, MiniApp } from '@/api';
import { BuildingIcon } from '@/components/ui/Icons';
import { getOrganizationCode, getOrganizationFullName } from '@/lib/constants/fsa-organizations';

type Proposal = {
  id: string;
  miniAppId: string;
  permissionKey: string;
  permissionName?: string;
  description?: string;
  status: string;
  adminDecisionReason?: string;
  targetSuperAppVersion?: string;
  createdAt: string;
  miniApp?: {
    id?: string;
    name: string;
    category?: string;
    appId?: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
};

export default function ReviewQueuePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [miniapps, setMiniapps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MINI_APPS' | 'PROPOSALS'>('MINI_APPS');
  const [appSubFilter, setAppSubFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [proposalSubFilter, setProposalSubFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  
  // Proposal Review Modal State
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedRevisionApp, setSelectedRevisionApp] = useState<MiniApp | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionMode, setDecisionMode] = useState<'VIEW' | 'REJECT'>('VIEW');
  const [rejectReason, setRejectReason] = useState('');
  const [targetVersion, setTargetVersion] = useState('');

  const { can, hasRole } = useAuth();
  const isManager = hasRole('MINI_APP_MANAGER');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propData, appData] = await Promise.all([
        permissionsApi.getProposals(),
        miniappsApi.getAll()
      ]);
      
      setProposals(Array.isArray(propData) ? propData as any : []);
      // Load all submitted mini apps
      setMiniapps(Array.isArray(appData) ? appData.filter((app: MiniApp) => app.status !== 'DRAFT') : []);
    } catch (err) {
      console.error('Failed to fetch review data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isManager]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED' | 'IN_DEVELOPMENT') => {
    if (!selectedProposal) return;
    setIsSubmittingDecision(true);
    try {
      await permissionsApi.reviewProposal(selectedProposal.id, {
        decision,
        reason: decision === 'REJECTED' ? rejectReason : undefined,
        targetVersion: targetVersion.trim() || undefined
      });

      toast.success(`Permission proposal marked as ${decision}.`, 'Decision Submitted');
      setSelectedProposal(null);
      setDecisionMode('VIEW');
      setRejectReason('');
      setTargetVersion('');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error submitting decision.', 'Error');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const isAdminOrSuperAdmin = hasRole('SUPER_ADMIN') || hasRole('ADMIN') || can('miniapp:approve');

  const pendingMiniapps = miniapps.filter(
    (app) => app.status === 'IN_REVIEW' || (Boolean(app.pendingRevision) && app.pendingRevision.revisionStatus === 'IN_REVIEW')
  );
  const displayedMiniapps = appSubFilter === 'PENDING' ? pendingMiniapps : miniapps;

  const pendingProposals = proposals.filter(
    (p) => p.status === 'PENDING_REVIEW' || p.status === 'Pending'
  );
  const displayedProposals = proposalSubFilter === 'PENDING' ? pendingProposals : proposals;

  return (
    <ProtectedRoute permission="permission_proposal:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <svg className="w-8 h-8 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Review Queue</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Track and manage pending Mini Apps, Staged Revisions, and Permission Proposals.</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('MINI_APPS')}
              className={`pb-3 px-2 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'MINI_APPS' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Mini Apps &amp; Revisions ({pendingMiniapps.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('PROPOSALS')}
              className={`pb-3 px-2 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === 'PROPOSALS' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <span>Permission Proposals ({pendingProposals.length})</span>
            </button>
          </div>

          {/* Sub-Filter Pill Toggle */}
          <div className="flex items-center gap-1.5 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden sm:inline">Filter:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => activeTab === 'MINI_APPS' ? setAppSubFilter('PENDING') : setProposalSubFilter('PENDING')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  (activeTab === 'MINI_APPS' ? appSubFilter : proposalSubFilter) === 'PENDING'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Pending Review ({activeTab === 'MINI_APPS' ? pendingMiniapps.length : pendingProposals.length})</span>
              </button>
              <button
                type="button"
                onClick={() => activeTab === 'MINI_APPS' ? setAppSubFilter('ALL') : setProposalSubFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  (activeTab === 'MINI_APPS' ? appSubFilter : proposalSubFilter) === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>All Submissions ({activeTab === 'MINI_APPS' ? miniapps.length : proposals.length})</span>
              </button>
            </div>
          </div>
        </div>

        <Card className="p-0!">
          <div className="overflow-x-auto">
            {activeTab === 'PROPOSALS' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                  <tr>
                    <th className="w-[25%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Mini App</th>
                    <th className="w-[25%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Permission</th>
                    <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Date Submitted</th>
                    <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                    {isAdminOrSuperAdmin && (
                      <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">Loading proposals...</td>
                    </tr>
                  ) : displayedProposals.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">
                        {proposalSubFilter === 'PENDING' ? 'No pending proposals awaiting review in the queue.' : 'No proposals found.'}
                      </td>
                    </tr>
                  ) : (
                    displayedProposals.map((proposal) => {
                      const isPending = proposal.status === 'PENDING_REVIEW' || proposal.status === 'Pending';
                      return (
                        <tr key={proposal.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                            {proposal.miniApp?.name || proposal.miniAppId || 'Unknown App'}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-sm font-semibold">{proposal.permissionKey}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                            {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : proposal.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                  : proposal.status === 'IN_DEVELOPMENT'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                            }`}>
                              {isPending ? (
                                <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : proposal.status === 'APPROVED' ? (
                                <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : proposal.status === 'IN_DEVELOPMENT' ? (
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span>{proposal.status === 'PENDING_REVIEW' ? 'Pending Review' : proposal.status === 'IN_DEVELOPMENT' ? 'In Development' : proposal.status}</span>
                            </span>
                          </td>
                          {isAdminOrSuperAdmin && (
                            <td className="px-6 py-4 text-right">
                              <button 
                                type="button"
                                onClick={() => {
                                  setSelectedProposal(proposal);
                                  setDecisionMode('VIEW');
                                  setRejectReason('');
                                  setTargetVersion(proposal.targetSuperAppVersion || '');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Review Proposal</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                  <tr>
                    <th className="w-[26%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Mini App</th>
                    <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Organization</th>
                    <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Date Submitted</th>
                    <th className="w-[22%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                    {isAdminOrSuperAdmin && (
                      <th className="w-[16%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">Loading mini apps...</td>
                    </tr>
                  ) : displayedMiniapps.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">
                        {appSubFilter === 'PENDING' ? 'No pending mini apps awaiting review in the queue.' : 'No mini apps found.'}
                      </td>
                    </tr>
                  ) : (
                    displayedMiniapps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{app.name || 'Unknown App'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const orgCode = (app as any).organizationCode || getOrganizationCode(app.organization || app.category);
                            const orgFullName = getOrganizationFullName(app.organization || app.category);
                            return (
                              <span 
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-xs cursor-default"
                                title={orgFullName}
                              >
                                <BuildingIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span>{orgCode}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {app.pendingRevision ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                                app.pendingRevision.revisionStatus === 'TESTING'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              }`}>
                                {app.pendingRevision.revisionStatus === 'TESTING' ? (
                                  <svg className="w-3 h-3 text-purple-500 animate-pulse shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                )}
                                <span>{app.pendingRevision.revisionStatus === 'TESTING' ? `Revision in Testing (${app.pendingRevision.testVersion || 'Test Build'})` : 'Revision in Review'}</span>
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-1">
                                Live: {app.version || 'v1.0.0'}
                              </span>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border ${
                              app.status === 'APPROVED'
                                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20'
                                : app.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                                : app.status === 'TESTING' || app.status === 'BUILDING'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20'
                                : app.status === 'REJECTED' || app.status === 'SUSPENDED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                            }`}>
                              {app.status === 'APPROVED' ? (
                                <svg className="w-3 h-3 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : app.status === 'ACTIVE' ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                              ) : app.status === 'TESTING' || app.status === 'BUILDING' ? (
                                <svg className="w-3 h-3 text-purple-500 animate-pulse shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              )}
                              <span>{app.status === 'IN_REVIEW' ? 'In Review' : app.status}</span>
                            </span>
                          )}
                        </td>
                        {isAdminOrSuperAdmin && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {app.pendingRevision ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedRevisionApp(app)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-colors ${
                                    app.pendingRevision.revisionStatus === 'TESTING'
                                      ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  <span>{app.pendingRevision.revisionStatus === 'TESTING' ? 'Publish Live' : 'Review Revision'}</span>
                                </button>
                              ) : (
                                <Link 
                                  href={`/miniapps/${app.id}`} 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>{app.status === 'IN_REVIEW' ? 'Review App' : 'View App'}</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>

      </div>

      {/* Revision Review Modal */}
      {selectedRevisionApp && (
        <RevisionReviewModal
          isOpen={Boolean(selectedRevisionApp)}
          onClose={() => setSelectedRevisionApp(null)}
          miniAppId={selectedRevisionApp.id}
          miniAppName={selectedRevisionApp.name}
          onSuccess={() => {
            setSelectedRevisionApp(null);
            fetchData();
          }}
        />
      )}

      {/* Permission Proposal Review Modal - Viewport Center */}
      {selectedProposal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedProposal(null)}
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Permission Proposal</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review and decide on runtime capability</p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Proposal Info */}
            <div className="space-y-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Mini App</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedProposal.miniApp?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Requested Permission</span>
                <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">{selectedProposal.permissionKey}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Justification / Description</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {selectedProposal.description || 'No description provided.'}
                </p>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Target Super App Version (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2.1.0"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {decisionMode === 'REJECT' && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    Rejection Reason
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide a clear reason for the developer..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              {decisionMode === 'REJECT' ? (
                <div className="flex space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setDecisionMode('VIEW')}
                    disabled={isSubmittingDecision}
                    className="flex-1 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('REJECTED')}
                    disabled={isSubmittingDecision || !rejectReason.trim()}
                    className="flex-1 py-2 text-sm font-medium rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{isSubmittingDecision ? 'Submitting...' : 'Confirm Reject'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision('APPROVED')}
                      disabled={isSubmittingDecision}
                      className="py-2.5 px-3 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('IN_DEVELOPMENT')}
                      disabled={isSubmittingDecision}
                      className="py-2.5 px-3 text-sm font-semibold rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>In Development</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDecisionMode('REJECT')}
                    disabled={isSubmittingDecision}
                    className="w-full py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Reject Proposal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
