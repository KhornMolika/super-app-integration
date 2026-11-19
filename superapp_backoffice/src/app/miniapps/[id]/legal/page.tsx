'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { miniappsApi } from '@/api';
import MiniAppLegalViewer from '@/components/miniapp-detail/MiniAppLegalViewer';
import { ArrowLeft, ShieldAlert, Sparkles, Scale, Layers } from 'lucide-react';

function MiniAppLegalPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const policyType = searchParams?.get('type') === 'privacy' ? 'privacy' : 'terms';

  const [miniApp, setMiniApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApp = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await miniappsApi.getById(id);
      setMiniApp(data);
    } catch (err: any) {
      console.error('Failed to load MiniApp for legal policies:', err);
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
        <p className="text-sm text-slate-500">Loading application legal and policy disclosures...</p>
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
          Legal Policies Unavailable
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {error || 'Unable to retrieve MiniApp legal records.'}
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
    <div className="w-full min-w-0 pb-16 animate-in fade-in duration-300 space-y-6">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/miniapps" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            MiniApps
          </Link>
          <span>/</span>
          <Link href={`/miniapps/${id}`} className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors truncate max-w-[150px]">
            {miniApp.name || miniApp.appId}
          </Link>
          <span>/</span>
          <span className="text-brand-600 dark:text-brand-400 font-bold">
            Legal & Policy Documents
          </span>
        </div>

        <Link
          href={`/miniapps/${id}?tab=legal`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to MiniApp Management</span>
        </Link>
      </div>

      {/* MiniApp Profile Header Card */}
      <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center shadow-sm">
            {miniApp.logo || miniApp.iconUrl ? (
              <img
                src={miniApp.logo || miniApp.iconUrl}
                alt={miniApp.name || 'MiniApp logo'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Scale className="w-7 h-7 text-brand-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {miniApp.name || miniApp.appId}
              </h1>
              {miniApp.currentReleaseVersion && (
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                  v{miniApp.currentReleaseVersion}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-mono">{miniApp.appId}</span>
              {miniApp.category && (
                <>
                  <span>•</span>
                  <span className="capitalize">{miniApp.category.toLowerCase()}</span>
                </>
              )}
              {miniApp.organization?.name && (
                <>
                  <span>•</span>
                  <span>{miniApp.organization.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Public Document View</span>
          </span>
        </div>
      </div>

      {/* Main Legal Policy Viewer Component */}
      <MiniAppLegalViewer
        miniApp={miniApp}
        isStandalonePage={true}
        defaultTab={policyType}
      />
    </div>
  );
}

export default function MiniAppLegalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MiniAppLegalPageContent />
    </Suspense>
  );
}
