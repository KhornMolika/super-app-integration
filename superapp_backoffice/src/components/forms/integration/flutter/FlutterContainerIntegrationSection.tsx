"use client";

import React from "react";
import { Button } from "@/components/ui/inputs";
import {
  PackageIcon,
  ShieldCheckIcon,
  ZapIcon,
  GlobeIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/ui/Icons";

export interface FlutterContainerIntegrationSectionProps {
  formData: any;
  flutterConfig: any;
  pubspecStatus: any;
  isSuperAdminOrAdmin: boolean;
  isPrechecking: boolean;
  isTestingResolution: boolean;
  isSyncingPubspec: boolean;
  isRebuildingSandbox: boolean;
  precheckResult: any;
  resolutionResult: any;
  sandboxRebuildMessage: string | null;
  onRunPrecheck: () => void;
  onSyncPubspec: () => void;
  onTestResolution: () => void;
  onRebuildSandbox: () => void;
  onClosePrecheckResult: () => void;
  onCloseResolutionResult: () => void;
}

export default function FlutterContainerIntegrationSection({
  formData,
  flutterConfig = {},
  pubspecStatus,
  isSuperAdminOrAdmin,
  isPrechecking,
  isTestingResolution,
  isSyncingPubspec,
  isRebuildingSandbox,
  precheckResult,
  resolutionResult,
  sandboxRebuildMessage,
  onRunPrecheck,
  onSyncPubspec,
  onTestResolution,
  onRebuildSandbox,
  onClosePrecheckResult,
  onCloseResolutionResult,
}: FlutterContainerIntegrationSectionProps) {
  const rawStatus = (formData.status || "DRAFT").toUpperCase();
  const isDraftOrQuarantine =
    rawStatus === "DRAFT" || rawStatus === "QUARANTINE" || !formData.id;
  const isInReview = rawStatus === "IN_REVIEW";
  const isPendingApproval = isDraftOrQuarantine || isInReview;
  const isApprovedOrTesting =
    rawStatus === "APPROVED" || rawStatus === "TESTING";
  const isActive = rawStatus === "ACTIVE";
  const isPublished = isApprovedOrTesting || isActive;

  const rawPkg = (flutterConfig.packageName || formData.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");
  const targetPkg = rawPkg.replace(/-/g, "_");
  const boundConfig =
    pubspecStatus?.miniAppDependencies?.[targetPkg] ||
    pubspecStatus?.miniAppDependencies?.[rawPkg] ||
    pubspecStatus?.miniAppDependencies?.[
      (formData.appId || "").toLowerCase().replace(/[^a-z0-9_]/g, "_")
    ];
  const isInjected = Boolean(boundConfig);

  const bindingDesc =
    typeof boundConfig === "string"
      ? boundConfig
      : boundConfig?.path
      ? `path: ${boundConfig.path}`
      : boundConfig?.git
      ? `git: ${typeof boundConfig.git === "string" ? boundConfig.git : boundConfig.git.url || ""} (ref: ${boundConfig.git?.ref || "main"}${boundConfig.git?.path ? `, path: ${boundConfig.git.path}` : ""})`
      : boundConfig?.hosted
      ? `hosted: ${typeof boundConfig.hosted === "object" ? boundConfig.hosted.name || targetPkg : boundConfig.hosted} (${boundConfig.version || "^1.0.0"})`
      : isInjected
      ? JSON.stringify(boundConfig)
      : flutterConfig.gitUrl || flutterConfig.repoUrl
      ? `git: ${flutterConfig.gitUrl || flutterConfig.repoUrl} (ref: ${flutterConfig.gitBranch || flutterConfig.gitTag || flutterConfig.commitSha || flutterConfig.ref || "main"}${flutterConfig.gitPath || flutterConfig.packagePath ? `, path: ${flutterConfig.gitPath || flutterConfig.packagePath}` : ""})`
      : flutterConfig.packageStoragePath
      ? `artifact: ${flutterConfig.versionConstraint || "^1.0.0"}`
      : "Configured source will be injected into container upon approval";

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Super App Container Dependency Integration</span>
            </h4>
            {isSuperAdminOrAdmin && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                <ShieldCheckIcon className="w-3 h-3" />
                <span>SA Admin</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Automated extraction and dynamic AST injection into{" "}
            <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-400 font-semibold">
              superapp_mobile/pubspec.yaml
            </code>
            .
          </p>
        </div>

        {/* Dynamic Action Buttons according to Lifecycle State Matrix */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* State 1 & 2: DRAFT, QUARANTINE, IN_REVIEW -> Show ONLY Pre-check Conflicts */}
          {isPendingApproval && (
            <Button
              type="button"
              variant="primary"
              onClick={onRunPrecheck}
              disabled={isPrechecking || isTestingResolution || isSyncingPubspec}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              title="Simulate candidate dependency injection in an isolated dry-run workspace to pre-check conflicts before approval"
            >
              <ShieldCheckIcon
                className={`w-3.5 h-3.5 ${isPrechecking ? "animate-spin" : ""}`}
              />
              <span>{isPrechecking ? "Pre-checking..." : "Pre-check Conflicts"}</span>
            </Button>
          )}

          {/* State 3 & 4: APPROVED, TESTING, ACTIVE -> Show Live Container Controls */}
          {isPublished && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onRunPrecheck}
                disabled={isPrechecking || isTestingResolution || isSyncingPubspec}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-sm"
                title="Simulate candidate dependency injection in an isolated dry-run workspace"
              >
                <ShieldCheckIcon
                  className={`w-3.5 h-3.5 ${isPrechecking ? "animate-spin" : ""}`}
                />
                <span>{isPrechecking ? "Pre-checking..." : "Pre-check Conflicts"}</span>
              </Button>

              {isSuperAdminOrAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSyncPubspec}
                  disabled={isSyncingPubspec || isTestingResolution}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  title="Synchronize approved mini app packages into container pubspec.yaml"
                >
                  <PackageIcon
                    className={`w-3.5 h-3.5 ${isSyncingPubspec ? "animate-spin" : ""}`}
                  />
                  <span>{isSyncingPubspec ? "Syncing..." : "Sync Container"}</span>
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={onTestResolution}
                disabled={isTestingResolution || isSyncingPubspec}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                title="Run flutter pub get --dry-run in container to verify live multi-package dependency compatibility"
              >
                <ZapIcon
                  className={`w-3.5 h-3.5 ${
                    isTestingResolution ? "animate-spin text-amber-300" : "text-amber-400"
                  }`}
                />
                <span>{isTestingResolution ? "Resolving..." : "Test Pubspec Resolution"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Card - Focused Exclusively on this Mini App */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PackageIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white truncate">
                {targetPkg || "flutter_miniapp"}
              </span>
              {isPublished && isInjected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>INJECTED &amp; BOUND</span>
                </span>
              ) : isPublished && !isInjected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  <ZapIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>APPROVED (Ready for Sync)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <AlertTriangleIcon className="w-3.5 h-3.5" />
                  <span>PENDING (Auto on Approval)</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all flex items-center gap-1.5">
              <span className="text-slate-400">Binding:</span>
              <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                {bindingDesc}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 sm:text-right flex-shrink-0">
            <div>
              Container:{" "}
              <span className="font-mono text-slate-600 dark:text-slate-300">
                superapp_mobile
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center sm:justify-end gap-1 mt-0.5">
              <ShieldCheckIcon className="w-3 h-3" />
              <span>AST Safe Backup Active</span>
            </div>
          </div>
        </div>

        {/* Web Sandbox Rebuild Trigger */}
        {isSuperAdminOrAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <GlobeIcon className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <span>
                Need to compile and sync changes immediately to the live Super App Web Sandbox preview?
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onRebuildSandbox}
              disabled={isRebuildingSandbox}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              title="Trigger background Flutter Web sandbox compilation (SA Admin only)"
            >
              <GlobeIcon
                className={`w-3.5 h-3.5 ${isRebuildingSandbox ? "animate-spin" : ""}`}
              />
              <span>
                {isRebuildingSandbox ? "Rebuilding..." : "Rebuild Web Sandbox Preview"}
              </span>
            </Button>
          </div>
        )}

        {sandboxRebuildMessage && (
          <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0 text-sky-600" />
            <span>{sandboxRebuildMessage}</span>
          </div>
        )}

        {/* Pre-check Conflict Simulation Diagnostics Card */}
        {precheckResult && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm space-y-2 transition-all ${
              precheckResult.compatible
                ? "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                : precheckResult.isPendingPublication
                ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                : "bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                {precheckResult.compatible ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : precheckResult.isPendingPublication ? (
                  <ZapIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span>
                  {precheckResult.compatible
                    ? "Pre-check Passed: 100% Compatible with Super App Container"
                    : precheckResult.isPendingPublication
                    ? "Pending Publication Notice (Expected for Draft Packages)"
                    : "Pre-check Conflict Detected"}
                </span>
              </span>
              <button
                type="button"
                onClick={onClosePrecheckResult}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs leading-relaxed">{precheckResult.message}</p>

            {precheckResult.directConflicts &&
              precheckResult.directConflicts.length > 0 && (
                <div
                  className={`p-2.5 rounded-lg border space-y-1 font-mono text-[11px] ${
                    precheckResult.isPendingPublication
                      ? "bg-amber-100/80 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100"
                      : "bg-rose-100/80 dark:bg-rose-900/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                  }`}
                >
                  <div
                    className={`font-bold flex items-center gap-1.5 ${
                      precheckResult.isPendingPublication
                        ? "text-amber-950 dark:text-amber-100"
                        : "text-rose-900 dark:text-rose-100"
                    }`}
                  >
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    <span>
                      {precheckResult.isPendingPublication
                        ? "Registry Resolution Status:"
                        : "Version Incompatibilities:"}
                    </span>
                  </div>
                  {precheckResult.directConflicts.map(
                    (c: string, i: number) => (
                      <div key={i} className="pl-4 leading-relaxed">
                        &bull; {c}
                      </div>
                    ),
                  )}
                </div>
              )}

            {precheckResult.newPackages &&
              precheckResult.newPackages.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Introduced Dependencies:{" "}
                  </span>
                  {precheckResult.newPackages
                    .map((p: any) => `${p.package} (${p.version})`)
                    .join(", ")}
                </div>
              )}
          </div>
        )}

        {/* Terminal Console Output for Pub Resolution */}
        {resolutionResult && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 shadow-inner space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    resolutionResult.success ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span className="font-bold text-slate-200">
                  flutter pub get {resolutionResult.dryRun ? "--dry-run" : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Exit Code:{" "}
                  <strong
                    className={
                      resolutionResult.success
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {resolutionResult.exitCode}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={onCloseResolutionResult}
                  className="text-slate-400 hover:text-slate-200 text-xs px-1"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {resolutionResult.message && (
              <p
                className={`text-xs ${
                  resolutionResult.success
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {resolutionResult.message}
              </p>
            )}

            {resolutionResult.conflicts &&
              resolutionResult.conflicts.length > 0 && (
                <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 space-y-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-400" />
                    Detected Conflicts / Errors:
                  </span>
                  {resolutionResult.conflicts.map((c: string, idx: number) => (
                    <div key={idx} className="text-[11px] pl-4">
                      {c}
                    </div>
                  ))}
                </div>
              )}

            {resolutionResult.stdout && (
              <pre className="max-h-48 overflow-y-auto text-[11px] text-slate-300 whitespace-pre-wrap scrollbar-thin">
                {resolutionResult.stdout}
              </pre>
            )}

            {resolutionResult.stderr && !resolutionResult.success && (
              <pre className="max-h-36 overflow-y-auto text-[11px] text-rose-300 whitespace-pre-wrap scrollbar-thin">
                {resolutionResult.stderr}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
