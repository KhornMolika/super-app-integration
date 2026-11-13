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
  /** Super Admin: a new test build (APK + web preview) with the apps a test build includes now. */
  rebuildTestBuild: () =>
    apiClient<{ success: boolean; message: string; version: string }>(
      '/api/super-app-builds/test',
      { method: 'POST' },
    ),

  /** Super Admin: rebuild only the web preview (Backoffice preview and /preview/). */
  rebuildWebPreview: () =>
    apiClient<{ success: boolean; message: string }>('/api/super-app-builds/web', {
      method: 'POST',
    }),

  /** The web Super App build the backend is serving now. */
  getWebBuildInfo: () =>
    apiClient<{ available: boolean; build?: number; version?: string; commit?: string; builtAt?: string }>(
      '/api/superapp-web/-/info',
    ),

  getEcosystemStatus: () =>
    apiClient<any>('/api/super-app/ecosystem-status').then((res) =>
      res?.data && res?.superAppVersion === undefined ? res.data : res,
    ),

  getNextVersion: () =>
    apiClient<any>('/api/super-app/next-version').then((res) =>
      res?.data && res?.nextVersion === undefined ? res.data : res,
    ),

  verifyReleaseAssembly: (payload: any) =>
    apiClient<any>('/api/release-assembly/verify', {
      method: 'POST',
      body: payload,
    }).then((res) => (res?.data !== undefined ? res.data : res)),

  getStorageLicenseStatus: () =>
    apiClient<any>('/api/storage/license-status').then((res) =>
      res?.data !== undefined ? res.data : res,
    ),

  updateStorageLicense: (licenseKey: string) =>
    apiClient<any>('/api/storage/update-license', {
      method: 'POST',
      body: { licenseKey },
    }).then((res) => (res?.data !== undefined ? res.data : res)),

  getReleaseHistory: () =>
    apiClient<any>('/api/super-app/releases/history').then((res) =>
      res?.data && !Array.isArray(res) ? res.data : res,
    ),

  compareReleases: (base: string, target: string) =>
    apiClient<any>(
      `/api/super-app/releases/compare?base=${encodeURIComponent(base)}&target=${encodeURIComponent(target)}`,
    ).then((res) => (res?.data !== undefined ? res.data : res)),
};

