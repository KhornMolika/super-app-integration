"use client";

import React, { useState, useEffect } from "react";
import { Input, Label, Select } from "@/components/ui/inputs";
import { integrationsApi, type GitCommit } from "@/api/integrations.api";
import { copyText } from '@/lib/clipboard';

export interface FlutterGitConfigSectionProps {
  flutterConfig: any;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
  isPrivateRepo: boolean;
  authMethod: "deploy_key" | "token";
  handleRepoVisibilityChange: (isPrivate: boolean) => void;
  handleAuthMethodChange: (method: "deploy_key" | "token") => void;
  handleGitUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGitPathChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRefChange: (val: string) => void;
  /** Newest commits of the branch (empty when they can't be listed). */
  commits: GitCommit[];
  isLoadingCommits: boolean;
  /** Newest commit of the branch, also known for deploy-key repositories. */
  branchHeadSha: string;
  onCommitChange: (sha: string) => void;
  handleFlutterChange: (e: any) => void;
  onUpdateFlutterConfig?: (updates: Record<string, any>) => void;
  isGitValidating: boolean;
  gitValidationResult: any;
  detectedProvider: "github" | "gitlab" | null;
  branches: string[];
  tags?: string[];
  selectedRef: string;
  refType?: "branch" | "tag";
  onRefTypeChange?: (type: "branch" | "tag") => void;
  lockedCommitSha: string;
  onAutoDetectSha?: () => void;
}

export default function FlutterGitConfigSection({
  flutterConfig = {},
  allErrors = {},
  isEditable = true,
  isPrivateRepo,
  authMethod,
  handleRepoVisibilityChange,
  handleAuthMethodChange,
  handleGitUrlChange,
  handleGitPathChange,
  handleRefChange,
  commits,
  isLoadingCommits,
  branchHeadSha,
  onCommitChange,
  handleFlutterChange,
  onUpdateFlutterConfig,
  isGitValidating,
  gitValidationResult,
  detectedProvider,
  branches,
  tags = [],
  selectedRef,
  refType,
  onRefTypeChange,
  lockedCommitSha,
  onAutoDetectSha,
}: FlutterGitConfigSectionProps) {
  const [showTokenPassword, setShowTokenPassword] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [isManualCommit, setIsManualCommit] = useState(false);
  const [internalRefType, setInternalRefType] = useState<"branch" | "tag">(
    refType || (flutterConfig?.gitTag ? "tag" : "branch")
  );

  const activeRefType = refType || internalRefType;

  const handleToggleRefType = (type: "branch" | "tag") => {
    setInternalRefType(type);
    if (onRefTypeChange) {
      onRefTypeChange(type);
    } else {
      const defaultVal =
        type === "tag"
          ? tags[0] || flutterConfig?.gitTag || ""
          : branches[0] || flutterConfig?.gitBranch || "main";
      handleRefChange(defaultVal);
    }
  };

  const handleGenerateDedicatedKey = async () => {
    try {
      setIsGeneratingKey(true);
      setKeyError("");
      const appName = flutterConfig?.packageName || flutterConfig?.appName || "miniapp";
      const keyInfo = await integrationsApi.generateDeployKey(appName);
      if (!keyInfo?.publicKey || !keyInfo?.encryptedPrivateKey) {
        throw new Error("The server did not return a key.");
      }
      if (onUpdateFlutterConfig) {
        onUpdateFlutterConfig({
          deployKey: keyInfo.encryptedPrivateKey,
          deployPublicKey: keyInfo.publicKey,
          deployKeyFingerprint: keyInfo.fingerprint,
          hasDeployKey: true,
        });
      }
    } catch (err) {
      console.error("Failed to generate dedicated deploy key:", err);
      setKeyError(
        `Could not make a key: ${(err as any)?.message || "unknown error"}. Try again.`,
      );
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const [copyFailed, setCopyFailed] = useState(false);
  const publicKeyRef = React.useRef<HTMLPreElement>(null);

  /** Selects the whole key so it can be copied by hand (Ctrl+C) when copying fails. */
  const selectPublicKey = () => {
    const el = publicKeyRef.current;
    if (!el || typeof window === "undefined") return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const handleCopyPublicKey = async (keyText?: string) => {
    if (!keyText) return;
    const ok = await copyText(keyText);
    setCopyFailed(!ok);
    if (!ok) {
      selectPublicKey();
      return;
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  React.useEffect(() => {
    if (
      isPrivateRepo &&
      authMethod === "deploy_key" &&
      !flutterConfig?.deployPublicKey &&
      !flutterConfig?.hasDeployKey &&
      !isGeneratingKey &&
      !keyError &&
      isEditable
    ) {
      handleGenerateDedicatedKey();
    }
  }, [isPrivateRepo, authMethod, flutterConfig?.deployPublicKey, flutterConfig?.hasDeployKey]);

  const urlError = allErrors["integrationConfigFlutter.gitUrl"];
  const tokenError = allErrors["integrationConfigFlutter.gitAccessToken"];
  const hasKey = Boolean(flutterConfig?.deployPublicKey || flutterConfig?.hasDeployKey);

  const seg = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
      active
        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
    }`;
  const smallBtn =
    "h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors";

  // Resolve validation object whether flat or nested in data/validation envelope
  const val =
    gitValidationResult?.validation ||
    gitValidationResult?.data?.validation ||
    gitValidationResult?.data ||
    gitValidationResult;

  const isDeployKeyNotice = Boolean(
    gitValidationResult?.isDeployKeyNotice || val?.isDeployKeyNotice
  );

  const effectivePkg =
    val?.packageName ||
    gitValidationResult?.packageName ||
    gitValidationResult?.data?.packageName ||
    flutterConfig?.packageName;

  const rawError = val?.error || gitValidationResult?.error;
  const rawMessage = val?.message || gitValidationResult?.message;
  const isMessageSuccess =
    typeof rawMessage === "string" && rawMessage.trim().toLowerCase() === "success";

  const hasExplicitError = Boolean(
    rawError ||
      val?.isValid === false ||
      gitValidationResult?.isValid === false ||
      (gitValidationResult?.statusCode && gitValidationResult.statusCode >= 400)
  );

  const isSuccess = Boolean(
    !hasExplicitError &&
      (val?.isValid === true ||
        gitValidationResult?.isValid === true ||
        isMessageSuccess ||
        gitValidationResult?.statusCode === 200 ||
        val?.statusCode === 200)
  );

  const status: { tone: string; text: string } | null = isGitValidating
    ? { tone: "text-slate-500 dark:text-slate-400", text: "Checking the repository..." }
    : isDeployKeyNotice
      ? {
          tone: "text-slate-600 dark:text-slate-300",
          text: "Uses the deploy key. The build checks pubspec.yaml when it clones the repo.",
        }
      : isSuccess
        ? {
            tone: "text-emerald-600 dark:text-emerald-400",
            text: `Found pubspec.yaml${effectivePkg ? ` · package ${effectivePkg}` : ""}`,
          }
        : hasExplicitError && (rawError || (!isMessageSuccess && rawMessage))
          ? {
              tone: "text-rose-600 dark:text-rose-400",
              text: rawError || rawMessage || "Repository validation failed.",
            }
          : null;

  const branch = (activeRefType === "branch" ? selectedRef : "") || flutterConfig?.gitBranch || "";
  const currentTag = (activeRefType === "tag" ? selectedRef : "") || flutterConfig?.gitTag || "";
  const commitSha = String(flutterConfig?.commitSha || lockedCommitSha || "");
  const commitError =
    commitSha && !/^[0-9a-f]{40}$/i.test(commitSha) ? "A commit is 40 characters: 0-9 and a-f." : "";
  const ago = (iso: string) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "";
    const days = Math.floor((Date.now() - t) / 86400000);
    return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`;
  };

  // Automatically select and populate the newest commit SHA when available and not yet set
  useEffect(() => {
    if (!commitSha) {
      if (commits.length > 0 && commits[0]?.sha) {
        onCommitChange(commits[0].sha);
      } else if (branchHeadSha) {
        onCommitChange(branchHeadSha);
      }
    }
  }, [commitSha, commits, branchHeadSha, onCommitChange]);

  return (
    <div className="space-y-6">
      {/* Repository */}
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="git-url">
            Repository URL <span className="text-rose-500">*</span>
          </Label>
          {detectedProvider && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {detectedProvider === "github" ? "GitHub" : "GitLab"}
            </span>
          )}
        </div>
        <Input
          id="git-url"
          required
          name="gitUrl"
          value={flutterConfig?.gitUrl || ""}
          onChange={handleGitUrlChange}
          disabled={!isEditable}
          placeholder="https://github.com/org/repo or git@github.com:org/repo.git"
          className={`font-mono ${hasExplicitError || urlError ? "border-rose-500 ring-1 ring-rose-500" : isSuccess ? "border-emerald-500/50" : ""}`}
        />
        <p className={`mt-1.5 text-xs ${status?.tone || "text-slate-500 dark:text-slate-400"}`}>
          {urlError || status?.text || "A link to a subfolder works too, e.g. .../tree/main/packages/my_app."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <div className="flex items-center min-h-9 mb-1.5">
            <Label htmlFor="git-path" className="!mb-0">
              Folder <span className="text-xs font-normal text-slate-400">Optional</span>
            </Label>
          </div>
          <Input
            id="git-path"
            name="gitPath"
            value={flutterConfig?.gitPath || flutterConfig?.path || ""}
            onChange={handleGitPathChange}
            disabled={!isEditable}
            placeholder="packages/my_app"
            className="font-mono"
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Where pubspec.yaml is, if not at the top.</p>
        </div>

        <div>
          <div className="flex items-center justify-between min-h-9 mb-1.5">
            <Label htmlFor="git-ref" className="!mb-0 flex items-center gap-1.5">
              <span>{activeRefType === "tag" ? "Tag" : "Branch"}</span>
            </Label>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeRefType === "branch"}
                onClick={() => handleToggleRefType("branch")}
                disabled={!isEditable}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeRefType === "branch"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Branch
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeRefType === "tag"}
                onClick={() => handleToggleRefType("tag")}
                disabled={!isEditable}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeRefType === "tag"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Tag {tags.length > 0 ? `(${tags.length})` : ""}
              </button>
            </div>
          </div>

          {activeRefType === "branch" ? (
            branches.length > 0 ? (
              <Select
                id="git-ref"
                value={branch || branches[0]}
                onChange={(e: any) => handleRefChange(e.target.value)}
                disabled={!isEditable}
                className="font-mono text-xs"
              >
                {!branches.includes(branch) && branch && <option value={branch}>{branch}</option>}
                {branches.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="git-ref"
                value={branch}
                onChange={(e: any) => handleRefChange(e.target.value)}
                disabled={!isEditable}
                placeholder="main"
                className="font-mono text-xs"
              />
            )
          ) : (
            tags.length > 0 ? (
              <Select
                id="git-ref"
                value={currentTag || tags[0]}
                onChange={(e: any) => handleRefChange(e.target.value)}
                disabled={!isEditable}
                className="font-mono text-xs"
              >
                {!tags.includes(currentTag) && currentTag && <option value={currentTag}>{currentTag}</option>}
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="git-ref"
                value={currentTag}
                onChange={(e: any) => handleRefChange(e.target.value)}
                disabled={!isEditable}
                placeholder="v1.0.0"
                className="font-mono text-xs"
              />
            )
          )}
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {activeRefType === "tag"
              ? "The Git release tag (e.g. v1.0.0)."
              : "The branch your release is on."}
          </p>
        </div>
      </div>

      {/* Commit of that branch: what is scanned and built, exactly */}
      <div>
        <div className="flex items-center justify-between gap-2 min-h-9 mb-1.5">
          <Label htmlFor="git-commit" className="!mb-0 flex items-center gap-2">
            <span>Commit</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              Auto-detected
            </span>
          </Label>
          <div className="flex items-center gap-2 text-xs">
            {(isLoadingCommits || isGitValidating) && (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                Auto-detecting...
              </span>
            )}
            {branchHeadSha && commitSha !== branchHeadSha && (
              <button
                type="button"
                onClick={() => {
                  setIsManualCommit(false);
                  onCommitChange(branchHeadSha);
                }}
                className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                title={`Reset to latest commit on ${branch || 'branch'}: ${branchHeadSha}`}
              >
                ↻ Latest ({branchHeadSha.substring(0, 7)})
              </button>
            )}
            {onAutoDetectSha && (
              <button
                type="button"
                onClick={onAutoDetectSha}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                title="Fetch latest commit SHA from remote"
              >
                ⚡ Detect
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsManualCommit(!isManualCommit)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
            >
              {isManualCommit ? "Use Dropdown" : "Custom SHA"}
            </button>
          </div>
        </div>

        {!isManualCommit && (commits.length > 0 || branchHeadSha) ? (
          <Select
            id="git-commit"
            value={commitSha || (commits.length > 0 ? commits[0].sha : branchHeadSha)}
            onChange={(e: any) => {
              if (e.target.value === "__manual__") {
                setIsManualCommit(true);
              } else {
                onCommitChange(e.target.value);
              }
            }}
            disabled={!isEditable}
            className="font-mono text-xs"
          >
            {commits.length > 0 ? (
              <>
                {commitSha && !commits.some((c) => c.sha === commitSha) && commitSha !== branchHeadSha && (
                  <option value={commitSha}>{commitSha.substring(0, 7)} (custom saved)</option>
                )}
                {commits.map((c, i) => (
                  <option key={c.sha} value={c.sha}>
                    {`${i === 0 ? "★ [Latest] " : ""}${c.message ? c.message.split("\n")[0].slice(0, 55) : "Commit"} (${c.shortSha || c.sha.substring(0, 7)}) · ${ago(c.date)}`}
                  </option>
                ))}
              </>
            ) : branchHeadSha ? (
              <>
                <option value={branchHeadSha}>
                  {`★ [Latest HEAD] ${branchHeadSha.substring(0, 7)} · Newest on ${branch || "branch"}`}
                </option>
                {commitSha && commitSha !== branchHeadSha && (
                  <option value={commitSha}>{commitSha.substring(0, 7)} (custom saved)</option>
                )}
              </>
            ) : null}
            <option value="__manual__">✏️ Custom / Paste 40-character SHA...</option>
          </Select>
        ) : (
          <div className="relative">
            <Input
              id="git-commit"
              value={commitSha}
              onChange={(e: any) => onCommitChange(e.target.value.trim())}
              disabled={!isEditable}
              placeholder={branchHeadSha || "40-character commit SHA (e.g. a1b2c3d...)"}
              className={`font-mono text-xs pr-24 ${commitError ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
            />
            {branchHeadSha && (
              <button
                type="button"
                onClick={() => {
                  onCommitChange(branchHeadSha);
                  setIsManualCommit(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                title="Paste detected latest commit SHA"
              >
                Use Latest
              </button>
            )}
          </div>
        )}

        <p className={`mt-1.5 text-xs ${commitError ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
          {commitError ||
            (commits.length > 0
              ? `Select any commit from ${branch || "the branch"} to pin scans and builds to that exact version.`
              : branchHeadSha
                ? `Latest commit on ${branch || "the branch"}: ${branchHeadSha.substring(0, 7)} (Auto-detected).`
                : "Scans and builds use exactly this commit.")}
        </p>
      </div>

      {/* Access */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Access</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isPrivateRepo ? "The build needs read access to the repository." : "Anyone can read it. Nothing to set up."}
            </p>
          </div>
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800" role="tablist">
            <button type="button" role="tab" aria-selected={!isPrivateRepo} onClick={() => handleRepoVisibilityChange(false)} disabled={!isEditable} className={seg(!isPrivateRepo)}>
              Public
            </button>
            <button type="button" role="tab" aria-selected={isPrivateRepo} onClick={() => handleRepoVisibilityChange(true)} disabled={!isEditable} className={seg(isPrivateRepo)}>
              Private
            </button>
          </div>
        </div>

        {isPrivateRepo && (
          <>
            {authMethod === "token" && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  This app uses an access token. A deploy key is safer: it reads only this repository and isn&apos;t tied to a person.
                </p>
                {isEditable && (
                  <button type="button" onClick={() => handleAuthMethodChange("deploy_key")} className={smallBtn}>
                    Switch to a deploy key
                  </button>
                )}
              </div>
            )}

            {authMethod === "deploy_key" ? (
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">1</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {flutterConfig?.deployPublicKey ? "Copy this public key. It was made for this app only." : "Make a key for this app."}
                      </p>
                      <div className="flex items-center gap-2">
                        {isEditable && hasKey && flutterConfig?.deployPublicKey && (
                          <button type="button" onClick={handleGenerateDedicatedKey} disabled={isGeneratingKey} className={smallBtn}>
                            {isGeneratingKey ? "Making..." : "New key"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyPublicKey(flutterConfig?.deployPublicKey)}
                          disabled={!flutterConfig?.deployPublicKey}
                          className={smallBtn}
                        >
                          {copiedKey ? "Copied" : "Copy key"}
                        </button>
                      </div>
                    </div>
                    {flutterConfig?.deployPublicKey ? (
                      <pre
                        ref={publicKeyRef}
                        onClick={flutterConfig?.deployPublicKey ? selectPublicKey : undefined}
                        className="max-h-28 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 select-all cursor-text"
                      >
                        {flutterConfig.deployPublicKey}
                      </pre>
                    ) : hasKey ? (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          A key is saved, but its public half wasn&apos;t kept, so it can&apos;t be shown.
                          {isEditable
                            ? " Make a new key, then replace the deploy key in the repository."
                            : " Edit the app to make a new key."}
                        </p>
                        {isEditable && (
                          <button type="button" onClick={handleGenerateDedicatedKey} disabled={isGeneratingKey} className={smallBtn}>
                            {isGeneratingKey ? "Making a key..." : "Make a new key"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button type="button" onClick={handleGenerateDedicatedKey} disabled={isGeneratingKey || !isEditable} className={smallBtn}>
                        {isGeneratingKey ? "Making a key..." : "Make a key"}
                      </button>
                    )}
                    {keyError && <p className="text-xs text-rose-600 dark:text-rose-400">{keyError}</p>}
                    {copyFailed && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Copy was blocked. The key is selected: press Ctrl+C (Cmd+C on Mac).
                      </p>
                    )}
                    {flutterConfig?.deployKeyFingerprint && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate" title={flutterConfig.deployKeyFingerprint}>
                        {flutterConfig.deployKeyFingerprint}
                      </p>
                    )}
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">2</span>
                  <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                    <p>Add it to the repository as a read-only deploy key:</p>
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      <li>GitHub: Settings → Deploy keys → Add deploy key</li>
                      <li>GitLab: Settings → Repository → Deploy keys → Add key</li>
                    </ul>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Leave write access off.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">3</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    That&apos;s it. The repository URL above is checked again with the key.
                  </p>
                </li>
              </ol>
            ) : (
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="git-token">
                    Access token <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowTokenPassword(!showTokenPassword)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    {showTokenPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <Input
                  id="git-token"
                  name="gitAccessToken"
                  type={showTokenPassword ? "text" : "password"}
                  value={flutterConfig?.gitAccessToken || ""}
                  onChange={handleFlutterChange}
                  disabled={!isEditable}
                  placeholder="ghp_... or glpat-..."
                  autoComplete="off"
                  className={`font-mono ${tokenError ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                />
                <p className={`mt-1.5 text-xs ${tokenError ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {tokenError || "Read-only: GitHub token with repo scope, or GitLab token with read_repository."}
                </p>
              </div>
            )}

            {authMethod === "deploy_key" && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualOverride(!showManualOverride)}
                  aria-expanded={showManualOverride}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showManualOverride ? "Hide own key" : "Use your own private key instead"}
                </button>
                {showManualOverride && (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      name="deployKey"
                      aria-label="Your private key"
                      value={flutterConfig?.deployKey || ""}
                      onChange={(e: any) => {
                        if (onUpdateFlutterConfig) onUpdateFlutterConfig({ deployKey: e.target.value });
                        else handleFlutterChange(e);
                      }}
                      disabled={!isEditable}
                      rows={4}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Only if your organization doesn&apos;t allow platform keys. It is stored encrypted.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
