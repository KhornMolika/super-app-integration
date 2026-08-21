"use client";
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function BasicInfoForm({ formData, handleChange, allErrors = {} }: any) {
  return (
    <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>App Name</Label>
              <Input 
                required 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="e.g. Core Banking App" 
                className={allErrors.name ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.name && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.name}</p>}
            </div>
            <div>
              <Label>App ID (Auto-generated)</Label>
              <Input 
                readOnly 
                name="appId" 
                value={formData.appId} 
                placeholder="com.fsa.banking" 
                className={`font-mono text-sm bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed ${allErrors.appId ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}`}
              />
              {allErrors.appId && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.appId}</p>}
            </div>
            <div>
              <Label>Category</Label>
              <Select name="category" value={formData.category} onChange={handleChange}>
                <option>Banking</option>
                <option>Insurance</option>
                <option>Lifestyle</option>
                <option>Shopping</option>
              </Select>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input 
                required 
                name="logo" 
                value={formData.logo} 
                onChange={handleChange} 
                type="url" 
                placeholder="https://..." 
                className={allErrors.logo ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.logo && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.logo}</p>}
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label>Short Description</Label>
              <Input name="shortDescription" value={formData.shortDescription} onChange={handleChange} placeholder="One sentence summary" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label>Terms & Privacy Policy URL <span className="text-rose-500">*</span></Label>
              <Input 
                required 
                name="termsUrl" 
                value={formData.termsUrl || ''} 
                onChange={handleChange} 
                type="url" 
                placeholder="https://example.com/privacy-policy" 
                className={allErrors.termsUrl ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.termsUrl && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.termsUrl}</p>}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                The public privacy policy or terms of service URL for this Mini Application.
              </p>
            </div>
          </div>


        
    </>
  );
}
