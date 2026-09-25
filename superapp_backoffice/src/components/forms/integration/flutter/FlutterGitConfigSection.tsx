"use client";

import React, { useState } from "react";
import { Input, Label, Select } from "@/components/ui/inputs";
import {
  GlobeIcon,
  LockIcon,
  CheckCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  SettingsIcon,
  AlertTriangleIcon,
  EyeIcon,
  CheckIcon,
  XIcon,
} from "@/components/ui/Icons";

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
  const [activeGuideTab, setActiveGuideTab] = useState<"github" | "gitlab">("github");

  return (
    <div className="space-y-6">
      {/* Repository Access Level Selector */}
      <div>
        <Label className="mb-2 block font-semibold text-slate-800 dark:text-slate-200">
          Repository Access Level <span className="text-rose-500">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleRepoVisibilityChange(false)}
            disabled={!isEditable}
            className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              !isPrivateRepo
                ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                !isPrivateRepo
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <GlobeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Public Repository
                </span>
                {!isPrivateRepo && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Open source or publicly accessible repository. Zero credentials or tokens required.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRepoVisibilityChange(true)}
            disabled={!isEditable}
            className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              isPrivateRepo
                ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isPrivateRepo
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <LockIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Private Repository
                </span>
                {isPrivateRepo && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Internal or proprietary code. Authorized securely via SSH Deploy Key (Recommended) or Token.
              </p>
            </div>
          </button>
        </div>
      </div>

      {!isPrivateRepo ? (
        /* Public Repository Reassurance Banner */
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
            <span className="font-bold">Public Repository Access:</span> Zero credentials or personal tokens are stored. The automated CI/CD pipeline and security scanner will shallow clone this repository anonymously.
          </div>
        </div>
      ) : (
        /* Private Repository Authentication Settings */
        <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Private Repository Authentication</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose your preferred authentication method for CI/CD ingestion
              </p>
            </div>

            {/* Sub-tabs: Deploy Key vs Token */}
            <div className="inline-flex rounded-lg p-1 bg-slate-200/70 dark:bg-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleAuthMethodChange("deploy_key")}
                disabled={!isEditable}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  authMethod === "deploy_key"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <KeyIcon className="w-3.5 h-3.5" />
                <span>SSH Deploy Key (Recommended)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAuthMethodChange("token")}
                disabled={!isEditable}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  authMethod === "token"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <LockIcon className="w-3.5 h-3.5" />
                <span>Access / Deploy Token</span>
              </button>
            </div>
          </div>

          {authMethod === "deploy_key" ? (
            <div className="space-y-4 pt-1">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                <KeyIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-200">Owner-Provided Deploy Key:</strong>{" "}
                  Please generate an SSH key pair for your repository, add the public key to your repository&apos;s Deploy Keys (read-only), and input your private key below. The platform stores your key encrypted at rest (AES-256-GCM) and uses it ephemerally during package verification.
                </div>
              </div>

              {/* If key is already configured & encrypted */}
              {Boolean(flutterConfig?.hasDeployKey || flutterConfig?.deployKey === '********') && (
                <div className="flex items-center gap-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex-1 leading-relaxed">
                    <strong>Deploy Key Configured &amp; Encrypted:</strong> A private deploy key is already saved and secured with AES-256-GCM. Leave the field below as is to keep your existing key, or paste a new private key to replace it.
                  </div>
                </div>
              )}

              {/* Direct Input for Owner's Private Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <KeyIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>SSH Private Key (Deploy Key) <span className="text-rose-500">*</span></span>
                  </Label>
                  <span className="text-[11px] text-slate-500 font-mono">ED25519 or RSA (PEM format)</span>
                </div>
                <textarea
                  name="deployKey"
                  value={flutterConfig?.deployKey || ""}
                  onChange={(e: any) => {
                    if (onUpdateFlutterConfig) {
                      onUpdateFlutterConfig({
                        deployKey: e.target.value,
                      });
                    } else {
                      handleFlutterChange(e);
                    }
                  }}
                  disabled={!isEditable}
                  rows={5}
                  placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAA...\n-----END OPENSSH PRIVATE KEY-----"}
                  className={`w-full font-mono text-xs p-3 rounded-xl border bg-slate-900 dark:bg-slate-950 text-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                    allErrors["integrationConfigFlutter.deployKey"]
                      ? "border-rose-500 ring-1 ring-rose-500"
                      : "border-slate-800"
                  }`}
                />
                {allErrors["integrationConfigFlutter.deployKey"] && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    {allErrors["integrationConfigFlutter.deployKey"]}
                  </p>
                )}
              </div>

              {/* Step-by-Step Generation Guide */}
              <div className="bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>How to Generate &amp; Add Your Deploy Key:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab("github")}
                      className={`px-2 py-0.5 rounded font-medium ${
                        activeGuideTab === "github"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      GitHub
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab("gitlab")}
                      className={`px-2 py-0.5 rounded font-medium ${
                        activeGuideTab === "gitlab"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      GitLab
                    </button>
                  </div>
                </div>

                {activeGuideTab === "github" ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <li>
                      Run on your machine:{" "}
                      <code className="bg-black/10 dark:bg-black/40 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                        ssh-keygen -t ed25519 -C &quot;miniapp-deploy-key&quot; -f ./id_ed25519_miniapp
                      </code>
                    </li>
                    <li>
                      In your GitHub repo: <strong>Settings</strong> &rarr;{" "}
                      <strong>Deploy keys</strong> &rarr; click{" "}
                      <strong>Add deploy key</strong>.
                    </li>
                    <li>
                      Paste the content of <code className="font-mono text-[11px]">./id_ed25519_miniapp.pub</code> (public key). Keep <strong>&quot;Allow write access&quot; unchecked</strong> (read-only).
                    </li>
                    <li>
                      Copy the content of <code className="font-mono text-[11px]">./id_ed25519_miniapp</code> (private key) and paste it into the input field above.
                    </li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <li>
                      Run on your machine:{" "}
                      <code className="bg-black/10 dark:bg-black/40 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 font-mono text-[11px]">
                        ssh-keygen -t ed25519 -C &quot;miniapp-deploy-key&quot; -f ./id_ed25519_miniapp
                      </code>
                    </li>
                    <li>
                      In your GitLab repo: <strong>Settings</strong> &rarr;{" "}
                      <strong>Repository</strong> &rarr; expand{" "}
                      <strong>Deploy keys</strong> &rarr; click{" "}
                      <strong>Add key</strong>.
                    </li>
                    <li>
                      Paste <code className="font-mono text-[11px]">./id_ed25519_miniapp.pub</code> (public key) and leave &quot;Grant write permissions&quot; unchecked.
                    </li>
                    <li>
                      Copy the content of <code className="font-mono text-[11px]">./id_ed25519_miniapp</code> (private key) and paste it into the input field above.
                    </li>
                  </ol>
                )}

                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Security Rule:</strong> Always keep <strong>&quot;Allow write access&quot; unchecked</strong> (read-only) in your repository settings. The platform only requires read access to verify and build your package.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">
                    Access Token / Project Deploy Token{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowTokenPassword(!showTokenPassword)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>{showTokenPassword ? "Hide Token" : "Show Token"}</span>
                  </button>
                </div>
                <Input
                  name="gitAccessToken"
                  type={showTokenPassword ? "text" : "password"}
                  value={flutterConfig?.gitAccessToken || ""}
                  onChange={handleFlutterChange}
                  disabled={!isEditable}
                  placeholder="ghp_xxxxxxxxxxxx or glpat-xxxxxxxxxxxx"
                  className={
                    allErrors["integrationConfigFlutter.gitAccessToken"]
                      ? "border-rose-500 ring-1 ring-rose-500"
                      : ""
                  }
                />
                {allErrors["integrationConfigFlutter.gitAccessToken"] && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {allErrors["integrationConfigFlutter.gitAccessToken"]}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  GitHub Personal Access Token with <code>repo</code> scope, or GitLab Project Deploy Token with <code>read_repository</code> scope.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Git Repository and Branch/Tag Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label>
              Git Repository URL <span className="text-rose-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              {isGitValidating && (
                <span className="text-sm text-blue-500 animate-pulse font-medium">
                  Validating repository...
                </span>
              )}
              {detectedProvider && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    detectedProvider === "github"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                  }`}
                >
                  {detectedProvider === "github" ? "GitHub" : "GitLab"}
                </span>
              )}
            </div>
          </div>
          <Input
            required
            name="gitUrl"
            value={flutterConfig?.gitUrl || ""}
            onChange={handleGitUrlChange}
            disabled={!isEditable}
            placeholder={
              isPrivateRepo && authMethod === "deploy_key"
                ? "git@github.com:org/repo.git or https://github.com/org/repo"
                : "https://github.com/org/repo or paste direct subfolder link..."
            }
            className={
              gitValidationResult?.isValid === true
                ? "border-emerald-500 ring-1 ring-emerald-500"
                : gitValidationResult?.isValid === false
                  ? "border-rose-500 ring-1 ring-rose-500"
                  : ""
            }
          />
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Tip: You can paste repository root or direct subfolder links (e.g. <code>.../tree/main/packages/miniapp</code>). For SSH deploy keys, SSH clone URLs (<code>git@...</code>) are recommended.
          </p>
        </div>

        {/* Monorepo Subdirectory / Path Field */}
        <div className="col-span-1 md:col-span-2">
          <Label>Monorepo Subdirectory / Package Path (Optional)</Label>
          <Input
            name="gitPath"
            value={flutterConfig?.gitPath || flutterConfig?.path || ""}
            onChange={handleGitPathChange}
            disabled={!isEditable}
            placeholder="e.g. ma_flutter_trust_regulator or packages/miniapp"
          />
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            If your repository is a monorepo, specify the relative path to the folder containing <code>pubspec.yaml</code>.
          </p>
        </div>

        <div>
          <Label>Reference Type</Label>
          <Select
            value={selectedRefType}
            onChange={(e: any) => handleRefTypeChange(e.target.value)}
            disabled={!isEditable}
          >
            <option value="tag">Tag (Recommended for stable releases)</option>
            <option value="branch">Branch (Development / Active feature)</option>
            <option value="commit">Commit SHA (Exact Lock)</option>
          </Select>
        </div>

        <div>
          <Label>
            Reference Value (
            {selectedRefType === "tag"
              ? "Tag"
              : selectedRefType === "branch"
                ? "Branch"
                : "Commit SHA"}
            )
          </Label>
          {selectedRefType === "tag" && tags.length > 0 ? (
            <Select
              value={selectedRef || (tags.length > 0 ? tags[0] : "")}
              onChange={(e: any) => handleRefChange(e.target.value)}
              disabled={!isEditable}
            >
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          ) : selectedRefType === "branch" && branches.length > 0 ? (
            <Select
              value={selectedRef || (branches.length > 0 ? branches[0] : "")}
              onChange={(e: any) => handleRefChange(e.target.value)}
              disabled={!isEditable}
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={selectedRef || flutterConfig?.gitBranch || ""}
              onChange={(e: any) => handleRefChange(e.target.value)}
              disabled={!isEditable}
              placeholder={
                selectedRefType === "tag"
                  ? "e.g. v1.0.0"
                  : selectedRefType === "branch"
                    ? "e.g. main"
                    : "e.g. 7f8b9c0d1e2f"
              }
            />
          )}
        </div>

        {/* Git SHA Locking and Reproducibility Banner */}
        {lockedCommitSha && (
          <div className="col-span-1 md:col-span-2 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Reproducible Build Lock: Commit SHA resolved
              </span>
            </div>
            <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded-lg shrink-0 flex items-center gap-1.5 text-xs sm:text-sm">
              <LockIcon className="w-3.5 h-3.5" />
              <span>SHA:</span>
              <span>{lockedCommitSha.substring(0, 8)}...</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Git Validation Feedback Card */}
      {gitValidationResult && (
        <div
          className={`p-4 rounded-xl border text-sm transition-all duration-200 ${
            gitValidationResult.isDeployKeyNotice
              ? "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
              : gitValidationResult.isValid
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              {gitValidationResult.isDeployKeyNotice ? (
                <KeyIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : gitValidationResult.isValid ? (
                <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>
                {gitValidationResult.isDeployKeyNotice
                  ? "Deploy Key Authentication Configured"
                  : gitValidationResult.isValid
                    ? "Repository & pubspec.yaml Verified"
                    : "Validation Error"}
              </span>
            </span>
            {gitValidationResult.packageName && (
              <span className="font-mono bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-700">
                Package: {gitValidationResult.packageName}
              </span>
            )}
          </div>
          {gitValidationResult.message && (
            <p className="mt-1 text-xs sm:text-sm">
              {gitValidationResult.message}
            </p>
          )}
          {gitValidationResult.error && (
            <p className="mt-1 text-xs sm:text-sm">
              {gitValidationResult.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
