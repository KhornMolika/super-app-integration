import { apiClient } from './client';

export interface SdkArtifactUploadResponse {
  artifactUrl: string;
  filename: string;
  sha256: string;
  size: number;
  detectedPermissions: string[];
  minSdkVersion?: number;
  isSanitized: boolean;
}

export interface SdkArtifactStatusResponse {
  android?: {
    published: boolean;
    nexusUrl?: string;
    storagePath?: string;
    filename?: string;
  };
  ios?: {
    published: boolean;
    nexusUrl?: string;
    storagePath?: string;
    filename?: string;
  };
}

export const sdkArtifactsApi = {
  uploadIos: (miniAppId: string = 'draft', formData: FormData) =>
    apiClient<SdkArtifactUploadResponse>(`/api/sdk-artifacts/${miniAppId}/upload/ios`, {
      method: 'POST',
      body: formData,
    }),

  uploadAndroid: (miniAppId: string = 'draft', formData: FormData) =>
    apiClient<SdkArtifactUploadResponse>(`/api/sdk-artifacts/${miniAppId}/upload/android`, {
      method: 'POST',
      body: formData,
    }),

  publish: (miniAppId: string) =>
    apiClient<{ success: boolean; message: string }>(`/api/sdk-artifacts/${miniAppId}/publish`, {
      method: 'POST',
    }),

  getStatus: (miniAppId: string) =>
    apiClient<SdkArtifactStatusResponse>(`/api/sdk-artifacts/${miniAppId}/status`),
};
