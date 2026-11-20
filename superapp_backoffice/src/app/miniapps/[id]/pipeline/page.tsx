'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { miniappsApi } from '@/api';
import { PackagePublishPanel } from '@/components/miniapp-detail/PackagePublishPanel';
import { useAuth } from '@/lib/auth';
import {
  ArrowLeft,
  Package,
  Layers,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Cpu,
  Server,
  Workflow,
  AlertCircle,
} from 'lucide-react';

function MiniAppPipelinePageContent() {
  const params = useParams();
  const id = params?.id as string;
  const { can, role } = useAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';

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
      console.error('Failed to load MiniApp for pipeline:', err);
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
        <p className="text-sm text-slate-500">Loading CI/CD artifact & build pipeline telemetry...</p>
      </div>
    );
  }

  if (error || !miniApp) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
          Pipeline Telemetry Unavailable
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {error || 'Unable to retrieve MiniApp package pipeline telemetry.'}
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
            Artifact & Packaging Pipeline
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
          <Link
            href={`/miniapps/${id}?tab=versions`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Versions</span>
          </Link>
        </div>
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
              <Package className="w-7 h-7 text-brand-500" />
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
              <span>•</span>
              <span className="capitalize">{miniApp.integrationMethod || 'Flutter Package'}</span>
              {miniApp.organization?.name && (
                <>
                  <span>•</span>
                  <span>{miniApp.organization.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            <Workflow className="w-3.5 h-3.5 text-brand-500" />
            <span>DevOps Pipeline Workspace</span>
          </span>
        </div>
      </div>

      {/* Package Publish Pipeline Panel */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-500" />
              <span>{isSuperAdmin ? 'Artifact Packaging & Nexus Ingestion Pipeline' : 'Artifact Packaging & SuperApp Release Pipeline'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Automated quarantine, CVE scanning, and distribution into the sovereign SuperApp repository.
            </p>
          </div>
        </div>

        <PackagePublishPanel
          miniAppId={id}
          formData={miniApp}
          canPublish={can('miniapp:approve')}
          onRefresh={fetchApp}
        />
      </div>

      {/* Infrastructure Telemetry Details */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Server className="w-4 h-4 text-emerald-500" />
              <span>S3 / MinIO Quarantine</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Encrypted object storage housing original uploaded package archives prior to automated malware and AST sanitization.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <span>Security Scan Gate</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Automated CVE-2026 vulnerability checks, manifest verification, and restricted API analysis.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-brand-500" />
              <span>Sonatype Nexus Pub-Hosted</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Internal authenticated registry serving approved Flutter packages to SuperApp mobile client compilation containers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MiniAppPipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MiniAppPipelinePageContent />
    </Suspense>
  );
}
