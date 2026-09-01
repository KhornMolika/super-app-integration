"use client";
import { API_URL } from '@/lib/config';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/inputs';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';



type PermissionItem = {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  status?: string;
};

export default function PermissionsPage() {
  const { can } = useAuth();
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch(`${API_URL}/permissions`);
        if (res.ok) {
          const data = await res.json();
          setPermissions(data);
        }
      } catch (err) {
        console.error('Failed to fetch permissions', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPermissions();
  }, []);

  return (
    <ProtectedRoute permission="permission:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Permissions Registry</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage standard permissions available for Mini Apps.</p>
          </div>
          {can('permission:manage') && <Button>+ New Permission</Button>}
        </div>

        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="w-[25%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Name / ID</th>
                  <th className="w-[35%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Description</th>
                  <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Platform</th>
                  <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</th>
                  <th className="w-[10%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading permissions...</td>
                  </tr>
                ) : permissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No permissions registered.</td>
                  </tr>
                ) : (
                  permissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{perm.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{perm.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 px-2.5 py-1 rounded-md text-xs font-medium">
                          {perm.platform || 'Native'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          perm.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/50'
                        }`}>
                          {perm.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
    <Link href={`/permissions/${perm.id}`} className="text-brand-600 dark:text-brand-400 hover:underline font-medium text-sm">
      {can('permission:manage') ? 'Manage' : 'View'}
    </Link>
  </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
