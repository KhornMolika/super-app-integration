"use client";

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/inputs';

export default function SuperAppEcosystemPage() {
  const { can } = useAuth();
  return (
    <ProtectedRoute permission="super_app:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Super App Ecosystem</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage global settings, environments, and core features.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Global UI Settings</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Configure the default appearance and behavior of the Super App container.</p>
              {can('super_app:manage') && <Button>Configure UI</Button>}
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Environment Config</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Manage API gateways, authentication providers, and routing rules.</p>
              {can('super_app:manage') && <Button>Manage Environments</Button>}
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
