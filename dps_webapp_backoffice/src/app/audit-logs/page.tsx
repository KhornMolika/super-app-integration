"use client";

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';

export default function AuditLogsPage() {
  return (
    <ProtectedRoute permission="audit_log:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Audit Logs</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">System-wide activity and security events.</p>
          </div>
        </div>
        <Card>
          <div className="p-6 text-center text-slate-500">
            Audit logs module is currently under construction.
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
