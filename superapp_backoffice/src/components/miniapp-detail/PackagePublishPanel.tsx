'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
import { ExternalLink } from 'lucide-react';
import {
  CheckCircleIcon,
  ClockIcon,
  PackageIcon,
  RefreshIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@/components/ui/Icons';
import { miniappsApi } from '@/api/miniapps.api';
import { isFlutterArtifact } from '@/lib/miniapp-form.validator';
import { classifyDiagnosticError } from '@/lib/diagnostic-classifier';
import { useAuth } from '@/lib/auth';

type StepState = 'done' | 'running' | 'failed' | 'waiting';

interface Step {
  key: string;
  title: string;
  state: StepState;
  lines: string[];
  icon: React.ReactNode;
}

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

function fileName(path?: string | null) {
  if (!path) return '';
  return String(path).split('?')[0].split('/').pop() || String(path);
}

const STATE_STYLES: Record<StepState, { ring: string; text: string; label: string }> = {
  done: {
    ring: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Done',
  },
  running: {
    ring: 'border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
    text: 'text-cyan-700 dark:text-cyan-400',
    label: 'In progress',
  },
  failed: {
    ring: 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    text: 'text-rose-700 dark:text-rose-400',
    label: 'Failed',
  },
  waiting: {
    ring: 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    label: 'Waiting',
  },
};

function StateIcon({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircleIcon className="w-4 h-4" />;
  if (state === 'failed') return <XCircleIcon className="w-4 h-4" />;
  if (state === 'running') return <RefreshIcon className="w-4 h-4 animate-spin" />;
  return <ClockIcon className="w-4 h-4" />;
}

export interface PackagePublishPanelProps {
  miniAppId: string;
  formData: any;
  /** May publish (miniapp:approve). Others see the progress only. */
  canPublish: boolean;
  /** Reloads the mini app after a publish, so the steps show the new state. */
  onRefresh: () => void;
}

/**
 * Where a Flutter package is on its way to the Super App build:
 *   archive in MinIO quarantine -> security scan -> published to Nexus pub-hosted.
 */
export function PackagePublishPanel({ miniAppId, formData, canPublish, onRefresh }: PackagePublishPanelProps) {
  const [busy, setBusy] = useState(false);
  const { role } = useAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  // A new version under review carries its own package and scan
  const rev = formData?.pendingRevision;
  const inRevision = Boolean(rev?.integrationConfig);
  const method = String((inRevision && rev.integrationMethod) || formData?.integrationMethod || '').toUpperCase();
  const conf: Record<string, any> =
    (inRevision ? rev.integrationConfig : formData?.integrationConfigFlutter || formData?.integrationConfig) || {};
  if (method !== 'FLUTTER_PACKAGE' || !isFlutterArtifact(conf)) return null;

  const scan = String((inRevision && rev.validationStatus) || formData?.validationStatus || '').toUpperCase();
  const storagePath: string | undefined = conf.packageStoragePath || conf.minioKey;
  const published = Boolean(conf.nexusPublishedVersion) && !conf.nexusPublishError;
  const publishError: string | undefined = conf.nexusPublishError || undefined;

  const archiveStep: Step = {
    key: 'minio',
    title: isSuperAdmin ? '1. MinIO Quarantine' : '1. Package Ingestion',
    icon: <PackageIcon className="w-4 h-4" />,
    state: storagePath ? 'done' : 'failed',
    lines: storagePath
      ? [
          fileName(conf.archiveFilename || storagePath),
          conf.archiveSize ? `${Math.round(Number(conf.archiveSize) / 1024)} KB` : '',
          conf.archiveChecksum ? `sha256 ${String(conf.archiveChecksum).slice(0, 12)}...` : '',
        ].filter(Boolean)
      : [isSuperAdmin ? 'No archive stored in MinIO. S3 bucket key missing.' : 'No archive uploaded. Developer must attach the package archive.'],
  };

  const scanState: StepState =
    scan === 'PASSED' ? 'done' : scan === 'FAILED' ? 'failed' : ['RUNNING', 'PENDING', 'QUEUED'].includes(scan) ? 'running' : 'waiting';
  const scanStep: Step = {
    key: 'scan',
    title: isSuperAdmin ? '2. Security Audit & Gates' : '2. Security Clearance',
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    state: scanState,
    lines: [
      scanState === 'done'
        ? (isSuperAdmin ? 'Clearance Approved (All Gates Passed)' : 'Passed security verification.')
        : scanState === 'failed'
        ? (isSuperAdmin ? 'Failed automated gates. Archive quarantined in MinIO.' : 'Action required: Security violations detected.')
        : scanState === 'running'
        ? (isSuperAdmin ? 'Analyzing package archive from MinIO...' : 'Analyzing package security...')
        : 'Pending mini app submission.',
    ],
  };

  const nexusState: StepState = published
    ? 'done'
    : scanState !== 'done'
    ? 'waiting'
    : publishError
    ? 'failed'
    : busy
    ? 'running'
    : 'waiting';
  const nexusStep: Step = {
    key: 'nexus',
    title: isSuperAdmin ? '3. Nexus Pub-Hosted' : '3. SuperApp Release',
    icon: <PackageIcon className="w-4 h-4" />,
    state: busy ? 'running' : nexusState,
    lines: busy
      ? (isSuperAdmin ? ['Publishing to Nexus registry...'] : ['Preparing package for release...'])
      : published
      ? [
          isSuperAdmin
            ? `${conf.nexusPublishedPackage || conf.packageName} ${conf.nexusPublishedVersion || ''} in pub-hosted`
            : `${conf.nexusPublishedPackage || conf.packageName} ${conf.nexusPublishedVersion || ''} released`,
          conf.nexusPublishedAt ? (isSuperAdmin ? `Published ${formatWhen(conf.nexusPublishedAt)}` : `Released ${formatWhen(conf.nexusPublishedAt)}`) : '',
        ].filter(Boolean)
      : publishError
      ? (() => {
          const diag = classifyDiagnosticError(publishError);
          return [
            isSuperAdmin
              ? `[${diag.accountabilityRole}] ${diag.category}: ${publishError}`
              : 'Distribution blocked. Contact Super Admin for clearance.',
            ...(isSuperAdmin && diag.remedy ? [`Action: ${diag.remedy}`] : []),
          ];
        })()
      : scanState === 'done'
      ? [isSuperAdmin ? 'Not published yet. Will publish to Nexus during build.' : 'Ready for SuperApp distribution during build.']
      : ['Awaiting security clearance approval.'],
  };

  const steps = [archiveStep, scanStep, nexusStep];
  const hasError = Boolean(publishError || steps.some((s) => s.state === 'failed'));
  const allDone = steps.every((s) => s.state === 'done');
  const [isExpanded, setIsExpanded] = useState<boolean>(() => hasError);

  // If the SuperApp Fastlane CI build is actively in progress, MiniAppLifecycleBanners already displays the build steps
  if (
    formData?.status === 'BUILDING' ||
    formData?.buildStatus === 'IN_PROGRESS' ||
    formData?.buildStatus === 'BUILDING'
  ) {
    return null;
  }

  // If all packaging steps (MinIO, security scan, Nexus) are already complete with no errors,
  // remove the panel to avoid duplicating the build pipeline and cluttering General Information
  if (allDone && !hasError) {
    return null;
  }

  const showButton = canPublish && scanState === 'done' && Boolean(storagePath || published);
  const buttonLabel = published ? 'Check Nexus again' : publishError ? 'Retry publish' : 'Publish to Nexus';

  const publish = async () => {
    setBusy(true);
    try {
      const res = await miniappsApi.publishPackage(miniAppId);
      toast.success(
        res?.publishedNow
          ? `${res.packageName} ${res.version} was published to Nexus.`
          : `${res?.packageName} ${res?.version} is in Nexus.`,
        'Package in Nexus',
      );
    } catch (err: any) {
      const diag = classifyDiagnosticError(err?.message);
      toast.error(
        diag.isInfrastructure
          ? `[${diag.accountabilityLabel}] ${diag.category}: ${diag.remedy}`
          : err?.message || 'The package could not be published to Nexus.',
        diag.category || 'Publish Failed',
      );
    } finally {
      setBusy(false);
      onRefresh();
    }
  };

  return (
    <section
      aria-label="Package publishing"
      className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs transition-all overflow-hidden"
    >
      {/* Compact Collapsed View */}
      {!isExpanded ? (
        <div className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                allDone
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                  : hasError
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              {allDone ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : hasError ? (
                <XCircleIcon className="w-4 h-4" />
              ) : (
                <PackageIcon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Package Publishing{inRevision ? ' (New Version)' : ''}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    allDone
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : hasError
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {allDone ? '3/3 Steps Complete' : hasError ? 'Issue Detected' : 'Pipeline Active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {allDone
                  ? (isSuperAdmin
                      ? `${conf.nexusPublishedPackage || conf.packageName} ${conf.nexusPublishedVersion || ''} hosted in Nexus pub-hosted`
                      : `${conf.nexusPublishedPackage || conf.packageName} ${conf.nexusPublishedVersion || ''} distributed in SuperApp`)
                  : hasError
                  ? (isSuperAdmin ? (publishError || 'One or more package steps requires attention.') : 'One or more security checks require attention.')
                  : (isSuperAdmin ? 'MinIO quarantine → Security scan → Nexus pub-hosted.' : 'Package Ingestion → Security Clearance → SuperApp Distribution.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {showButton && (
              <Button
                variant={publishError ? 'primary' : 'outline'}
                size="sm"
                onClick={publish}
                disabled={busy}
                className="h-8 text-xs shrink-0"
              >
                <span className="inline-flex items-center gap-1.5">
                  <RefreshIcon className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
                  {busy ? 'Publishing...' : buttonLabel}
                </span>
              </Button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View Details</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Detailed Expanded View */
        <div className="p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isSuperAdmin
                  ? `Package Publishing Pipeline${inRevision ? ' (New Version)' : ''}`
                  : `Release Distribution Pipeline${inRevision ? ' (New Version)' : ''}`}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isSuperAdmin
                  ? 'MinIO quarantine → Security scan → Nexus pub-hosted. Super App build reads the package from Nexus.'
                  : 'Package Ingestion → Security Clearance → SuperApp Distribution.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showButton && (
                <Button
                  variant={publishError ? 'primary' : 'outline'}
                  size="sm"
                  onClick={publish}
                  disabled={busy}
                  className="h-8 text-xs shrink-0"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshIcon className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                    {busy ? 'Publishing...' : buttonLabel}
                  </span>
                </Button>
              )}

              <Link
                href={`/miniapps/${miniAppId}/pipeline`}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
                title="Open dedicated pipeline workspace"
              >
                <span>Full Pipeline</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Hide</span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map((step, i) => {
              const style = STATE_STYLES[step.state];
              return (
                <li
                  key={step.key}
                  className="relative flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 min-w-0 motion-stepper-card hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                >
                  <div className={`relative w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-200 ${style.ring} ${
                    step.state === 'done' ? 'animate-success-pop' : ''
                  }`}>
                    {step.state === 'running' && (
                      <span className="absolute inset-0 rounded-lg bg-cyan-400/40 animate-heartbeat-ring -z-10" />
                    )}
                    <StateIcon state={step.state} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {i + 1}. {step.title}
                      </span>
                      <span className={`text-[10px] font-semibold ${style.text}`}>{style.label}</span>
                    </div>
                    {step.lines.map((line, j) => (
                      <p
                        key={j}
                        className={`text-[11px] mt-0.5 break-words ${
                          step.state === 'failed' && j === 0
                            ? 'text-rose-600 dark:text-rose-400 font-medium'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export default PackagePublishPanel;
