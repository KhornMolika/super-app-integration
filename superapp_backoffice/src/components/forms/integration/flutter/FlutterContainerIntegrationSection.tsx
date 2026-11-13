"use client";

import React from "react";
import { CheckIcon } from "@/components/ui/Icons";

export interface FlutterContainerIntegrationSectionProps {
  formData: any;
  flutterConfig: any;
  pubspecStatus: any;
  isSuperAdminOrAdmin: boolean;
  isPrechecking: boolean;
  isTestingResolution: boolean;
  isSyncingPubspec: boolean;
  precheckResult: any;
  resolutionResult: any;
  onRunPrecheck: () => void;
  onSyncPubspec: () => void;
  onTestResolution: () => void;
  onClosePrecheckResult: () => void;
  onCloseResolutionResult: () => void;
}

const btn =
  "h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors";

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

/**
 * Does the package resolve with the Super App's other dependencies?
 * Developers get one check; admins also get the container tools once the app
 * is approved.
 */
export default function FlutterContainerIntegrationSection({
  formData,
  flutterConfig = {},
  pubspecStatus,
  isSuperAdminOrAdmin,
  isPrechecking,
  isTestingResolution,
  isSyncingPubspec,
  precheckResult,
  resolutionResult,
  onRunPrecheck,
  onSyncPubspec,
  onTestResolution,
  onClosePrecheckResult,
  onCloseResolutionResult,
}: FlutterContainerIntegrationSectionProps) {
  const status = (formData.status || "DRAFT").toUpperCase();
  const isPublished = ["APPROVED", "TESTING", "ACTIVE"].includes(status) && Boolean(formData.id);

  const rawPkg = (flutterConfig.packageName || formData.name || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const bound =
    pubspecStatus?.miniAppDependencies?.[rawPkg] ||
    pubspecStatus?.miniAppDependencies?.[(formData.appId || "").toLowerCase().replace(/[^a-z0-9_]/g, "_")];
  const isInjected = Boolean(bound);

  const busy = isPrechecking || isTestingResolution || isSyncingPubspec;

  const result = precheckResult ? precheckResult.data ?? precheckResult : null;
  const conflicts: string[] = result?.directConflicts || [];
  const newPackages: any[] = result?.newPackages || [];
  const resultTone = result?.compatible
    ? "text-brand-700 dark:text-brand-300"
    : result?.isPendingPublication
      ? "text-amber-700 dark:text-amber-300"
      : "text-rose-700 dark:text-rose-300";
  const resultTitle = result?.compatible
    ? "Works with the Super App."
    : result?.isPendingPublication
      ? "Not published yet, so only part of it could be checked."
      : "Conflicts with the Super App's packages.";

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Works with the Super App</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <code className="font-mono text-slate-700 dark:text-slate-300">{rawPkg || "your_package"}</code>
            {" · "}
            {isPublished && isInjected
              ? "in the Super App"
              : isPublished
                ? "approved, not synced yet"
                : "added when the app is approved"}
          </p>
        </div>
        <button type="button" onClick={onRunPrecheck} disabled={busy} className={btn}>
          {isPrechecking ? "Checking..." : "Check compatibility"}
        </button>
      </div>

      {isSuperAdminOrAdmin && isPublished && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-auto">Admin tools</span>
          <button type="button" onClick={onTestResolution} disabled={busy} className={btn}>
            {isTestingResolution ? "Resolving..." : "Test resolution"}
          </button>
          <button type="button" onClick={onSyncPubspec} disabled={busy} className={btn}>
            {isSyncingPubspec ? "Syncing..." : "Sync container"}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-sm space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium flex items-center gap-1.5 ${resultTone}`}>
              {result.compatible && <CheckIcon className="w-4 h-4" />}
              {resultTitle}
            </p>
            <CloseButton onClick={onClosePrecheckResult} />
          </div>
          {result.message && !result.compatible && (
            <p className="text-xs text-slate-600 dark:text-slate-400">{result.message}</p>
          )}
          {conflicts.length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5 font-mono text-xs text-slate-700 dark:text-slate-300">
              {conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {newPackages.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adds: {newPackages.map((p: any) => `${p.package} ${p.version}`).join(", ")}
            </p>
          )}
        </div>
      )}

      {resolutionResult && (
        <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2 text-slate-400">
            <span>
              flutter pub get{resolutionResult.dryRun ? " --dry-run" : ""} · exit {resolutionResult.exitCode ?? "?"}
            </span>
            <CloseButton onClick={onCloseResolutionResult} />
          </div>
          {resolutionResult.message && (
            <p className={resolutionResult.success ? "text-slate-200" : "text-rose-300"}>{resolutionResult.message}</p>
          )}
          {resolutionResult.conflicts?.length > 0 && (
            <ul className="space-y-0.5 text-rose-300">
              {resolutionResult.conflicts.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {resolutionResult.stdout && (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-300">{resolutionResult.stdout}</pre>
          )}
          {resolutionResult.stderr && !resolutionResult.success && (
            <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap text-rose-300">{resolutionResult.stderr}</pre>
          )}
        </div>
      )}
    </section>
  );
}
