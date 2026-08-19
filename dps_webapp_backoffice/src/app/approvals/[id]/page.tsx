'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { useConfirm } from '@/components/ui/ConfirmationProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ReviewApprovalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [appData, setAppData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/mini-apps/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setAppData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!appData) {
    return <div className="text-center text-red-500 mt-10">Application not found.</div>;
  }

  const handleApprove = async () => {
    const confirmed = await confirm({
      title: 'Approve & Publish',
      message: 'Are you sure you want to approve this application? It will immediately become available in the Super App.',
      confirmText: 'Approve & Publish',
      confirmVariant: 'success'
    });
    
    if (confirmed) {
      try {
        await fetch(`${API_URL}/mini-apps/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Published'
          })
        });
        router.push('/approvals');
      } catch (error) {
        console.error('Failed to approve', error);
      }
    }
  };

  const handleReject = async () => {
    const confirmed = await confirm({
      title: 'Reject Application',
      message: 'Are you sure you want to reject this application? The developer will be notified to make changes.',
      confirmText: 'Reject',
      confirmVariant: 'danger'
    });
    
    if (confirmed) {
      try {
        await fetch(`${API_URL}/mini-apps/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected' })
        });
        router.push('/approvals');
      } catch (error) {
        console.error('Failed to reject', error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/approvals" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-500/30 transition-all shadow-sm group">
            <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Review Submission</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-mono">{appData.id}</p>
          </div>
        </div>
        <span className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
          {appData.status === 'Processing' || appData.status === 'Draft' ? 'Pending Review' : appData.status}
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader title="Application Details" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">App Name</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{appData.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Organization / Team</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{appData.teamName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Category</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{appData.category || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Integration Method</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{appData.integrationMethod}</p>
          </div>
          <div className="col-span-1 md:col-span-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Description</p>
            <p className="text-slate-700 dark:text-slate-300">
              {appData.fullDescription || appData.shortDescription || '-'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-8">
        <CardHeader title="Requested Native Permissions" />
        {(!appData.permissions || appData.permissions.length === 0) ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No native permissions requested.</p>
        ) : (
          <div className="space-y-4">
            {appData.permissions.map((perm: any, idx: number) => {
              const isNew = perm.status === 'DRAFT';
              
              return (
                <div key={idx} className={`p-4 rounded-xl border ${isNew ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700/50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{perm.type}</span>
                      {isNew && (
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">NEW REQUEST</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Purpose:</span> {perm.purpose || '-'}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Terms/Policy URL:</span>{' '}
                    {perm.termsUrl ? (
                      <a href={perm.termsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                        {perm.termsUrl}
                      </a>
                    ) : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex justify-end space-x-4">
        <Button 
          onClick={handleReject}
          className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-700 !shadow-none border border-rose-200 dark:border-rose-500/20"
        >
          Reject
        </Button>
        <Button 
          onClick={handleApprove}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
        >
          Approve & Publish
        </Button>
      </div>
    </div>
  );
}
