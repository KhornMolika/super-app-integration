"use client";

import React, { useState } from "react";
import { Input, Label, Select } from "@/components/ui/inputs";
import { integrationsApi } from "@/api/integrations.api";
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
  handleRefTypeChange: (type: "tag" | "branch" | "commit") => void;
  handleRefChange: (val: string) => void;
  handleFlutterChange: (e: any) => void;
  onUpdateFlutterConfig?: (updates: Record<string, any>) => void;
  isGitValidating: boolean;
  gitValidationResult: any;
  detectedProvider: "github" | "gitlab" | null;
  tags: string[];
  branches: string[];
  selectedRefType: "tag" | "branch" | "commit";
  selectedRef: string;
  lockedCommitSha: string;
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
  handleRefTypeChange,
  handleRefChange,
  handleFlutterChange,
  onUpdateFlutterConfig,
  isGitValidating,
  gitValidationResult,
  detectedProvider,
  tags,
  branches,
  selectedRefType,
  selectedRef,
  lockedCommitSha,
}: FlutterGitConfigSectionProps) {
  const [showTokenPassword, setShowTokenPassword] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);

  const handleGenerateDedicatedKey = async () => {
    try {
      setIsGeneratingKey(true);
      const appName = flutterConfig?.packageName || flutterConfig?.appName || "miniapp";
      const keyInfo = await integrationsApi.generateDeployKey(appName);
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

  const status: { tone: string; text: string } | null = isGitValidating
    ? { tone: "text-slate-500 dark:text-slate-400", text: "Checking the repository..." }
    : gitValidationResult?.isDeployKeyNotice
      ? {
          tone: "text-slate-600 dark:text-slate-300",
          text: "Uses the deploy key. The build checks pubspec.yaml when it clones the repo.",
        }
      : gitValidationResult?.isValid
        ? {
            tone: "text-brand-700 dark:text-brand-300",
            text: `Found pubspec.yaml${gitValidationResult.packageName ? ` · package ${gitValidationResult.packageName}` : ""}`,
          }
        : gitValidationResult && (gitValidationResult.error || gitValidationResult.message)
          ? { tone: "text-rose-600 dark:text-rose-400", text: gitValidationResult.error || gitValidationResult.message }
          : null;

  const refLabel = selectedRefType === "tag" ? "Tag" : selectedRefType === "branch" ? "Branch" : "Commit";
  const refOptions = selectedRefType === "tag" ? tags : selectedRefType === "branch" ? branches : [];

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
          className={`font-mono ${gitValidationResult?.isValid === false || urlError ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
        />
        <p className={`mt-1.5 text-xs ${status?.tone || "text-slate-500 dark:text-slate-400"}`}>
          {urlError || status?.text || "A link to a subfolder works too, e.g. .../tree/main/packages/my_app."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <Label htmlFor="git-path">
            Folder <span className="text-xs font-normal text-slate-400">Optional</span>
          </Label>
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
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <Label htmlFor="git-ref" className="!mb-0">
              Version
            </Label>
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800" role="tablist">
              {(["tag", "branch", "commit"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={selectedRefType === t}
                  onClick={() => handleRefTypeChange(t)}
                  disabled={!isEditable}
                  className={seg(selectedRefType === t)}
                >
                  {t === "tag" ? "Tag" : t === "branch" ? "Branch" : "Commit"}
                </button>
              ))}
            </div>
          </div>
          {refOptions.length > 0 ? (
            <Select
              id="git-ref"
              value={selectedRef || refOptions[0]}
              onChange={(e: any) => handleRefChange(e.target.value)}
              disabled={!isEditable}
            >
              {refOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id="git-ref"
              value={selectedRef || flutterConfig?.gitBranch || ""}
              onChange={(e: any) => handleRefChange(e.target.value)}
              disabled={!isEditable}
              placeholder={selectedRefType === "tag" ? "v1.0.0" : selectedRefType === "branch" ? "main" : "7f8b9c0d1e2f"}
              aria-label={refLabel}
              className="font-mono"
            />
          )}
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {lockedCommitSha
              ? `Builds use commit ${lockedCommitSha.substring(0, 8)}.`
              : selectedRefType === "tag"
                ? "A tag is best for releases."
                : selectedRefType === "branch"
                  ? "Builds take the latest commit on this branch."
                  : "Builds always use this exact commit."}
          </p>
        </div>
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
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800" role="tablist">
              <button type="button" role="tab" aria-selected={authMethod === "deploy_key"} onClick={() => handleAuthMethodChange("deploy_key")} disabled={!isEditable} className={seg(authMethod === "deploy_key")}>
                Deploy key (recommended)
              </button>
              <button type="button" role="tab" aria-selected={authMethod === "token"} onClick={() => handleAuthMethodChange("token")} disabled={!isEditable} className={seg(authMethod === "token")}>
                Access token
              </button>
            </div>

            {authMethod === "deploy_key" ? (
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">1</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-700 dark:text-slate-300">Copy this public key. We made it for this app only.</p>
                      <div className="flex items-center gap-2">
                        {isEditable && hasKey && (
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
                    {hasKey ? (
                      <pre
                        ref={publicKeyRef}
                        onClick={flutterConfig?.deployPublicKey ? selectPublicKey : undefined}
                        className="max-h-28 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 select-all cursor-text"
                      >
                        {flutterConfig?.deployPublicKey || "The key was saved earlier. Make a new key to see it again."}
                      </pre>
                    ) : (
                      <button type="button" onClick={handleGenerateDedicatedKey} disabled={isGeneratingKey || !isEditable} className={smallBtn}>
                        {isGeneratingKey ? "Making a key..." : "Make a key"}
                      </button>
                    )}
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
