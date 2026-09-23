"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button, Input, Label, Select } from "@/components/ui/inputs";
import { SourceType } from "@/types/miniapp.types";
import { miniappsApi, integrationsApi, pubspecApi } from "@/api";
import { useAuth } from "@/lib/auth";
import { inferPackageNameFromGitUrl } from "@/lib/miniapp-form.validator";
import {
  ShieldIcon,
  ShieldCheckIcon,
  LockIcon,
  PackageIcon,
  TagIcon,
  ZapIcon,
  AlertTriangleIcon,
  CheckIcon,
  CheckCircleIcon,
  XIcon,
  XCircleIcon,
  GlobeIcon,
  KeyIcon,
  CopyIcon,
  ClipboardCheckIcon,
  EyeIcon,
  SettingsIcon,
} from "@/components/ui/Icons";

export interface FlutterPackageIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleFlutterChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onUpdateFlutterConfig?: (
    updates: Record<string, any>,
    extraData?: { archiveFile?: File; detectedPermissions?: any[] },
  ) => void;
  isEditable?: boolean;
}

export default function FlutterPackageIntegrationForm({
  formData,
  allErrors = {},
  handleFlutterChange,
  onUpdateFlutterConfig,
  isEditable = true,
}: FlutterPackageIntegrationFormProps) {
  const { can, hasRole } = useAuth();
  const isSuperAdminOrAdmin =
    hasRole('SUPER_ADMIN') ||
    hasRole('ADMIN') ||
    can('super_app:manage') ||
    can('miniapp:approve');

  const flutterConfig = formData.integrationConfigFlutter || {};

  // Repository Visibility & Deploy Key States
  const isPrivateRepo = Boolean(flutterConfig.isPrivateRepo);
  const authMethod: "deploy_key" | "token" =
    flutterConfig.authMethod === "token" ? "token" : "deploy_key";

  const [showTokenPassword, setShowTokenPassword] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"github" | "gitlab">(
    "github",
  );
  const [isPrechecking, setIsPrechecking] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<any>(null);

  const handleRunPrecheck = async () => {
    const rawPkg = (
      flutterConfig.packageName ||
      formData.name ||
      formData.appId ||
      ""
    )
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");

    if (!rawPkg) {
      alert("Please enter a package name before running pre-check simulation.");
      return;
    }

    setIsPrechecking(true);
    try {
      const res = await pubspecApi.precheckConflicts({
        packageName: rawPkg,
        gitUrl: flutterConfig.gitUrl || flutterConfig.repoUrl,
        ref:
          flutterConfig.gitBranch ||
          flutterConfig.gitTag ||
          flutterConfig.commitSha ||
          flutterConfig.ref ||
          "main",
        path: flutterConfig.gitPath || flutterConfig.packagePath,
        version:
          flutterConfig.versionConstraint || flutterConfig.packageVersion,
        isHosted:
          flutterConfig.isHosted ||
          Boolean(flutterConfig.packageStoragePath),
        hostedUrl: flutterConfig.nexusUrl || flutterConfig.hostedUrl,
        deployKey: flutterConfig.deployKey,
        gitAccessToken: flutterConfig.gitAccessToken,
      });
      setPrecheckResult(res);
    } catch (err: any) {
      setPrecheckResult({
        compatible: false,
        packageName: rawPkg,
        directConflicts: [err.message || "Failed to execute pre-check simulation."],
        transitiveBumps: [],
        newPackages: [],
        message: "Simulation failed to execute.",
        rawOutput: err.message,
      });
    } finally {
      setIsPrechecking(false);
    }
  };

  const handleRepoVisibilityChange = (isPrivate: boolean) => {
    if (!isEditable) return;
    const updates: Record<string, any> = {
      isPrivateRepo: isPrivate,
      authMethod: isPrivate ? flutterConfig.authMethod || "deploy_key" : "none",
    };
    if (!isPrivate) {
      updates.gitAccessToken = "";
      updates.deployKey = "";
    }
    if (onUpdateFlutterConfig) {
      onUpdateFlutterConfig(updates);
    } else {
      Object.entries(updates).forEach(([key, val]) => {
        handleFlutterChange({ target: { name: key, value: val } } as any);
      });
    }
  };

  const handleAuthMethodChange = (method: "deploy_key" | "token") => {
    if (!isEditable) return;
    if (onUpdateFlutterConfig) {
      onUpdateFlutterConfig({ authMethod: method });
    } else {
      handleFlutterChange({
        target: { name: "authMethod", value: method },
      } as any);
    }
  };

  // State for Git Real-Time Validation
  const [detectedProvider, setDetectedProvider] = useState<
    "github" | "gitlab" | null
  >(null);
  const [isGitValidating, setIsGitValidating] = useState(false);
  const [gitValidationResult, setGitValidationResult] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedRefType, setSelectedRefType] = useState<
    "tag" | "branch" | "commit"
  >("tag");
  const [selectedRef, setSelectedRef] = useState<string>("");

  // State for Nexus Real-Time Validation
  const [isNexusValidating, setIsNexusValidating] = useState(false);
  const [nexusValidationResult, setNexusValidationResult] = useState<any>(null);

  // State for Flutter Package Archive Upload (.zip / .tar.gz)
  const [isUploadingArchive, setIsUploadingArchive] = useState(false);
  const [archiveUploadSuccess, setArchiveUploadSuccess] = useState<any>(null);
  const [archiveUploadError, setArchiveUploadError] = useState<string | null>(
    null,
  );

  // State for Git SHA Locking
  const [lockedCommitSha, setLockedCommitSha] = useState<string>("");

  // Debounce timers
  const gitDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nexusDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // State for Container Pubspec Dependency & Live Resolution
  const [pubspecStatus, setPubspecStatus] = useState<any>(null);
  const [isLoadingPubspecStatus, setIsLoadingPubspecStatus] = useState(false);
  const [isTestingResolution, setIsTestingResolution] = useState(false);
  const [resolutionResult, setResolutionResult] = useState<any>(null);
  const [isSyncingPubspec, setIsSyncingPubspec] = useState(false);
  const [isRebuildingSandbox, setIsRebuildingSandbox] = useState(false);
  const [sandboxRebuildMessage, setSandboxRebuildMessage] = useState<string | null>(null);

  const loadPubspecStatus = async () => {
    try {
      setIsLoadingPubspecStatus(true);
      const res = await pubspecApi.getStatus();
      setPubspecStatus(res);
    } catch (_) {
    } finally {
      setIsLoadingPubspecStatus(false);
    }
  };

  useEffect(() => {
    loadPubspecStatus();
  }, []);

  const handleTestResolution = async () => {
    try {
      setIsTestingResolution(true);
      setResolutionResult(null);
      const res = await pubspecApi.validate(true);
      setResolutionResult(res);
    } catch (err: any) {
      setResolutionResult({
        success: false,
        message: err.message || 'Dependency resolution validation failed.',
        conflicts: [err.message || 'Network / execution error.'],
      });
    } finally {
      setIsTestingResolution(false);
    }
  };

  const handleSyncPubspec = async () => {
    try {
      setIsSyncingPubspec(true);
      const res = await pubspecApi.syncApprovedMiniApps();
      await loadPubspecStatus();
      if (res?.validationResult) {
        setResolutionResult(res.validationResult);
      }
    } catch (err: any) {
      setResolutionResult({
        success: false,
        message: err.message || 'Sync failed.',
        conflicts: [err.message],
      });
    } finally {
      setIsSyncingPubspec(false);
    }
  };

  const handleRebuildSandbox = async () => {
    try {
      setIsRebuildingSandbox(true);
      setSandboxRebuildMessage(null);
      const res = await pubspecApi.triggerSandboxBuild();
      setSandboxRebuildMessage(res?.message || 'Sandbox compilation triggered in background.');
    } catch (err: any) {
      setSandboxRebuildMessage(`Failed to trigger sandbox build: ${err.message}`);
    } finally {
      setIsRebuildingSandbox(false);
    }
  };

  // Archive inspection handler (inspects & sanitizes in memory before storing in MinIO on submit)
  const handleArchiveFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension / archive format
    const validExtensions = [".zip", ".tar.gz", ".tgz", ".tar"];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) =>
      fileNameLower.endsWith(ext),
    );
    if (!hasValidExt) {
      setArchiveUploadError(
        "Invalid package format. Only .zip and .tar.gz archive files are supported.",
      );
      setArchiveUploadSuccess(null);
      e.target.value = "";
      return;
    }

    if (file.size === 0) {
      setArchiveUploadError(
        "The selected package archive file is empty (0 bytes).",
      );
      setArchiveUploadSuccess(null);
      e.target.value = "";
      return;
    }

    setIsUploadingArchive(true);
    setArchiveUploadError(null);
    setArchiveUploadSuccess(null);

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    if (formData.id) uploadFormData.append("miniAppId", formData.id);

    try {
      const data: any = await miniappsApi.inspectArtifact(uploadFormData);
      if (data && (data.success || data.pubspec || data.sha256)) {
        setArchiveUploadSuccess({
          ...data,
          filename: data.filename || file.name,
        });

        const rawPkgName =
          data.pubspec?.name ||
          data.packageName ||
          file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
        const cleanPkgName = String(rawPkgName || "").trim();

        const rawPkgVer = data.pubspec?.version || data.version || "1.0.0";
        const cleanPkgVer = String(rawPkgVer || "")
          .trim()
          .replace(/^[\^~>=<]+/, "");
        const versionConstraint = `^${cleanPkgVer}`;

        const updates: Record<string, any> = {
          packageName: cleanPkgName,
          versionConstraint,
          archiveChecksum: data.sha256,
          archiveFilename: data.filename || file.name,
          archiveSize: data.size,
          archiveOriginalSize: data.originalSize,
          archiveStrippedFilesCount: data.strippedFilesCount,
          isSanitized: data.isSanitized,
          isArchiveSubmission: true,
        };

        if (onUpdateFlutterConfig) {
          onUpdateFlutterConfig(updates, {
            archiveFile: file,
            detectedPermissions: data.detectedPermissions,
          });
        } else {
          // Fallback if atomic updater not passed
          if (cleanPkgName) {
            handleFlutterChange({
              target: { name: "packageName", value: cleanPkgName },
            } as any);
          }
          if (versionConstraint) {
            handleFlutterChange({
              target: { name: "versionConstraint", value: versionConstraint },
            } as any);
          }
          if (data.sha256) {
            handleFlutterChange({
              target: { name: "archiveChecksum", value: data.sha256 },
            } as any);
          }
        }
      } else {
        setArchiveUploadError(
          data?.message ||
            "Failed to inspect package archive. Ensure pubspec.yaml exists in the root directory.",
        );
      }
    } catch (err: any) {
      setArchiveUploadError(err.message || "Error reading archive bundle.");
    } finally {
      setIsUploadingArchive(false);
    }
  };

  // Auto-detect deep monorepo URLs and extract path/ref
  const handleGitUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    let cleanUrl = rawVal;
    let extractedPath = "";
    let extractedRef = "";

    const ghTreeMatch = rawVal.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)(?:\/(.*))?$/,
    );
    if (ghTreeMatch) {
      const owner = ghTreeMatch[1];
      const repo = ghTreeMatch[2].replace(/\.git$/, "");
      extractedRef = ghTreeMatch[3];
      extractedPath = ghTreeMatch[4] || "";
      cleanUrl = `https://github.com/${owner}/${repo}`;
    }

    const glTreeMatch = rawVal.match(
      /^https?:\/\/([^/]+)\/(.+?)\/-\/(?:tree|blob)\/([^/]+)(?:\/(.*))?$/,
    );
    if (glTreeMatch) {
      const host = glTreeMatch[1];
      const project = glTreeMatch[2].replace(/\.git$/, "");
      extractedRef = glTreeMatch[3];
      extractedPath = glTreeMatch[4] || "";
      cleanUrl = `https://${host}/${project}`;
    }

    const activePath =
      extractedPath || flutterConfig.gitPath || flutterConfig.path || "";
    const derivedPkgName = inferPackageNameFromGitUrl(cleanUrl, activePath);

    if (rawVal.trim().startsWith("git@") && !isPrivateRepo) {
      handleRepoVisibilityChange(true);
      handleAuthMethodChange("deploy_key");
    }

    if (onUpdateFlutterConfig) {
      const updates: Record<string, any> = {
        gitUrl: cleanUrl,
        packageName: derivedPkgName,
      };
      if (extractedPath) updates.gitPath = extractedPath;
      if (extractedRef) {
        updates.gitBranch = extractedRef;
        setSelectedRef(extractedRef);
        setSelectedRefType("branch");
      }
      onUpdateFlutterConfig(updates);
    } else {
      if (extractedPath) {
        handleFlutterChange({
          target: { name: "gitPath", value: extractedPath },
        } as any);
      }
      if (extractedRef) {
        setSelectedRef(extractedRef);
        setSelectedRefType("branch");
        handleFlutterChange({
          target: { name: "gitBranch", value: extractedRef },
        } as any);
      }
      if (derivedPkgName) {
        handleFlutterChange({
          target: { name: "packageName", value: derivedPkgName },
        } as any);
      }
      handleFlutterChange({
        target: { name: "gitUrl", value: cleanUrl },
      } as any);
    }
  };

  const handleGitPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value;
    const derivedPkgName = inferPackageNameFromGitUrl(
      flutterConfig.gitUrl,
      newPath,
    );

    if (onUpdateFlutterConfig) {
      const updates: Record<string, any> = {
        gitPath: newPath,
      };
      if (derivedPkgName) {
        updates.packageName = derivedPkgName;
      }
      onUpdateFlutterConfig(updates);
    } else {
      handleFlutterChange(e);
      if (derivedPkgName) {
        handleFlutterChange({
          target: { name: "packageName", value: derivedPkgName },
        } as any);
      }
    }
  };

  // Real-time Git URL Validation with Debounce (600ms)
  useEffect(() => {
    const url = flutterConfig.gitUrl?.trim() || "";
    const path = (flutterConfig.gitPath || flutterConfig.path || "").trim();

    if (!url) {
      setDetectedProvider(null);
      setGitValidationResult(null);
      setTags([]);
      setBranches([]);
      return;
    }

    const lower = url.toLowerCase();
    if (lower.includes("gitlab")) {
      setDetectedProvider("gitlab");
    } else if (lower.includes("github") || lower.split("/").length === 2) {
      setDetectedProvider("github");
    } else {
      setDetectedProvider(null);
    }

    if (gitDebounceRef.current) {
      clearTimeout(gitDebounceRef.current);
    }

    if (
      url.length > 3 &&
      (url.includes("/") || url.startsWith("http") || url.startsWith("git@"))
    ) {
      setIsGitValidating(true);
      gitDebounceRef.current = setTimeout(async () => {
        const isDeployKey =
          (isPrivateRepo && authMethod === "deploy_key") ||
          url.startsWith("git@");
        const tokenToUse =
          isPrivateRepo && authMethod === "token"
            ? flutterConfig.gitAccessToken || undefined
            : undefined;
        const derivedPkgName = inferPackageNameFromGitUrl(url, path);

        try {
          const valData = await integrationsApi.validateGit({
            url,
            ref: selectedRef || flutterConfig.gitBranch || undefined,
            token: tokenToUse,
            path: path || undefined,
            isPrivate: isPrivateRepo || url.startsWith("git@"),
            authMethod: isDeployKey ? "deploy_key" : authMethod,
            deployKey: flutterConfig.deployKey || undefined,
          });

          const effectivePkg =
            valData.validation?.packageName || derivedPkgName;

          if (!valData.validation?.isValid && isDeployKey) {
            setGitValidationResult({
              isValid: true,
              isDeployKeyNotice: true,
              message:
                "Private repository configured with Deploy Key. Full pubspec extraction & verification will run in the CI/CD build runner.",
              packageName: effectivePkg,
            });
          } else {
            const resVal = valData.validation || valData;
            if (
              !resVal.isValid &&
              resVal.error &&
              (resVal.error.toLowerCase().includes("not found") ||
                resVal.error.includes("404"))
            ) {
              resVal.error = `File 'pubspec.yaml' not found or repository is private. If this repository is private, please select '🔒 Private Repository' above and configure SSH Deploy Key or Access Token.`;
            }
            if (effectivePkg) {
              resVal.packageName = effectivePkg;
            }
            setGitValidationResult(resVal);
          }

          if (valData.provider) {
            setDetectedProvider(valData.provider);
          }

          if (effectivePkg && flutterConfig.packageName !== effectivePkg) {
            if (onUpdateFlutterConfig) {
              onUpdateFlutterConfig({ packageName: effectivePkg });
            } else {
              handleFlutterChange({
                target: {
                  name: "packageName",
                  value: effectivePkg,
                },
              } as any);
            }
          }

          // Fetch tags in background (supports REST API + SSH Deploy Key ls-remote)
          try {
            const tagsData = await integrationsApi.getGitTags({
              url,
              token: tokenToUse,
              deployKey: flutterConfig.deployKey || undefined,
              isPrivate: isPrivateRepo || url.startsWith("git@"),
              authMethod: isDeployKey ? "deploy_key" : authMethod,
            });
            if (tagsData.tags && Array.isArray(tagsData.tags)) {
              setTags(tagsData.tags);
              if (
                tagsData.tags.length > 0 &&
                !selectedRef &&
                !flutterConfig.gitBranch &&
                selectedRefType === "tag"
              ) {
                handleRefChange(tagsData.tags[0]);
              }
            }
          } catch {}

          // Fetch branches in background (supports REST API + SSH Deploy Key ls-remote)
          try {
            const branchesData = await integrationsApi.getGitBranches({
              url,
              token: tokenToUse,
              deployKey: flutterConfig.deployKey || undefined,
              isPrivate: isPrivateRepo || url.startsWith("git@"),
              authMethod: isDeployKey ? "deploy_key" : authMethod,
            });
            if (branchesData.branches && Array.isArray(branchesData.branches)) {
              setBranches(branchesData.branches);
              if (
                branchesData.branches.length > 0 &&
                !selectedRef &&
                !flutterConfig.gitBranch &&
                selectedRefType === "branch"
              ) {
                const defaultBranch = branchesData.branches.includes("main")
                  ? "main"
                  : branchesData.branches[0];
                handleRefChange(defaultBranch);
              }
            }
          } catch {}

          // Resolve commit SHA (supports REST API + SSH Deploy Key ls-remote)
          try {
            const shaData = await integrationsApi.resolveGitSha({
              url,
              ref: selectedRef || flutterConfig.gitBranch || "main",
              token: tokenToUse,
              deployKey: flutterConfig.deployKey || undefined,
            });
            if (shaData.sha) {
              setLockedCommitSha(shaData.sha);
              handleFlutterChange({
                target: { name: "commitSha", value: shaData.sha },
              } as any);
            }
          } catch {}
        } catch (err: any) {
          const fallbackPkg = derivedPkgName;
          if (isDeployKey) {
            setGitValidationResult({
              isValid: true,
              isDeployKeyNotice: true,
              message:
                "Private repository configured with Deploy Key. Full verification will be orchestrated via Jenkins CI runner.",
              packageName: fallbackPkg,
            });
            if (fallbackPkg && flutterConfig.packageName !== fallbackPkg) {
              if (onUpdateFlutterConfig) {
                onUpdateFlutterConfig({ packageName: fallbackPkg });
              } else {
                handleFlutterChange({
                  target: { name: "packageName", value: fallbackPkg },
                } as any);
              }
            }

            // Still query tags & branches via SSH deploy key fallback
            try {
              const tagsData = await integrationsApi.getGitTags({
                url,
                deployKey: flutterConfig.deployKey || undefined,
                isPrivate: true,
                authMethod: "deploy_key",
              });
              if (tagsData.tags && Array.isArray(tagsData.tags)) {
                setTags(tagsData.tags);
              }
            } catch {}

            try {
              const branchesData = await integrationsApi.getGitBranches({
                url,
                deployKey: flutterConfig.deployKey || undefined,
                isPrivate: true,
                authMethod: "deploy_key",
              });
              if (branchesData.branches && Array.isArray(branchesData.branches)) {
                setBranches(branchesData.branches);
                if (!selectedRef && !flutterConfig.gitBranch) {
                  const defB = branchesData.branches.includes("main") ? "main" : branchesData.branches[0];
                  handleRefChange(defB);
                }
              }
            } catch {}

            try {
              const shaData = await integrationsApi.resolveGitSha({
                url,
                ref: selectedRef || flutterConfig.gitBranch || "main",
                deployKey: flutterConfig.deployKey || undefined,
              });
              if (shaData.sha) {
                setLockedCommitSha(shaData.sha);
              }
            } catch {}
          } else {
            setGitValidationResult({
              isValid: false,
              error: err.message || "Real-time validation error.",
            });
          }
        } finally {
          setIsGitValidating(false);
        }
      }, 600);
    } else {
      setIsGitValidating(false);
    }

    return () => {
      if (gitDebounceRef.current) clearTimeout(gitDebounceRef.current);
    };
  }, [
    flutterConfig.gitUrl,
    flutterConfig.gitPath,
    flutterConfig.path,
    flutterConfig.gitAccessToken,
    flutterConfig.deployKey,
    isPrivateRepo,
    authMethod,
    selectedRef,
  ]);

  // Real-time Nexus Package Validation with Debounce (500ms)
  useEffect(() => {
    const pkg = flutterConfig.packageName?.trim() || "";

    if (!pkg || flutterConfig.sourceType !== SourceType.ARTIFACT) {
      setNexusValidationResult(null);
      setIsNexusValidating(false);
      return;
    }

    if (nexusDebounceRef.current) {
      clearTimeout(nexusDebounceRef.current);
    }

    setIsNexusValidating(true);
    nexusDebounceRef.current = setTimeout(async () => {
      try {
        const data = await integrationsApi.getNexusPackage(pkg);
        setNexusValidationResult(data);

        if (
          data.exists &&
          data.latestVersion &&
          !flutterConfig.versionConstraint
        ) {
          handleFlutterChange({
            target: {
              name: "versionConstraint",
              value: `^${data.latestVersion}`,
            },
          } as any);
        }
      } catch (err: any) {
        setNexusValidationResult({
          isValid: false,
          exists: false,
          error: "Could not connect to Nexus registry.",
        });
      } finally {
        setIsNexusValidating(false);
      }
    }, 500);

    return () => {
      if (nexusDebounceRef.current) clearTimeout(nexusDebounceRef.current);
    };
  }, [flutterConfig.packageName, flutterConfig.sourceType]);

  const handleRefChange = (val: string) => {
    setSelectedRef(val);
    if (onUpdateFlutterConfig) {
      onUpdateFlutterConfig({
        gitBranch: val,
        ref: val,
      });
    } else {
      handleFlutterChange({
        target: { name: "gitBranch", value: val },
      } as any);
    }
  };

  const handleRefTypeChange = (type: "tag" | "branch" | "commit") => {
    setSelectedRefType(type);
    let defaultVal = selectedRef;
    if (type === "tag" && tags.length > 0) {
      defaultVal = tags[0];
    } else if (type === "branch") {
      defaultVal =
        branches.length > 0
          ? branches[0]
          : flutterConfig.gitBranch || "main";
    } else if (type === "commit" && lockedCommitSha) {
      defaultVal = lockedCommitSha;
    }
    if (defaultVal) {
      handleRefChange(defaultVal);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Label>Package Integration Mode</Label>
        <Select
          name="sourceType"
          value={flutterConfig?.sourceType || SourceType.ARTIFACT}
          onChange={handleFlutterChange}
          disabled={!isEditable}
        >
          <option value={SourceType.ARTIFACT}>
            Package Artifact (.zip / .tar.gz)
          </option>
          <option value={SourceType.GIT}>
            Source Code (GitHub / GitLab Repository)
          </option>
        </Select>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {flutterConfig?.sourceType === SourceType.GIT
            ? "Integrates source code directly from a Git repository or monorepo subfolder using branch, tag, or commit SHA."
            : "Upload a .zip/.tar.gz package bundle to integrate your Flutter Mini App."}
        </p>
      </div>

      {flutterConfig?.sourceType === SourceType.GIT ? (
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
                    Open source or publicly accessible repository. Zero
                    credentials or tokens required.
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
                    Internal or proprietary code. Authorized securely via SSH
                    Deploy Key (Recommended) or Token.
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
                <span className="font-bold">Public Repository Access:</span>{" "}
                Zero credentials or personal tokens are stored. The automated
                CI/CD pipeline and security scanner will shallow clone this
                repository anonymously.
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
                    Choose your preferred authentication method for CI/CD
                    ingestion
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
                      Please generate an SSH key pair for your repository, add the public key to your repository&apos;s Deploy Keys (read-only), and input your private key below. The platform never shares platform keys and uses your key ephemerally during package verification.
                    </div>
                  </div>

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
                        <span>
                          {showTokenPassword ? "Hide Token" : "Show Token"}
                        </span>
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
                      GitHub Personal Access Token with <code>repo</code> scope,
                      or GitLab Project Deploy Token with{" "}
                      <code>read_repository</code> scope.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

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
                Tip: You can paste repository root or direct subfolder links
                (e.g. <code>.../tree/main/packages/miniapp</code>). For SSH
                deploy keys, SSH clone URLs (<code>git@...</code>) are
                recommended.
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
                  If your repository is a monorepo, specify the relative path to
                  the folder containing <code>pubspec.yaml</code>.
                </p>
              </div>

            <div>
              <Label>Reference Type</Label>
              <Select
                value={selectedRefType}
                onChange={(e: any) => handleRefTypeChange(e.target.value)}
                disabled={!isEditable}
              >
                <option value="tag">
                  Tag (Recommended for stable releases)
                </option>
                <option value="branch">
                  Branch (Development / Active feature)
                </option>
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
      ) : (
        <div className="space-y-6">
          {/* Direct Package Archive (.zip / .tar.gz) Upload Section */}
          <div className="p-5 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-indigo-950/20 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 transition-colors">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-inner">
                  <PackageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Upload Flutter Package Archive (.zip / .tar.gz)
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    Zero credentials required. Upload your zipped package bundle
                    to auto-extract metadata & capabilities.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label
                  className={`cursor-pointer w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
                    isUploadingArchive || !isEditable
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {isUploadingArchive ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Extracting pubspec...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      <span>Choose Archive</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".zip,.tar.gz,.tgz,application/zip,application/gzip,application/x-tar"
                    onChange={handleArchiveFileChange}
                    disabled={isUploadingArchive || !isEditable}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {archiveUploadSuccess && (
              <div className="mt-4 p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm text-indigo-900 dark:text-indigo-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 font-bold" />
                    <span>
                      Archive Sanitized & Inspected:{" "}
                      {archiveUploadSuccess.filename}
                    </span>
                  </span>
                  {archiveUploadSuccess.sha256 && (
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                      SHA: {archiveUploadSuccess.sha256.substring(0, 12)}...
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <PackageIcon className="w-3.5 h-3.5 text-indigo-500" />{" "}
                    Package:{" "}
                    <strong>
                      {flutterConfig?.packageName ||
                        archiveUploadSuccess.pubspec?.name}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <TagIcon className="w-3.5 h-3.5 text-indigo-500" /> Version:{" "}
                    <strong>
                      {flutterConfig?.versionConstraint ||
                        "^" +
                          (archiveUploadSuccess.pubspec?.version || "1.0.0")}
                    </strong>
                  </span>
                  {archiveUploadSuccess.size ? (
                    <span className="inline-flex items-center gap-1">
                      <ZapIcon className="w-3.5 h-3.5 text-amber-500" /> Clean
                      Size: {(archiveUploadSuccess.size / 1024).toFixed(1)} KB{" "}
                      {archiveUploadSuccess.strippedFilesCount
                        ? `(Stripped ${archiveUploadSuccess.strippedFilesCount} cache files)`
                        : ""}
                    </span>
                  ) : null}
                  <span className="text-slate-500 dark:text-slate-400 italic">
                    (Archive will be stored into MinIO quarantine upon form
                    submission)
                  </span>
                </div>
              </div>
            )}

            {archiveUploadError && (
              <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-300 flex items-center gap-1.5 font-medium">
                <XIcon className="w-4 h-4 text-rose-500" />
                <span>{archiveUploadError}</span>
              </div>
            )}

            {allErrors["integrationConfigFlutter.archiveFile"] &&
              !archiveUploadSuccess && (
                <div className="mt-4 p-3.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2 font-semibold animate-in fade-in">
                  <AlertTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>
                    {allErrors["integrationConfigFlutter.archiveFile"]}
                  </span>
                </div>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>
                  Package Name <span className="text-rose-500">*</span>
                </Label>
                {isNexusValidating && (
                  <span className="text-sm text-blue-500 animate-pulse font-medium">
                    Checking Nexus...
                  </span>
                )}
              </div>
              <Input
                required
                name="packageName"
                value={flutterConfig?.packageName || ""}
                onChange={handleFlutterChange}
                disabled={!isEditable}
                placeholder="e.g. ma_flutter_trust_regulator"
                className={
                  nexusValidationResult?.exists === false &&
                  !archiveUploadSuccess &&
                  !flutterConfig?.packageStoragePath &&
                  !flutterConfig?.archiveChecksum
                    ? "border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                    : nexusValidationResult?.exists === true
                      ? "border-emerald-500 ring-1 ring-emerald-500 focus:ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : archiveUploadSuccess ||
                          flutterConfig?.packageStoragePath ||
                          flutterConfig?.archiveChecksum
                        ? "border-indigo-500 ring-1 ring-indigo-500 focus:ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                        : ""
                }
              />
              {nexusValidationResult && !isNexusValidating && (
                <div className="mt-1.5 text-sm font-medium">
                  {nexusValidationResult.exists ? (
                    <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4" />
                      <span>
                        Found on Nexus (Latest:{" "}
                        {nexusValidationResult.latestVersion || "1.0.0"})
                      </span>
                    </p>
                  ) : archiveUploadSuccess ||
                    flutterConfig?.packageStoragePath ||
                    flutterConfig?.archiveChecksum ||
                    (flutterConfig as any)?.isArchiveSubmission ? (
                    <p className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <PackageIcon className="w-4 h-4" />
                      <span>
                        Package archive uploaded. &quot;
                        {flutterConfig?.packageName}&quot; will be validated and
                        published to Nexus during review.
                      </span>
                    </p>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangleIcon className="w-4 h-4" />
                      <span>
                        Package &quot;{flutterConfig?.packageName}&quot; not
                        found in Nexus pub-group. It will be validated and
                        published to Nexus during review.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>
                Version Constraint <span className="text-rose-500">*</span>
              </Label>
              {nexusValidationResult?.versions &&
              nexusValidationResult.versions.length > 0 ? (
                <div className="flex gap-2">
                  <Input
                    name="versionConstraint"
                    value={flutterConfig?.versionConstraint || ""}
                    onChange={handleFlutterChange}
                    disabled={!isEditable}
                    placeholder="e.g. ^1.0.0"
                    className={
                      allErrors["integrationConfigFlutter.versionConstraint"]
                        ? "border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50"
                        : ""
                    }
                  />
                  <Select
                    value={flutterConfig?.versionConstraint || ""}
                    onChange={(e: any) =>
                      handleFlutterChange({
                        target: {
                          name: "versionConstraint",
                          value: `^${e.target.value}`,
                        },
                      } as any)
                    }
                    disabled={!isEditable}
                    className="w-36 text-sm"
                  >
                    <option value="">Versions ▼</option>
                    {nexusValidationResult.versions.map((v: string) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <Input
                  name="versionConstraint"
                  value={flutterConfig?.versionConstraint || ""}
                  onChange={handleFlutterChange}
                  disabled={!isEditable}
                  placeholder="e.g. ^1.0.0"
                  className={
                    allErrors["integrationConfigFlutter.versionConstraint"]
                      ? "border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50"
                      : ""
                  }
                />
              )}
              {allErrors["integrationConfigFlutter.versionConstraint"] && (
                <p className="mt-1.5 text-sm text-rose-600 font-medium">
                  {allErrors["integrationConfigFlutter.versionConstraint"]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Super App Container pubspec.yaml Integration & Live Resolution */}
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
              Automated extraction and dynamic AST injection into <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-400 font-semibold">superapp_mobile/pubspec.yaml</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRunPrecheck}
              disabled={isPrechecking || isTestingResolution || isSyncingPubspec}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-sm"
              title="Simulate candidate dependency injection in an isolated dry-run workspace to pre-check conflicts before approval"
            >
              <ShieldCheckIcon className={`w-3.5 h-3.5 ${isPrechecking ? 'animate-spin' : ''}`} />
              <span>{isPrechecking ? 'Pre-checking...' : 'Pre-check Conflicts'}</span>
            </Button>

            {isSuperAdminOrAdmin && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncPubspec}
                disabled={isSyncingPubspec || isTestingResolution}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                title="Synchronize all approved mini app packages into container pubspec.yaml (SA Admin only)"
              >
                <PackageIcon className={`w-3.5 h-3.5 ${isSyncingPubspec ? 'animate-spin' : ''}`} />
                <span>{isSyncingPubspec ? 'Syncing...' : 'Sync Container'}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={handleTestResolution}
              disabled={isTestingResolution || isSyncingPubspec}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
              title="Run flutter pub get --dry-run in container to verify dependency compatibility"
            >
              <ZapIcon className={`w-3.5 h-3.5 ${isTestingResolution ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
              <span>{isTestingResolution ? 'Resolving...' : 'Test Pubspec Resolution'}</span>
            </Button>
          </div>
        </div>

        {/* Status Card - Focused Exclusively on this Mini App */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
          {(() => {
            const rawPkg = (flutterConfig.packageName || formData.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const targetPkg = rawPkg.replace(/-/g, '_');
            const boundConfig =
              pubspecStatus?.miniAppDependencies?.[targetPkg] ||
              pubspecStatus?.miniAppDependencies?.[rawPkg] ||
              pubspecStatus?.miniAppDependencies?.[(formData.appId || '').toLowerCase().replace(/[^a-z0-9_]/g, '_')];
            const isInjected = Boolean(boundConfig);

            const bindingDesc = typeof boundConfig === 'string'
              ? boundConfig
              : boundConfig?.path
              ? `path: ${boundConfig.path}`
              : boundConfig?.git
              ? `git: ${typeof boundConfig.git === 'string' ? boundConfig.git : boundConfig.git.url || ''} (ref: ${boundConfig.git?.ref || 'main'}${boundConfig.git?.path ? `, path: ${boundConfig.git.path}` : ''})`
              : boundConfig?.hosted
              ? `hosted: ${typeof boundConfig.hosted === 'object' ? boundConfig.hosted.name || targetPkg : boundConfig.hosted} (${boundConfig.version || '^1.0.0'})`
              : isInjected
              ? JSON.stringify(boundConfig)
              : (flutterConfig.gitUrl || flutterConfig.repoUrl)
              ? `git: ${flutterConfig.gitUrl || flutterConfig.repoUrl} (ref: ${flutterConfig.gitBranch || flutterConfig.gitTag || flutterConfig.commitSha || flutterConfig.ref || 'main'}${flutterConfig.gitPath || flutterConfig.packagePath ? `, path: ${flutterConfig.gitPath || flutterConfig.packagePath}` : ''})`
              : flutterConfig.packageStoragePath
              ? `artifact: ${flutterConfig.versionConstraint || '^1.0.0'}`
              : 'Configured source will be injected into container upon approval';

            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white truncate">
                      {targetPkg || 'flutter_miniapp'}
                    </span>
                    {isInjected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>INJECTED &amp; BOUND</span>
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
                  <div>Container: <span className="font-mono text-slate-600 dark:text-slate-300">superapp_mobile</span></div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center sm:justify-end gap-1 mt-0.5">
                    <ShieldCheckIcon className="w-3 h-3" />
                    <span>AST Safe Backup Active</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Web Sandbox Rebuild Trigger */}
          {isSuperAdminOrAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <GlobeIcon className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span>Need to compile and sync changes immediately to the live Super App Web Sandbox preview?</span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleRebuildSandbox}
                disabled={isRebuildingSandbox}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                title="Trigger background Flutter Web sandbox compilation (SA Admin only)"
              >
                <GlobeIcon className={`w-3.5 h-3.5 ${isRebuildingSandbox ? 'animate-spin' : ''}`} />
                <span>{isRebuildingSandbox ? 'Rebuilding...' : 'Rebuild Web Sandbox Preview'}</span>
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
                  : "bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  {precheckResult.compatible ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>
                    {precheckResult.compatible
                      ? "Pre-check Passed: 100% Compatible with Super App Container"
                      : "Pre-check Conflict Detected"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPrecheckResult(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕ Close
                </button>
              </div>
              <p className="text-xs leading-relaxed">{precheckResult.message}</p>

              {precheckResult.directConflicts && precheckResult.directConflicts.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 space-y-1 font-mono text-[11px] text-rose-800 dark:text-rose-200">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-100">
                    <AlertTriangleIcon className="w-3.5 h-3.5" />
                    <span>Version Incompatibilities:</span>
                  </div>
                  {precheckResult.directConflicts.map((c: string, i: number) => (
                    <div key={i} className="pl-4 leading-relaxed">&bull; {c}</div>
                  ))}
                </div>
              )}

              {precheckResult.newPackages && precheckResult.newPackages.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Introduced Dependencies: </span>
                  {precheckResult.newPackages.map((p: any) => `${p.package} (${p.version})`).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Terminal Console Output for Pub Resolution */}
          {resolutionResult && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 shadow-inner space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${resolutionResult.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="font-bold text-slate-200">
                    flutter pub get {resolutionResult.dryRun ? '--dry-run' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Exit Code: <strong className={resolutionResult.success ? 'text-emerald-400' : 'text-rose-400'}>{resolutionResult.exitCode}</strong></span>
                  <button
                    type="button"
                    onClick={() => setResolutionResult(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs px-1"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {resolutionResult.message && (
                <p className={`text-xs ${resolutionResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resolutionResult.message}
                </p>
              )}

              {resolutionResult.conflicts && resolutionResult.conflicts.length > 0 && (
                <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 space-y-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-400" />
                    Detected Conflicts / Errors:
                  </span>
                  {resolutionResult.conflicts.map((c: string, idx: number) => (
                    <div key={idx} className="text-[11px] pl-4">{c}</div>
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
    </div>
  );
}
