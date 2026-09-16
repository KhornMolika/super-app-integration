import { apiClient } from './client';

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
  getAll: () =>
    apiClient<AuditLog[]>('/api/audit-logs'),
};
