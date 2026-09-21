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

  getGitTags: (data: { url: string; token?: string }) =>
    apiClient<{ tags: string[] }>('/api/integrations/git/tags', {
      method: 'POST',
      body: data,
    }),

  getGitBranches: (data: { url: string; token?: string }) =>
    apiClient<{ branches: string[] }>('/api/integrations/git/branches', {
      method: 'POST',
      body: data,
    }),

  resolveGitSha: (data: { url: string; ref: string }) =>
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
