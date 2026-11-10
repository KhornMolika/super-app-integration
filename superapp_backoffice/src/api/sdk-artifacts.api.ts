import { apiClient, unwrapItem } from './client';

export interface SdkArtifactUploadResponse {
  minioUrl: string;
  minioKey: string;
  sha256: string;
  filename?: string;
  size?: number;
  detectedPermissions?: string[];
  minSdkVersion?: number;
  isSanitized?: boolean;
  artifactUrl?: string;
  scannedFields?: {
    iosModuleName?: string;
    iosTypeName?: string;
    iosVersion?: string;
    minIosVersion?: string;
    androidPackageName?: string;
    androidObjectName?: string;
    androidMavenGroupId?: string;
    androidMavenArtifactId?: string;
    androidMavenVersion?: string;
    minSdkVersion?: number;
    detectedPermissions?: string[];
  };
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

/** What the server reads from an SDK file before anything is stored. */
export interface SdkArtifactInspectResponse {
  scannedFields?: Record<string, any>;
  sha256: string;
  filename: string;
  size: number;
  detectedPermissions?: string[];
}

export const sdkArtifactsApi = {
  /** Scans an iOS SDK for the form; the file stays in the browser. */
  inspectIos: (formData: FormData) =>
    apiClient<SdkArtifactInspectResponse>('/api/sdk-artifacts/inspect/ios', {
      method: 'POST',
      body: formData,
    }).then((res) => unwrapItem<SdkArtifactInspectResponse>(res)),

  /** Scans an Android SDK for the form; the file stays in the browser. */
  inspectAndroid: (formData: FormData) =>
    apiClient<SdkArtifactInspectResponse>('/api/sdk-artifacts/inspect/android', {
      method: 'POST',
      body: formData,
    }).then((res) => unwrapItem<SdkArtifactInspectResponse>(res)),

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
