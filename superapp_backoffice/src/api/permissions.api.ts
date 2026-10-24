import { apiClient, unwrapData, PaginatedResponse } from './client';

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
    [key: string]: any;
  };
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
    apiClient<CapabilityItem[]>(`/api/permissions/capabilities${refresh ? '?refresh=true' : ''}`),

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
    apiClient<PermissionProposal>('/api/permission-proposals', {
      method: 'POST',
      body: data,
    }),

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
      mrUrl?: string;
      branchName?: string;
      targetBranch?: string;
      message?: string;
    }>(`/api/permission-proposals/${id}/review`, {
      method: 'POST',
      body: payload,
    }),
};
