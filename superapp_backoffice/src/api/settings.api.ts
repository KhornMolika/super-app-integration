import { apiClient } from './client';

export interface ArtifactRetentionConfig {
  keepLatestNBuilds: number;
  deleteOlderThanDays: number;
  autoPruneEnabled: boolean;
  dryRun: boolean;
}

export interface PipelineTimingSettings {
  gitCloneMs: number;
  dependencyInstallMs: number;
  staticAnalysisMs: number;
  apkBuildMs: number;
  nexusUploadMs: number;
}

export const settingsApi = {
  getRetentionConfig: () =>
    apiClient<{ policy?: any; stats?: any; config?: ArtifactRetentionConfig; summary?: any }>('/api/settings/artifact-retention'),

  updateRetentionPolicy: (policy: any) =>
    apiClient<{ success: boolean; policy?: any; stats?: any; message?: string }>('/api/settings/artifact-retention', {
      method: 'PUT',
      body: policy,
    }),

  updateRetentionConfig: (config: ArtifactRetentionConfig) =>
    apiClient<{ success: boolean; config: ArtifactRetentionConfig }>('/api/settings/artifact-retention', {
      method: 'POST',
      body: config,
    }),

  runRetentionJob: (dryRun = false) =>
    apiClient<any>('/api/settings/artifact-retention/run', {
      method: 'POST',
      body: { dryRun },
    }),

  getPipelineTiming: () =>
    apiClient<PipelineTimingSettings>('/api/settings/pipeline-timing'),

  updatePipelineTiming: (timing: PipelineTimingSettings) =>
    apiClient<PipelineTimingSettings & { success?: boolean; message?: string }>('/api/settings/pipeline-timing', {
      method: 'PUT',
      body: timing,
    }),
};

