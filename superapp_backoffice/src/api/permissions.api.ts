import { apiClient, unwrapData, unwrapItem, PaginatedResponse } from './client';

export interface Permission {
  id: string;
  key?: string;
  name: string;
  description?: string;
  category?: 'DEVICE' | 'SECURITY' | 'PLATFORM' | 'NETWORK' | string;
  isActive?: boolean;
  isDeprecated?: boolean;
  platform?: string;
  introducedInVersion?: string;
  deprecatedInVersion?: string;
  minSuperAppVersion?: string;
  maxSuperAppVersion?: string;
  metadata?: {
    androidPermission?: string;
    iosPlistKey?: string;
    iosUsageDescription?: string;
    isSystemFeature?: boolean;
    requiredPermissions?: string[];
    flutterPlugin?: string;
  };
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CapabilityItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  requiredPermissions: string[];
  platform: 'Android' | 'iOS' | 'Cross-Platform';
  implementationType: 'OS_SYSTEM_API' | 'CUSTOM_IN_APP' | 'HYBRID' | 'FLUTTER_PLUGIN' | 'NATIVE_BRIDGE';
  providerPackage?: string;
  jsBridgeMethod?: string;
  status: 'Active' | 'Beta' | 'Proposed';
  associatedMiniAppsCount?: number;
}

export interface PermissionProposal {
  id: string;
  permissionKey: string;
  permissionName?: string;
  description?: string;
  justification?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'IN_DEVELOPMENT';
  adminDecisionReason?: string;
  targetSuperAppVersion?: string;
  implementedInSuperAppVersion?: string;
  createdAt?: string;
  updatedAt?: string;
  miniApp?: {
    id?: string;
    name: string;
    category?: string;
    appId?: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: {
    requiredPermissions?: string[];
    androidPermissions?: string[];
    iosUsageDescriptions?: Record<string, string>;
    flutterPlugin?: string;
    mrUrl?: string;
    branchName?: string;
    targetBranch?: string;
    /** Outcome of the Super App code change made on approval */
    codeChange?: CodeChange;
    /** Others who asked for the same capability while it was pending */
    supporters?: Array<{ userId: string; miniAppId?: string; at: string }>;
    [key: string]: any;
  };
}

/** Outcome of adding an approved capability to the Super App code. */
export interface CodeChange {
  /**
   * created: code change ready for review; needs_work: no file change, a task was created
   * for the Super App team; not_needed: nothing to do; failed: see error
   */
  status: 'created' | 'needs_work' | 'not_needed' | 'failed';
  mrUrl?: string;
  /** Task (GitLab issue) listing the manual work for the Super App team */
  issueUrl?: string;
  remainingSteps?: string[];
  branchName?: string;
  targetBranch?: string;
  filesModified?: string[];
  message?: string;
  error?: string;
  at?: string;
}

/** What approving would add to each Super App file. */
export interface CodePreview {
  capabilityKey: string;
  /** false: no device permission is known for this capability */
  known: boolean;
  files: Array<{ file: string; label: string; lines: string[] }>;
  /** Work the Super App team does by hand after approval */
  manualSteps?: string[];
  note?: string;
}

/** A request that matched one already pending (see createProposal). */
export type CreatedProposal = PermissionProposal & {
  duplicate?: boolean;
  supporterAdded?: boolean;
  message?: string;
};

export type ProgressState = 'done' | 'current' | 'pending' | 'failed' | 'skipped' | 'unknown';

export interface ProgressStep {
  key: 'requested' | 'review' | 'decision' | 'code_change' | 'merged' | 'release';
  label: string;
  state: ProgressState;
  detail?: string;
  at?: string;
  links?: Array<{ label: string; url: string }>;
}

export interface ProposalProgressInfo {
  proposalId: string;
  capabilityKey: string;
  status: string;
  steps: ProgressStep[];
}

/** Shortest rejection reason the backend accepts. */
export const MIN_REJECT_REASON_LENGTH = 10;

export interface KeySuggestion {
  key: string;
  name: string;
  /** exists: already available; known: supported but not in the catalog yet; similar: close match */
  reason: 'exists' | 'known' | 'similar';
}

export const permissionsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) =>
    apiClient<PaginatedResponse<Permission> | Permission[]>(
      '/api/permissions',
      { params },
    ).then((res) => unwrapData<Permission>(res)),

  getCapabilities: (refresh?: boolean) =>
    apiClient<PaginatedResponse<CapabilityItem> | CapabilityItem[]>(
      `/api/permissions/capabilities${refresh ? '?refresh=true' : ''}`
    ).then((res) => unwrapData<CapabilityItem>(res)),

  syncGitLab: () =>
    apiClient<{
      success: boolean;
      syncedCount: number;
      deactivatedCount?: number;
      targetBranch: string;
      repoUrl: string;
      commitSha?: string;
      syncedAt: string;
      capabilities: CapabilityItem[];
    }>('/api/permissions/sync-gitlab', {
      method: 'POST',
    }),

  getById: (id: string) =>
    apiClient<Permission>(`/api/permissions/${id}`),

  update: (id: string, data: Partial<Permission>) =>
    apiClient<Permission>(`/api/permissions/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  getProposals: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    /** 'true': only requests I made or support */
    mine?: string;
  }) =>
    apiClient<PaginatedResponse<PermissionProposal> | PermissionProposal[]>(
      '/api/permission-proposals',
      { params },
    ).then((res) => unwrapData<PermissionProposal>(res)),

  createProposal: (data: {
    permissionKey: string;
    permissionName?: string;
    description?: string;
    miniAppId?: string;
    metadata?: any;
  }) =>
    apiClient<CreatedProposal>('/api/permission-proposals', {
      method: 'POST',
      body: data,
    }).then((res) => unwrapItem<CreatedProposal>(res)),

  /** Steps from request to release, with the live state of the code change. */
  getProposalProgress: (id: string) =>
    apiClient<ProposalProgressInfo>(`/api/permission-proposals/${id}/progress`).then((res) =>
      unwrapItem<ProposalProgressInfo>(res),
    ),

  reviewProposal: (
    id: string,
    payload: {
      decision: string;
      reason?: string;
      targetVersion?: string;
      targetBranch?: string;
      createMr?: boolean;
    },
  ) =>
    apiClient<{
      success: boolean;
      codeChange?: CodeChange | null;
      mrUrl?: string;
      branchName?: string;
      targetBranch?: string;
      message?: string;
    }>(`/api/permission-proposals/${id}/review`, {
      method: 'POST',
      body: payload,
    }).then((res) => unwrapItem(res)),

  /** Exact lines approving would add to the Super App, per file. */
  previewProposal: (id: string) =>
    apiClient<CodePreview>(`/api/permission-proposals/${id}/preview`).then((res) => unwrapItem<CodePreview>(res)),

  /** "Did you mean" suggestions for a capability key being typed. */
  suggestKey: (q: string) =>
    apiClient<{ suggestions: KeySuggestion[] }>('/api/permission-proposals/suggest-key', {
      params: { q },
    }).then((res) => unwrapItem<{ suggestions: KeySuggestion[] }>(res)?.suggestions ?? []),

  /** Super App repository branches for the approve form. */
  getTargetBranches: () =>
    apiClient<{ branches: string[]; defaultBranch: string; source: 'gitlab' | 'fallback' }>(
      '/api/permission-proposals/target-branches',
    ).then((res) => unwrapItem(res)),

  /** Retries a failed code change for an approved proposal. */
  retryCodeChange: (id: string) =>
    apiClient<{ success: boolean; codeChange: CodeChange; message?: string }>(
      `/api/permission-proposals/${id}/retry-code-change`,
      { method: 'POST' },
    ).then((res) => unwrapItem(res)),
};
