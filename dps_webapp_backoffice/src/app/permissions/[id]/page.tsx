"use client";
import { API_URL } from '@/lib/config';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { BackButton } from '@/components/ui/BackButton';
import { useRouter } from 'next/navigation';
import { Input, Label, Textarea, Button } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth';

export default function PermissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { can } = useAuth();
  
  const [permission, setPermission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metadataText, setMetadataText] = useState('');
  
  useEffect(() => {
    async function fetchPermission() {
      try {
        const res = await fetch(`${API_URL}/permissions/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          setPermission(data);
          setMetadataText(data.metadata ? JSON.stringify(data.metadata, null, 2) : '');
        }
      } catch (err) {
        console.error('Failed to fetch permission', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPermission();
  }, [resolvedParams.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('permission:manage')) return;
    
    setSaving(true);
    let parsedMetadata = null;
    if (metadataText.trim()) {
      try {
        parsedMetadata = JSON.parse(metadataText);
      } catch (e) {
        alert('Invalid JSON in metadata');
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/permissions/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: permission.name,
          description: permission.description,
          category: permission.category,
          isActive: permission.isActive,
          isDeprecated: permission.isDeprecated,
          introducedInVersion: permission.introducedInVersion,
          deprecatedInVersion: permission.deprecatedInVersion,
          minSuperAppVersion: permission.minSuperAppVersion,
          maxSuperAppVersion: permission.maxSuperAppVersion,
          metadata: parsedMetadata,
        }),
      });
      
      if (res.ok) {
        alert('Permission updated successfully!');
      } else {
        alert('Failed to update permission');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating permission');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500">Loading permission details...</p>
      </div>
    );
  }

  if (!permission) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-2xl font-bold text-slate-800">Permission not found</h2>
        <Link href="/permissions" className="text-brand-600 hover:underline mt-4">
          Back to Permissions Registry
        </Link>
      </div>
    );
  }

  return (
    <ProtectedRoute permission="permission:read">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out w-full mx-auto pb-12">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BackButton href="/permissions" />
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Manage Permission: {permission.key}</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">View or update standard capability definitions.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
              permission.isActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/50'
            }`}>
              {permission.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Permission Key</Label>
                <Input value={permission.key || ''} disabled className="bg-slate-50 dark:bg-slate-800/50" />
                <p className="text-xs text-slate-500 mt-1">Unique identifier used by apps (read-only).</p>
              </div>
              
              <div>
                <Label>Display Name</Label>
                <Input 
                  value={permission.name || ''} 
                  onChange={e => setPermission({...permission, name: e.target.value})} 
                  disabled={!can('permission:manage')}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea 
                  value={permission.description || ''} 
                  onChange={e => setPermission({...permission, description: e.target.value})}
                  rows={2}
                  disabled={!can('permission:manage')}
                />
              </div>
              
              <div>
                <Label>Category</Label>
                <Input 
                  value={permission.category || ''} 
                  onChange={e => setPermission({...permission, category: e.target.value})} 
                  disabled={!can('permission:manage')}
                />
              </div>
              
              <div className="flex items-center space-x-6 mt-6">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={permission.isActive || false}
                    onChange={e => setPermission({...permission, isActive: e.target.checked})}
                    disabled={!can('permission:manage')}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={permission.isDeprecated || false}
                    onChange={e => setPermission({...permission, isDeprecated: e.target.checked})}
                    disabled={!can('permission:manage')}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Deprecated</span>
                </label>
              </div>

              <div>
                <Label>Introduced In Version</Label>
                <Input 
                  value={permission.introducedInVersion || ''} 
                  onChange={e => setPermission({...permission, introducedInVersion: e.target.value})} 
                  disabled={!can('permission:manage')}
                />
              </div>
              
              <div>
                <Label>Deprecated In Version</Label>
                <Input 
                  value={permission.deprecatedInVersion || ''} 
                  onChange={e => setPermission({...permission, deprecatedInVersion: e.target.value})} 
                  disabled={!can('permission:manage')}
                />
              </div>
              
              <div>
                <Label>Min Super App Version</Label>
                <Input 
                  value={permission.minSuperAppVersion || ''} 
                  onChange={e => setPermission({...permission, minSuperAppVersion: e.target.value})} 
                  disabled={!can('permission:manage')}
                />
              </div>
              
              <div>
                <Label>Max Super App Version</Label>
                <Input 
                  value={permission.maxSuperAppVersion || ''} 
                  onChange={e => setPermission({...permission, maxSuperAppVersion: e.target.value})} 
                  disabled={!can('permission:manage')}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Metadata (JSON)</Label>
                <Textarea 
                  value={metadataText} 
                  onChange={e => setMetadataText(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder='{"iOSKey": "NSCameraUsageDescription"}'
                  disabled={!can('permission:manage')}
                />
              </div>

              <div>
                <Label>Created At</Label>
                <Input 
                  value={permission.createdAt ? new Date(permission.createdAt).toLocaleString() : '-'} 
                  disabled 
                  className="bg-slate-50 dark:bg-slate-800/50" 
                />
              </div>
              
              <div>
                <Label>Last Updated</Label>
                <Input 
                  value={permission.updatedAt ? new Date(permission.updatedAt).toLocaleString() : '-'} 
                  disabled 
                  className="bg-slate-50 dark:bg-slate-800/50" 
                />
              </div>
            </div>

            {can('permission:manage') && (
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-6">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
