"use client";
import { API_URL } from '@/lib/config';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';


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

type MiniApp = {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
};

export default function ReviewQueuePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [miniapps, setMiniapps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MINI_APPS' | 'PROPOSALS'>('MINI_APPS');
  
  // Proposal Review Modal State
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionMode, setDecisionMode] = useState<'VIEW' | 'REJECT'>('VIEW');
  const [rejectReason, setRejectReason] = useState('');
  const [targetVersion, setTargetVersion] = useState('');

  const { can, hasRole } = useAuth();
  const isManager = hasRole('MINI_APP_MANAGER');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, appRes] = await Promise.all([
        fetch(`${API_URL}/permission-proposals`),
        fetch(`${API_URL}/mini-apps`)
      ]);
      
      if (propRes.ok) {
        const data = await propRes.json();
        setProposals(data);
      }
      if (appRes.ok) {
        const data = await appRes.json();
        // Filter to show Mini Apps needing review (or user's submitted apps if manager)
        setMiniapps(data.filter((app: MiniApp) => app.status === 'PENDING_REVIEW' || (isManager && app.status !== 'DRAFT')));
      }
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
      const response = await fetch(`${API_URL}/permission-proposals/${selectedProposal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: decision === 'REJECTED' ? rejectReason : undefined,
          targetVersion: targetVersion.trim() || undefined
        })
      });

      if (response.ok) {
        setSelectedProposal(null);
        setDecisionMode('VIEW');
        setRejectReason('');
        setTargetVersion('');
        await fetchData();
      } else {
        alert('Failed to submit decision.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const isAdminOrSuperAdmin = hasRole('SUPER_ADMIN') || hasRole('ADMIN') || can('miniapp:approve');

  return (
    <ProtectedRoute permission="permission_proposal:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Review Queue</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Track and manage pending Mini Apps and Permission Proposals.</p>
          </div>
        </div>

        <div className="flex space-x-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('MINI_APPS')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'MINI_APPS' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Mini Apps ({miniapps.length})
          </button>
          <button 
            onClick={() => setActiveTab('PROPOSALS')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'PROPOSALS' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Permission Proposals ({proposals.length})
          </button>
        </div>

        <Card className="p-0!">
          <div className="overflow-x-auto">
            {activeTab === 'PROPOSALS' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Mini App</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Permission</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Date Submitted</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                    {isAdminOrSuperAdmin && (
                      <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">Loading proposals...</td>
                    </tr>
                  ) : proposals.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">No pending proposals in the queue.</td>
                    </tr>
                  ) : (
                    proposals.map((proposal) => {
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
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : proposal.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                  : proposal.status === 'IN_DEVELOPMENT'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                            }`}>
                              {proposal.status === 'PENDING_REVIEW' ? 'Pending Review' : proposal.status === 'IN_DEVELOPMENT' ? 'In Development' : proposal.status}
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
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 transition-colors"
                              >
                                Review Proposal
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
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Mini App</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Date Submitted</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                    {isAdminOrSuperAdmin && (
                      <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">Loading mini apps...</td>
                    </tr>
                  ) : miniapps.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrSuperAdmin ? 5 : 4} className="px-6 py-8 text-center text-slate-500">No pending mini apps in the queue.</td>
                    </tr>
                  ) : (
                    miniapps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                          {app.name || 'Unknown App'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{app.category}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20`}>
                            {app.status === 'PENDING_REVIEW' ? 'Pending Review' : app.status}
                          </span>
                        </td>
                        {isAdminOrSuperAdmin && (
                          <td className="px-6 py-4 text-right">
                            <Link 
                              href={`/miniapps/${app.id}`} 
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-300 transition-colors"
                            >
                              Review App
                            </Link>
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
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permission</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{selectedProposal.permissionKey}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requested By</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{selectedProposal.miniApp?.name || 'Unknown App'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {selectedProposal.createdAt ? new Date(selectedProposal.createdAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    {selectedProposal.status === 'PENDING_REVIEW' ? 'Pending Review' : selectedProposal.status}
                  </span>
                </div>
              </div>

              {selectedProposal.description && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Context & Justification</label>
                  <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    {selectedProposal.description}
                  </div>
                </div>
              )}

              {decisionMode === 'REJECT' ? (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejection Reason *</label>
                  <textarea 
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this proposal is rejected..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/50 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none placeholder:text-slate-400"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Version (Optional)</label>
                  <input 
                    type="text"
                    value={targetVersion}
                    onChange={(e) => setTargetVersion(e.target.value)}
                    placeholder="e.g. 2.1.0"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-1">
              {decisionMode === 'REJECT' ? (
                <div className="flex space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setDecisionMode('VIEW')}
                    disabled={isSubmittingDecision}
                    className="flex-1 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('REJECTED')}
                    disabled={isSubmittingDecision || !rejectReason.trim()}
                    className="flex-1 py-2 text-sm font-medium rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmittingDecision ? 'Submitting...' : 'Confirm Reject'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision('APPROVED')}
                      disabled={isSubmittingDecision}
                      className="py-2.5 px-3 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('IN_DEVELOPMENT')}
                      disabled={isSubmittingDecision}
                      className="py-2.5 px-3 text-sm font-semibold rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      In Development
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDecisionMode('REJECT')}
                    disabled={isSubmittingDecision}
                    className="w-full py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                  >
                    Reject Proposal
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
