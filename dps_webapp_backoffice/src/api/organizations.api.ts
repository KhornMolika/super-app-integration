import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  description?: string;
  contactEmail?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt?: string;
  updatedAt?: string;
}

export const organizationsApi = {
  getAll: () =>
    apiClient<Organization[]>('/api/organizations'),

  getById: (id: string) =>
    apiClient<Organization>(`/api/organizations/${id}`),

  create: (data: Partial<Organization>) =>
    apiClient<Organization>('/api/organizations', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<Organization>) =>
    apiClient<Organization>(`/api/organizations/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    apiClient<void>(`/api/organizations/${id}`, {
      method: 'DELETE',
    }),
};
