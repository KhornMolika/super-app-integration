"use client";
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function TeamForm({ formData, handleChange, allErrors = {} }: any) {
  return (
    <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Team Name</Label>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <Input name="teamName" value={formData.teamName} onChange={handleChange} placeholder="e.g. Core Banking Team" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Owner Name</Label>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <Input name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="John Doe" />
            </div>
            <div>
              <Label>Owner Email <span className="text-rose-500">*</span></Label>
              <Input 
                required 
                name="ownerEmail" 
                value={formData.ownerEmail} 
                onChange={handleChange} 
                type="email" 
                placeholder="john.doe@fsa.gov" 
                className={allErrors.ownerEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.ownerEmail && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.ownerEmail}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Support Email</Label>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <Input 
                name="supportEmail" 
                value={formData.supportEmail} 
                onChange={handleChange} 
                type="email" 
                placeholder="support@fsa.gov" 
                className={allErrors.supportEmail ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.supportEmail && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.supportEmail}</p>}
            </div>
          </div>
        
    </>
  );
}
