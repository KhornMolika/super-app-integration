"use client";
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { useAuth } from '@/lib/auth';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function PermissionsForm({ formData, handleChange, allErrors = {}, togglePermission, handlePermissionFieldChange, customPermission, setCustomPermission }: any) {
  const { hasRole } = useAuth();
  const activePermissions = formData.permissions?.map((p: any) => p.type) || [];

  const getPermError = (type: string, field: string) => {
    // Check direct key
    if (allErrors[`permission_${type}_${field}`]) return allErrors[`permission_${type}_${field}`];
    if (allErrors[`permissionRequests.${type}.${field}`]) return allErrors[`permissionRequests.${type}.${field}`];
    
    // Check indexed keys matching the current formData.permissions array
    const idx = (formData.permissions || []).findIndex((p: any) => p.type === type);
    if (idx !== -1) {
      if (allErrors[`permissions.${idx}.${field}`]) return allErrors[`permissions.${idx}.${field}`];
      if (allErrors[`permissionRequests.${idx}.${field}`]) return allErrors[`permissionRequests.${idx}.${field}`];
    }

    return undefined;
  };

  return (
    <>
          <p className="text-sm text-slate-500 mb-5">Select the native device features this Mini App requires access to.</p>
          
          <div className="grid grid-cols-1 gap-4">
            {Array.from(new Set(['Camera', 'Location', 'Biometrics', 'Microphone', ...(formData.permissions?.map((p: any) => p.type) || [])])).map((type) => {
              const activePerm = formData.permissions?.find((p: any) => p.type === type);
              const isActive = !!activePerm;
              const purposeError = getPermError(type, 'purpose');
              const termsError = getPermError(type, 'termsUrl');
              
              return (
                <div key={type} className={`relative flex flex-col rounded-xl border p-4 shadow-sm transition-all ${isActive ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md'}`}>
                  <label className="flex items-start cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={() => togglePermission(type)}
                          className="w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-600" 
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{type}</span>
                        {!['Camera', 'Location', 'Biometrics', 'Microphone'].includes(type) && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                            Proposal
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-500/20 space-y-3">
                      <div>
                        <Label className="text-xs mb-1">Purpose (Why is this needed?)</Label>
                        <Input 
                          required
                          value={activePerm.purpose || ''}
                          name={`permission_${type}_purpose`}
                          onChange={(e) => handlePermissionFieldChange(type, 'purpose', e.target.value)}
                          placeholder="e.g. To scan QR codes"
                          className={`h-9 text-sm ${purposeError ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}`}
                        />
                        {purposeError && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium">{purposeError}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs mb-1">Terms/Policy URL</Label>
                        <Input 
                          required
                          type="url"
                          value={activePerm.termsUrl || ''}
                          name={`permission_${type}_termsUrl`}
                          onChange={(e) => handlePermissionFieldChange(type, 'termsUrl', e.target.value)}
                          placeholder="https://..."
                          className={`h-9 text-sm ${termsError ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}`}
                        />
                        {termsError && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium">{termsError}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          
          <div className="mt-8 border-t border-slate-200 dark:border-slate-700/50 pt-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Request New Permission</h3>
            <p className="text-xs text-slate-500 mb-4">If your Mini App requires a capability not listed above, request it here. This will generate a Permission Proposal for the Super App team to review.</p>
            <div className="flex space-x-3">
              <Input 
                value={customPermission} 
                onChange={e => setCustomPermission(e.target.value)} 
                placeholder="e.g. Bluetooth, NFC, Contacts"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (customPermission && !formData.permissions?.find((p: any) => p.type === customPermission)) {
                      togglePermission(customPermission);
                      setCustomPermission('');
                    }
                  }
                }}
              />
              <Button type="button" onClick={() => {
                if (customPermission && !formData.permissions?.find((p: any) => p.type === customPermission)) {
                  togglePermission(customPermission);
                  setCustomPermission('');
                }
              }}>Add Request</Button>
            </div>
          </div>
        
    </>
  );
}
