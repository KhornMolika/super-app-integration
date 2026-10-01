import { apiClient } from './client';

export interface ServiceHealthStatus {
  status: 'connected' | 'disconnected';
  responseTimeMs?: number;
  error?: string;
}

export interface BackendHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: ServiceHealthStatus;
    storage: ServiceHealthStatus;
  };
  memory: {
    heapUsedMB: number;
    rssMB: number;
  };
}

export const healthApi = {
  check: (): Promise<BackendHealthResponse> => {
    return apiClient<BackendHealthResponse>('/api/health');
  },
  liveness: (): Promise<{ status: string; uptime: number }> => {
    return apiClient<{ status: string; uptime: number }>('/api/health/liveness');
  },
};
