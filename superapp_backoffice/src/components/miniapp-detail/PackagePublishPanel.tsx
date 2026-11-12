'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/inputs';
import { toast } from '@/components/ui/Toast';
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
 * Approval needs the archive in MinIO; the test build and the production release
 * need the package in Nexus and stop when it is not there, so this shows why,
 * and lets a reviewer publish (or retry) before starting a build.
 */
export function PackagePublishPanel({ miniAppId, formData, canPublish, onRefresh }: PackagePublishPanelProps) {
  const [busy, setBusy] = useState(false);

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
    title: 'Archive in MinIO',
    icon: <PackageIcon className="w-4 h-4" />,
    state: storagePath ? 'done' : 'failed',
    lines: storagePath
      ? [
          fileName(conf.archiveFilename || storagePath),
          conf.archiveSize ? `${Math.round(Number(conf.archiveSize) / 1024)} KB` : '',
          conf.archiveChecksum ? `sha256 ${String(conf.archiveChecksum).slice(0, 12)}...` : '',
        ].filter(Boolean)
      : ['No archive stored. The developer must attach the package archive and submit again.'],
  };

  const scanState: StepState =
    scan === 'PASSED' ? 'done' : scan === 'FAILED' ? 'failed' : ['RUNNING', 'PENDING', 'QUEUED'].includes(scan) ? 'running' : 'waiting';
  const scanStep: Step = {
    key: 'scan',
    title: 'Security scan',
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    state: scanState,
    lines: [
      scanState === 'done'
        ? 'Passed. The archive may leave quarantine.'
        : scanState === 'failed'
        ? 'Failed. The package stays in MinIO and is not published.'
        : scanState === 'running'
        ? 'Scanning the archive from MinIO.'
        : 'Starts when the mini app is submitted.',
    ],
  };

  const nexusState: StepState = published
    ? 'done'
    : publishError
    ? 'failed'
    : scanState !== 'done'
    ? 'waiting'
    : busy
    ? 'running'
    : 'waiting';
  const nexusStep: Step = {
    key: 'nexus',
    title: 'Published to Nexus',
    icon: <PackageIcon className="w-4 h-4" />,
    state: busy ? 'running' : nexusState,
    lines: busy
      ? ['Publishing from MinIO and confirming that Nexus lists the version.']
      : published
      ? [
          `${conf.nexusPublishedPackage || conf.packageName} ${conf.nexusPublishedVersion} in pub-hosted`,
          conf.nexusPublishedAt ? `Published ${formatWhen(conf.nexusPublishedAt)}` : '',
          conf.nexusPublishCheckedAt ? `Last confirmed ${formatWhen(conf.nexusPublishCheckedAt)}` : '',
        ].filter(Boolean)
      : publishError
      ? [publishError, conf.nexusPublishCheckedAt ? `Tried ${formatWhen(conf.nexusPublishCheckedAt)}` : ''].filter(Boolean)
      : scanState === 'done'
      ? ['Not published yet. The test build publishes it first, or publish it now.']
      : ['After the security scan passes.'],
  };

  const steps = [archiveStep, scanStep, nexusStep];
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
      toast.error(err?.message || 'The package could not be published to Nexus.', 'Publish Failed');
    } finally {
      setBusy(false);
      onRefresh();
    }
  };

  return (
    <section
      aria-label="Package publishing"
      className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Package publishing{inRevision ? ' (new version)' : ''}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            MinIO quarantine, then security scan, then Nexus pub-hosted. The Super App build reads the package from Nexus.
          </p>
        </div>
        {showButton && (
          <Button variant={publishError ? 'primary' : 'outline'} size="sm" onClick={publish} disabled={busy} className="shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <RefreshIcon className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
              {busy ? 'Publishing...' : buttonLabel}
            </span>
          </Button>
        )}
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, i) => {
          const style = STATE_STYLES[step.state];
          return (
            <li
              key={step.key}
              className="relative flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 min-w-0"
            >
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${style.ring}`}>
                <StateIcon state={step.state} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.title}</span>
                  <span className={`text-[11px] font-medium ${style.text}`}>{style.label}</span>
                </div>
                {step.lines.map((line, j) => (
                  <p
                    key={j}
                    className={`text-xs mt-1 break-words ${
                      step.state === 'failed' && j === 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'
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
    </section>
  );
}

export default PackagePublishPanel;
