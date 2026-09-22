import { apiClient } from './client';

export interface GitValidationResult {
  isValid: boolean;
  packageName?: string;
  error?: string;
  provider?: string;
  dependencies?: Record<string, string>;
}

export interface NexusPackageResult {
  exists: boolean;
  packageName?: string;
  latestVersion?: string;
  versions?: string[];
  error?: string;
}

export interface CandidateDependencyDto {
  miniAppId?: string;
  packageName: string;
  gitUrl?: string;
  ref?: string;
  path?: string;
  version?: string;
  isHosted?: boolean;
  hostedUrl?: string;
  deployKey?: string;
  gitAccessToken?: string;
}

export interface PrecheckConflictResult {
  compatible: boolean;
  packageName: string;
  directConflicts: string[];
  transitiveBumps: Array<{ package: string; oldVersion?: string; newVersion: string }>;
  newPackages: Array<{ package: string; version: string }>;
  message: string;
  rawOutput: string;
}

export interface SandboxBuildStatus {
  state: 'IDLE' | 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED';
  lastBuildTime?: string;
  durationMs?: number;
  triggeredBy?: string;
  exitCode?: number;
  message: string;
  recentLogs: string[];
}

export const integrationsApi = {
  getDeployKey: () =>
    apiClient<{
      publicKey: string;
      fingerprint: string;
      type: string;
      title: string;
    }>('/api/integrations/git/deploy-key'),

  validateGit: (data: {
    url: string;
    ref?: string;
    token?: string;
    path?: string;
    isPrivate?: boolean;
    authMethod?: string;
    deployKey?: string;
  }) =>
    apiClient<{ validation: GitValidationResult; provider?: 'github' | 'gitlab' }>('/api/integrations/git/validate', {
      method: 'POST',
      body: data,
    }),

  getGitTags: (data: {
    url: string;
    token?: string;
    deployKey?: string;
    isPrivate?: boolean;
    authMethod?: string;
  }) =>
    apiClient<{ tags: string[] }>('/api/integrations/git/tags', {
      method: 'POST',
      body: data,
    }),

  getGitBranches: (data: {
    url: string;
    token?: string;
    deployKey?: string;
    isPrivate?: boolean;
    authMethod?: string;
  }) =>
    apiClient<{ branches: string[] }>('/api/integrations/git/branches', {
      method: 'POST',
      body: data,
    }),

  resolveGitSha: (data: {
    url: string;
    ref: string;
    token?: string;
    deployKey?: string;
  }) =>
    apiClient<{ sha: string }>('/api/integrations/git/resolve-sha', {
      method: 'POST',
      body: data,
    }),

  getNexusPackage: (packageName: string) =>
    apiClient<NexusPackageResult>(`/api/integrations/nexus/packages/${encodeURIComponent(packageName)}`),

  scanGate1: (data: { url: string; ref?: string; path?: string; token?: string; declaredPermissions?: any[] }) =>
    apiClient<any>('/api/security/gate1/scan', {
      method: 'POST',
      body: data,
    }),

  runGate1Scan: (data: { url: string; ref?: string; path?: string; token?: string; declaredPermissions?: any[] }) =>
    apiClient<any>('/api/security/gate1/scan', {
      method: 'POST',
      body: data,
    }),
};

export interface PubspecStatus {
  pubspecPath: string;
  exists: boolean;
  hasBackup: boolean;
  totalDependencies: number;
  miniAppDependencies: Record<string, any>;
  lastModified?: string;
}

export interface PubspecValidationResult {
  success: boolean;
  dryRun: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  message: string;
  conflicts: string[];
}

export const pubspecApi = {
  getStatus: () => apiClient<PubspecStatus>('/api/pubspec/status'),

  getPackageConstraints: () => apiClient<Record<string, string>>('/api/pubspec/package-constraints'),

  precheckConflicts: (data: CandidateDependencyDto) =>
    apiClient<PrecheckConflictResult>('/api/pubspec/precheck-conflicts', {
      method: 'POST',
      body: data,
    }),

  validate: (dryRun = true) =>
    apiClient<PubspecValidationResult>('/api/pubspec/validate', {
      method: 'POST',
      body: { dryRun },
    }),

  syncApprovedMiniApps: () =>
    apiClient<{
      success: boolean;
      syncedCount: number;
      injectedPackages: string[];
      validationResult: PubspecValidationResult;
    }>('/api/pubspec/sync', {
      method: 'POST',
    }),

  injectDependency: (data: {
    packageName: string;
    gitUrl?: string;
    ref?: string;
    path?: string;
    version?: string;
    isHosted?: boolean;
    hostedUrl?: string;
  }) =>
    apiClient<{
      success: boolean;
      packageName: string;
      injectedConfig: any;
      message: string;
    }>('/api/pubspec/inject', {
      method: 'POST',
      body: data,
    }),

  restoreBackup: () =>
    apiClient<{ success: boolean; message: string }>('/api/pubspec/restore-backup', {
      method: 'POST',
    }),

  getSandboxBuildStatus: () => apiClient<SandboxBuildStatus>('/api/pubspec/sandbox-build/status'),

  triggerSandboxBuild: () =>
    apiClient<{ success: boolean; message: string }>('/api/pubspec/sandbox-build/trigger', {
      method: 'POST',
    }),
};
