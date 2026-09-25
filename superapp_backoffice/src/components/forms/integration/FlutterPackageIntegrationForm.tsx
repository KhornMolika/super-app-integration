"use client";

import React, { useState, useEffect, useRef } from "react";
import { SourceType } from "@/types/miniapp.types";
import { miniappsApi, integrationsApi, pubspecApi } from "@/api";
import { useAuth } from "@/lib/auth";
import { inferPackageNameFromGitUrl } from "@/lib/miniapp-form.validator";
import {
  FlutterModeSelector,
  FlutterIntegrationMode,
  FlutterArchiveUploader,
  FlutterGitConfigSection,
  FlutterNexusConfigSection,
  FlutterContainerIntegrationSection,
} from "./flutter";

export interface FlutterPackageIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleFlutterChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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
    hasRole("SUPER_ADMIN") ||
    hasRole("ADMIN") ||
    can("super_app:manage") ||
    can("miniapp:approve");

  const flutterConfig = formData.integrationConfigFlutter || {};

  // Integration Mode: "artifact" | "git"
  const currentMode: FlutterIntegrationMode =
    flutterConfig?.sourceType === SourceType.GIT ? "git" : "artifact";

  const handleSelectMode = (newMode: FlutterIntegrationMode) => {
    if (!isEditable) return;
    const updates: Record<string, any> = {
      sourceType: newMode === "git" ? SourceType.GIT : SourceType.ARTIFACT,
      isHosted: false,
    };

    if (onUpdateFlutterConfig) {
      onUpdateFlutterConfig(updates);
    } else {
      Object.entries(updates).forEach(([key, val]) => {
        handleFlutterChange({ target: { name: key, value: val } } as any);
      });
    }
  };

  // Repository Visibility & Deploy Key States
  const isPrivateRepo = Boolean(flutterConfig.isPrivateRepo);
  const authMethod: "deploy_key" | "token" =
    flutterConfig.authMethod === "token" ? "token" : "deploy_key";

  const [isPrechecking, setIsPrechecking] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<any>(null);

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
  const [lockedCommitSha, setLockedCommitSha] = useState<string>("");

  // State for Nexus Real-Time Validation
  const [isNexusValidating, setIsNexusValidating] = useState(false);
  const [nexusValidationResult, setNexusValidationResult] = useState<any>(null);

  // State for Flutter Package Archive Upload (.zip / .tar.gz)
  const [isUploadingArchive, setIsUploadingArchive] = useState(false);
  const [archiveUploadSuccess, setArchiveUploadSuccess] = useState<any>(null);
  const [archiveUploadError, setArchiveUploadError] = useState<string | null>(
    null,
  );

  // Debounce timers
  const gitDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const nexusDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // State for Container Pubspec Dependency & Live Resolution
  const [pubspecStatus, setPubspecStatus] = useState<any>(null);
  const [, setIsLoadingPubspecStatus] = useState(false);
  const [isTestingResolution, setIsTestingResolution] = useState(false);
  const [resolutionResult, setResolutionResult] = useState<any>(null);
  const [isSyncingPubspec, setIsSyncingPubspec] = useState(false);
  const [isRebuildingSandbox, setIsRebuildingSandbox] = useState(false);
  const [sandboxRebuildMessage, setSandboxRebuildMessage] = useState<
    string | null
  >(null);

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

  const handleTestResolution = async () => {
    try {
      setIsTestingResolution(true);
      setResolutionResult(null);
      const res = await pubspecApi.validate(true);
      setResolutionResult(res);
    } catch (err: any) {
      setResolutionResult({
        success: false,
        message: err.message || "Dependency resolution validation failed.",
        conflicts: [err.message || "Network / execution error."],
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
        message: err.message || "Sync failed.",
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
      setSandboxRebuildMessage(
        res?.message || "Sandbox compilation triggered in background.",
      );
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

          // Fetch tags in background
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

          // Fetch branches in background
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

          // Resolve commit SHA
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
                  const defB = branchesData.branches.includes("main")
                    ? "main"
                    : branchesData.branches[0];
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

    if (!pkg || currentMode === "git") {
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
          const cleanLatest = String(data.latestVersion).trim();
          handleFlutterChange({
            target: {
              name: "versionConstraint",
              value: cleanLatest.startsWith("^")
                ? cleanLatest
                : `^${cleanLatest}`,
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
  }, [flutterConfig.packageName, currentMode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Reusable Mode Selector */}
      <FlutterModeSelector
        mode={currentMode}
        onSelectMode={handleSelectMode}
        disabled={!isEditable}
      />

      {/* Mode 1: Git Repository Config */}
      {currentMode === "git" && (
        <FlutterGitConfigSection
          flutterConfig={flutterConfig}
          allErrors={allErrors}
          isEditable={isEditable}
          isPrivateRepo={isPrivateRepo}
          authMethod={authMethod}
          handleRepoVisibilityChange={handleRepoVisibilityChange}
          handleAuthMethodChange={handleAuthMethodChange}
          handleGitUrlChange={handleGitUrlChange}
          handleGitPathChange={handleGitPathChange}
          handleRefTypeChange={handleRefTypeChange}
          handleRefChange={handleRefChange}
          handleFlutterChange={handleFlutterChange}
          onUpdateFlutterConfig={onUpdateFlutterConfig}
          isGitValidating={isGitValidating}
          gitValidationResult={gitValidationResult}
          detectedProvider={detectedProvider}
          tags={tags}
          branches={branches}
          selectedRefType={selectedRefType}
          selectedRef={selectedRef}
          lockedCommitSha={lockedCommitSha}
        />
      )}

      {/* Mode 2: Package Artifact (.zip / .tar.gz) Upload */}
      {currentMode === "artifact" && (
        <div className="space-y-6">
          <FlutterArchiveUploader
            isUploading={isUploadingArchive}
            archiveUploadSuccess={archiveUploadSuccess}
            archiveUploadError={archiveUploadError}
            onFileSelected={handleArchiveFileChange}
            isEditable={isEditable}
            existingFilename={flutterConfig?.archiveFilename}
            existingChecksum={flutterConfig?.archiveChecksum}
            existingSize={flutterConfig?.archiveSize}
          />

          <FlutterNexusConfigSection
            flutterConfig={flutterConfig}
            allErrors={allErrors}
            isEditable={isEditable}
            isNexusValidating={isNexusValidating}
            nexusValidationResult={nexusValidationResult}
            archiveUploadSuccess={archiveUploadSuccess}
            handleFlutterChange={handleFlutterChange}
          />
        </div>
      )}

      {/* Reusable Container AST Injection & Resolution Section */}
      <FlutterContainerIntegrationSection
        formData={formData}
        flutterConfig={flutterConfig}
        pubspecStatus={pubspecStatus}
        isSuperAdminOrAdmin={isSuperAdminOrAdmin}
        isPrechecking={isPrechecking}
        isTestingResolution={isTestingResolution}
        isSyncingPubspec={isSyncingPubspec}
        isRebuildingSandbox={isRebuildingSandbox}
        precheckResult={precheckResult}
        resolutionResult={resolutionResult}
        sandboxRebuildMessage={sandboxRebuildMessage}
        onRunPrecheck={handleRunPrecheck}
        onSyncPubspec={handleSyncPubspec}
        onTestResolution={handleTestResolution}
        onRebuildSandbox={handleRebuildSandbox}
        onClosePrecheckResult={() => setPrecheckResult(null)}
        onCloseResolutionResult={() => setResolutionResult(null)}
      />
    </div>
  );
}
