"use client";
import { Input, Label, Select, Textarea } from '@/components/ui/inputs';
import { LogoUploadInput } from '@/components/ui/LogoUploadInput';
import { LockIcon } from '@/components/ui/Icons';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function BasicInfoForm({ formData, handleChange, allErrors = {}, isEditable = true }: any) {
  return (
    <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Mini App Name <span className="text-rose-500">*</span></Label>
              <Input 
                required 
                disabled={!isEditable}
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="e.g. Core Banking App" 
                className={allErrors.name ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.name && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.name}</p>}
            </div>
            <div>
              <Label>Mini App ID (Auto-generated) <span className="text-rose-500">*</span></Label>
              <div className="relative flex items-center">
                <Input 
                  disabled
                  readOnly 
                  name="appId" 
                  value={formData.appId || ''} 
                  placeholder="miniapp_core_banking_8f32a1" 
                  className={`font-mono text-base !bg-slate-200/70 dark:!bg-slate-800/90 !border-slate-300/80 dark:!border-slate-700 !text-slate-500 dark:!text-slate-400 placeholder:!text-slate-400 dark:placeholder:!text-slate-500 cursor-not-allowed select-all pr-10 ${allErrors.appId ? '!border-rose-500 ring-1 ring-rose-500 bg-rose-50/50' : ''}`}
                />
                <div className="absolute right-3.5 pointer-events-none flex items-center text-slate-400 dark:text-slate-500">
                  <LockIcon className="w-4 h-4" />
                </div>
              </div>
              {allErrors.appId && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.appId}</p>}
            </div>
            <div>
              <Label>Category <span className="text-rose-500">*</span></Label>
              <Select name="category" value={formData.category} onChange={handleChange}>
                <option>Banking</option>
                <option>Insurance</option>
                <option>Lifestyle</option>
                <option>Shopping</option>
              </Select>
            </div>
            <div>
              <LogoUploadInput
                value={formData.logo || ''}
                onChange={(logoVal) => handleChange({ target: { name: 'logo', value: logoVal } })}
                error={allErrors.logo}
                required={true}
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label>Short Description</Label>
                <span className="text-xs text-slate-400 font-medium">Optional</span>
              </div>
              <Input name="shortDescription" value={formData.shortDescription || ''} onChange={handleChange} placeholder="One sentence summary" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label>Full Description</Label>
                <span className="text-xs text-slate-400 font-medium">Optional</span>
              </div>
              <Textarea
                name="fullDescription"
                rows={3}
                value={formData.fullDescription || ''}
                onChange={handleChange}
                placeholder="Comprehensive details regarding the purpose and functionality..."
                className={allErrors.fullDescription ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.fullDescription && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.fullDescription}</p>}
            </div>
          </div>
    </>
  );
}
