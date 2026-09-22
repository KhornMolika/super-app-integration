import { apiClient } from './client';

export interface Permission {
  id: string;
  key?: string;
  name: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  isDeprecated?: boolean;
  platform?: string;
  introducedInVersion?: string;
  deprecatedInVersion?: string;
  minSuperAppVersion?: string;
  maxSuperAppVersion?: string;
  metadata?: any;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionProposal {
  id: string;
  name: string;
  description?: string;
  justification?: string;
  status: string;
  requestedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const permissionsApi = {
  getAll: () =>
    apiClient<Permission[]>('/api/permissions'),

  getById: (id: string) =>
    apiClient<Permission>(`/api/permissions/${id}`),

  update: (id: string, data: Partial<Permission>) =>
    apiClient<Permission>(`/api/permissions/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  getProposals: () =>
    apiClient<PermissionProposal[]>('/api/permission-proposals'),

  reviewProposal: (id: string, payload: { decision: string; reason?: string; targetVersion?: string }) =>
    apiClient<{ success: boolean }>(`/api/permission-proposals/${id}/review`, {
      method: 'POST',
      body: payload,
    }),
};
