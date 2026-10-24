import { apiClient, PaginatedResponse } from './client';

export interface MiniApp {
  id: string;
  appId: string;
  name: string;
  tagline?: string;
  description?: string;
  shortDescription?: string;
  fullDescription?: string;
  category?: string;
  iconUrl?: string;
  logo?: string;
  status: string;
  lifecycleStatus?: string;
  availabilityStatus?: string;
  version?: string;
  currentReleaseVersion?: string;
  activeTestVersion?: string;
  integrationMethod?: any;
  integrationConfig?: any;
  capabilities?: any[];
  permissions?: any[];
  permissionRequests?: any[];
  alertTelegramChatId?: string;
  teamTelegramChatId?: string;
  supportEmail?: string;
  supportUrl?: string;
  legal?: any;
  validationErrors?: any;
  validationStatus?: string;
  validationStages?: any;
  validationReport?: any;
  issues?: any[];
  pendingRevision?: any;
  isFastTrack?: boolean;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export const miniappsApi = {
  getAll: (
    filterOrStatus?:
      | string
      | {
          status?: string;
          mine?: boolean;
          page?: number;
          limit?: number;
          search?: string;
          integrationMethod?: string;
          sortBy?: string;
          sortOrder?: 'ASC' | 'DESC';
        },
  ) => {
    let params: Record<string, any> = {};
    if (typeof filterOrStatus === 'string') {
      params.status = filterOrStatus;
    } else if (filterOrStatus && typeof filterOrStatus === 'object') {
      params = { ...filterOrStatus };
    }
    return apiClient<PaginatedResponse<MiniApp> | MiniApp[]>('/api/mini-apps', { params });
  },

  getMyMiniApps: (status?: string) =>
    apiClient<MiniApp[]>('/api/mini-apps', { params: { status, mine: true } }),

  getById: (id: string) =>
    apiClient<MiniApp>(`/api/mini-apps/${id}`),

  createDraft: (data: any) =>
    apiClient<MiniApp>('/api/mini-apps/draft', { method: 'POST', body: data }),

  create: (data: any) =>
    apiClient<MiniApp>('/api/mini-apps', { method: 'POST', body: data }),

  update: (id: string, data: any) =>
    apiClient<MiniApp>(`/api/mini-apps/${id}`, { method: 'PATCH', body: data }),

  delete: (id: string) =>
    apiClient<void>(`/api/mini-apps/${id}`, { method: 'DELETE' }),

  checkExists: (params: { appId?: string; name?: string; excludeId?: string }) =>
    apiClient<{ appIdExists: boolean; nameExists: boolean }>('/api/mini-apps/check-exists', { params }),

  checkUrl: (url: string) =>
    apiClient<{ reachable: boolean; error?: string }>('/api/mini-apps/check-url', { params: { url } }),

  generateToken: () =>
    apiClient<{ token: string }>('/api/mini-apps/generate-token'),

  verifyDomain: (data: { id?: string; productionUrl: string; appId?: string; verificationToken?: string }) => {
    if (data.id) {
      return apiClient<{ verified: boolean; error?: string }>(`/api/mini-apps/${data.id}/verify-domain`, {
        method: 'POST',
        body: { productionUrl: data.productionUrl },
      });
    }
    return apiClient<{ verified: boolean; error?: string }>('/api/mini-apps/verify-domain', {
      method: 'POST',
      body: data,
    });
  },

  triggerAction: (id: string, action: string, reason?: string) =>
    apiClient<{ success: boolean; message?: string }>(`/api/mini-apps/${id}/${action}`, {
      method: 'POST',
      body: { reason },
    }),

  executeAction: (id: string, action: string, reason?: string) =>
    apiClient<{ success: boolean; message?: string }>(`/api/mini-apps/${id}/${action}`, {
      method: 'POST',
      body: { reason },
    }),

  getDiff: (id: string, baseVersion?: string, targetVersion?: string) =>
    apiClient<any>(`/api/mini-apps/${id}/diff`, { params: { baseVersion, targetVersion } }),

  getActivities: (id: string) =>
    apiClient<any[]>(`/api/mini-apps/${id}/activities`),

  getVersions: (
    id: string,
    params?: { page?: number; limit?: number; sortOrder?: 'ASC' | 'DESC' },
  ) =>
    apiClient<any>(`/api/mini-apps/${id}/versions`, { params }).then((res) =>
      res?.data ? res.data : res,
    ),

  rollback: (id: string, targetVersion: string, reason?: string) =>
    apiClient<{ success: boolean; message?: string }>(`/api/mini-apps/${id}/rollback`, {
      method: 'POST',
      body: { targetVersion, reason },
    }),

  rescan: (id: string, securityChecks?: string[]) =>
    apiClient<any>(`/api/mini-apps/${id}/rescan`, {
      method: 'POST',
      body: securityChecks && securityChecks.length > 0 ? { securityChecks } : {},
    }),

  cancelValidation: (id: string) =>
    apiClient<any>(`/api/mini-apps/${id}/cancel-validation`, { method: 'POST' }),

  inspectArtifact: (formData: FormData) =>
    apiClient<{
      success: boolean;
      pubspec?: {
        name?: string;
        version?: string;
        description?: string;
        dependencies?: Record<string, any>;
        environment?: Record<string, any>;
      };
      sha256?: string;
      filename?: string;
      size?: number;
      originalSize?: number;
      isSanitized?: boolean;
      strippedFilesCount?: number;
      detectedPermissions?: Array<{ type: string; purpose: string; source?: string; termsUrl?: string }>;
      message?: string;
    }>('/api/mini-apps/inspect-artifact', {
      method: 'POST',
      body: formData,
    }),

  uploadArtifact: (formData: FormData) =>
    apiClient<{
      success?: boolean;
      packageUrl: string;
      packageStoragePath?: string;
      minioUrl?: string;
      minioKey?: string;
      packageName?: string;
      pubspec?: any;
      sha256?: string;
      filename?: string;
      size?: number;
      originalSize?: number;
      isSanitized?: boolean;
      strippedFilesCount?: number;
      detectedPermissions?: Array<{ type: string; purpose: string; source?: string; termsUrl?: string }>;
      message?: string;
    }>('/api/mini-apps/upload-artifact', {
      method: 'POST',
      body: formData,
    }),

  getAllIssues: () =>
    apiClient<any[]>('/api/mini-apps/issues/all'),

  detectPermissions: (data: {
    productionUrl?: string;
    gitUrl?: string;
    gitBranch?: string;
    gitPath?: string;
    category?: string;
    name?: string;
    appId?: string;
  }) =>
    apiClient<{ detected: Array<{ type: string; purpose: string; source: string }> }>('/api/mini-apps/detect-permissions', {
      method: 'POST',
      body: data,
    }),

  generateInviteToken: (id: string, expiresIn: string) =>
    apiClient<{ token: string; expiresAt?: string }>(`/api/mini-apps/${id}/invite-token`, {
      method: 'POST',
      body: { expiresIn },
    }),

  getInviteToken: (id: string, expiresIn: string) =>
    apiClient<{ token: string; expiresAt?: string }>(`/api/mini-apps/${id}/invite-token`, {
      method: 'POST',
      body: { expiresIn },
    }),
};

