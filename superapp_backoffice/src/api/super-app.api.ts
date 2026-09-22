import { apiClient } from './client';

export interface EcosystemStatus {
  superAppVersion: string;
  superAppTestVersion?: string;
  officialReleaseVersion?: string;
  integratedServices?: {
    nexusRegistry?: { url: string; status: string };
    jenkinsCiCd?: { url: string; status: string };
    telegramBot?: { username: string; status: string };
    minioStorage?: { endpoint: string; status: string };
  };
  [key: string]: any;
}

export const superAppApi = {
  getEcosystemStatus: () =>
    apiClient<EcosystemStatus>('/api/super-app/ecosystem-status'),

  getNextVersion: () =>
    apiClient<{ nextVersion: string }>('/api/super-app/next-version'),

  verifyReleaseAssembly: (payload: any) =>
    apiClient<any>('/api/release-assembly/verify', {
      method: 'POST',
      body: payload,
    }),

  getStorageLicenseStatus: () =>
    apiClient<any>('/api/storage/license-status'),

  updateStorageLicense: (licenseKey: string) =>
    apiClient<any>('/api/storage/update-license', {
      method: 'POST',
      body: { licenseKey },
    }),

  getReleaseHistory: () =>
    apiClient<any[]>('/api/super-app/releases/history'),

  compareReleases: (base: string, target: string) =>
    apiClient<any>(`/api/super-app/releases/compare?base=${encodeURIComponent(base)}&target=${encodeURIComponent(target)}`),
};

