"use client";

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Proposal = {
  id: string;
  miniAppId: string;
  permissionKey: string;
  status: string;
  createdAt: string;
  miniApp?: {
    name: string;
  };
};

export default function ReviewQueuePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProposals() {
      try {
        const res = await fetch(`${API_URL}/permission-proposals`);
        if (res.ok) {
          const data = await res.json();
          setProposals(data);
        }
      } catch (err) {
        console.error('Failed to fetch permission proposals', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProposals();
  }, []);

  return (
    <ProtectedRoute permission="permission_proposal:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Review Queue</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage pending Mini App permission proposals.</p>
          </div>
        </div>

        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Mini App</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Permission</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Date Submitted</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading proposals...</td>
                  </tr>
                ) : proposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No pending proposals in the queue.</td>
                  </tr>
                ) : (
                  proposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                        {proposal.miniApp?.name || proposal.miniAppId || 'Unknown App'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{proposal.permissionKey}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          proposal.status === 'PENDING_REVIEW' || proposal.status === 'Pending' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : proposal.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        }`}>
                          {proposal.status === 'PENDING_REVIEW' ? 'Pending Review' : proposal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium text-sm">Review</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
