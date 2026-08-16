'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';
import { useConfirm } from '@/components/ui/ConfirmationProvider';

export default function ReviewApprovalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const confirm = useConfirm();
  // In a real app, you would fetch the submission details using params.id
  
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/approvals" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-500/30 transition-all shadow-sm group">
            <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Review Submission</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-mono">{params.id}</p>
          </div>
        </div>
        <span className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
          Pending Review
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader title="Application Details" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">App Name</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Banking Portal</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Organization</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Banking Regulator</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Category</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Banking</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">App URL</p>
            <a href="#" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">https://banking.nbc.org.kh</a>
          </div>
          <div className="col-span-1 md:col-span-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Description</p>
            <p className="text-slate-700 dark:text-slate-300">
              The official banking portal for consumers to check unified banking records and file complaints securely.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-8">
        <CardHeader title="FSA Verification Checklist" />
        <div className="space-y-6">
          <label className="flex items-start space-x-4 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-5 h-5 text-brand-600 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-600 dark:bg-slate-700 cursor-pointer" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Security Compliance</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The application uses HTTPS and follows data privacy guidelines.</p>
            </div>
          </label>
          <label className="flex items-start space-x-4 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-5 h-5 text-brand-600 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-600 dark:bg-slate-700 cursor-pointer" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Authentication Compatibility</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">OAuth2/OIDC settings and redirect URIs are correct.</p>
            </div>
          </label>
          <label className="flex items-start space-x-4 cursor-pointer group">
            <input type="checkbox" className="mt-1 w-5 h-5 text-brand-600 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-600 dark:bg-slate-700 cursor-pointer" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">UI Guidelines</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The app adheres to the shared DPS Design System.</p>
            </div>
          </label>
        </div>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button 
          onClick={async () => {
            const confirmed = await confirm({
              title: 'Reject Application',
              message: 'Are you sure you want to reject this application? The developer will be notified to make changes.',
              confirmText: 'Reject',
              confirmVariant: 'danger'
            });
            if (confirmed) {
              // Perform rejection logic here
              router.push('/approvals');
            }
          }}
          className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-700 !shadow-none border border-rose-200 dark:border-rose-500/20"
        >
          Reject
        </Button>
        <Button 
          onClick={async () => {
            const confirmed = await confirm({
              title: 'Approve & Publish',
              message: 'Are you sure you want to approve this application? It will immediately become available in the Super App.',
              confirmText: 'Approve & Publish',
              confirmVariant: 'success'
            });
            if (confirmed) {
              // Perform approval logic here
              router.push('/approvals');
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
        >
          Approve & Publish
        </Button>
      </div>
    </div>
  );
}
