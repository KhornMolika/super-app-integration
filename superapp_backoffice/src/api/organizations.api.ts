import { apiClient } from './client';

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
  parentAuthority?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  users?: OrganizationUser[];
  miniApps?: OrganizationMiniApp[];
  createdAt?: string;
  updatedAt?: string;
}

export const organizationsApi = {
  getAll: (params?: { status?: string }) =>
    apiClient<Organization[]>('/api/organizations', { params }),

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
 * Root authorities require heightened safety locks (Super Admin name confirmation) before disabling.
 */
export function isRootOrganization(
  org: { name?: string; code?: string; parentAuthority?: string } | null | undefined,
): boolean {
  if (!org) return false;
  const code = (org.code || '').trim().toUpperCase();
  const name = (org.name || '').toLowerCase();
  return (
    code === 'FSA' ||
    code === 'FTC' ||
    name.includes('non-bank financial services authority') ||
    name.includes('financial technology center')
  );
}
