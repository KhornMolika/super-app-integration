import { apiClient, PaginatedResponse } from './client';

export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const auditLogsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    resourceType?: string;
    actorId?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) =>
    apiClient<PaginatedResponse<AuditLog> | AuditLog[]>('/api/audit-logs', { params }),
};
