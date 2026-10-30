import { apiClient, PaginatedResponse, unwrapItem } from './client';

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  status?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
  createdAt?: string;
}

export interface OrganizationMiniApp {
  id: string;
  appId: string;
  slug?: string;
  name: string;
  tagline?: string;
  category?: string;
  status?: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  code?: string;
  parentId?: string | null;
  parent?: Organization | null;
  children?: Organization[];
  parentAuthority?: string | null | null;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  users?: OrganizationUser[];
  miniApps?: OrganizationMiniApp[];
  createdAt?: string;
  updatedAt?: string;
}

export const organizationsApi = {
  getStats: () =>
    apiClient<{ total: number; active: number; inactive: number }>('/api/organizations/stats'),

  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) =>
    apiClient<PaginatedResponse<Organization> | Organization[]>('/api/organizations', { params }),

  getById: (id: string) =>
    apiClient<any>(`/api/organizations/${id}`).then((res) => unwrapItem<Organization>(res)),

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

  toggleStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    apiClient<Organization>(`/api/organizations/${id}`, {
      method: 'PATCH',
      body: { status },
    }),

  delete: (id: string) =>
    apiClient<void>(`/api/organizations/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * Extracts organization code from name string or returns code directly.
 * Example: "Financial Technology Center (FTC)" -> "FTC"
 */
export function getOrganizationCode(input?: string): string {
  if (!input || !input.trim()) return 'ORG';
  const clean = input.trim();
  const match = clean.match(/\(([A-Z0-9]+)\)/);
  if (match && match[1]) return match[1];
  if (/^[A-Z0-9]{2,5}$/.test(clean)) return clean;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
  }
  return clean.slice(0, 4).toUpperCase();
}

/**
 * Normalizes full organization name.
 */
export function getOrganizationFullName(input?: string): string {
  if (!input || !input.trim()) return 'Regulatory Authority';
  return input.trim();
}

/**
 * Detects if an organization is the root regulatory authority or central executive secretariat
 * (e.g. Non-Bank Financial Services Authority (FSA) or Financial Technology Center (FTC)).
 * Root authorities are Primary Authorities that cannot be disabled because they operate the SuperApp platform.
 */
export function isRootOrganization(
  org: { name?: string; code?: string; parentAuthority?: string | null; parentId?: string | null } | null | undefined,
): boolean {
  if (!org) return false;
  const code = (org.code || '').trim().toUpperCase();
  const name = (org.name || '').toLowerCase();
  return (
    code === 'FSA' ||
    name.includes('non-bank financial services authority') ||
    (!org.parentAuthority && !org.parentId && code !== 'FTC' && !name.includes('financial technology center') && !name.includes('fintech center'))
  );
}

export const isPrimaryAuthorityOrganization = isRootOrganization;
export const isSystemAnchorOrganization = isRootOrganization;
