'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { miniappsApi } from '@/api';
import ValidationReportTab from '@/components/ui/ValidationReportTab';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

function MiniAppSecurityPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const version = searchParams?.get('version');

  const [miniApp, setMiniApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApp = async (silent = false) => {
    if (!id) return;
    try {
      if (!silent && !miniApp) setLoading(true);
      setError(null);
      const data = await miniappsApi.getById(id);
      setMiniApp(data);
    } catch (err: any) {
      console.error('Failed to load MiniApp for security report:', err);
      setError(err?.message || 'MiniApp not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-500">Loading security verification telemetry...</p>
      </div>
    );
  }

  if (error || !miniApp) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
          Security Report Unavailable
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {error || 'Unable to retrieve MiniApp security audit records.'}
        </p>
        <Link
          href={`/miniapps/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to MiniApp Overview</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 animate-in fade-in duration-300">
      <ValidationReportTab
        miniApp={miniApp}
        onRefresh={fetchApp}
        isStandalonePage={true}
      />
    </div>
  );
}

export default function MiniAppSecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MiniAppSecurityPageContent />
    </Suspense>
  );
}
