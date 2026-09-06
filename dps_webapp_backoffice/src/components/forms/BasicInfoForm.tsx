"use client";
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { ValidatedUrlInput } from '@/components/ui/ValidatedUrlInput';
import { LogoUploadInput } from '@/components/ui/LogoUploadInput';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function BasicInfoForm({ formData, handleChange, allErrors = {} }: any) {
  return (
    <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Mini App Name <span className="text-rose-500">*</span></Label>
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
              <Label>Mini App ID (Auto-generated) <span className="text-rose-500">*</span></Label>
              <Input 
                readOnly 
                name="appId" 
                value={formData.appId || ''} 
                placeholder="miniapp_core_banking" 
                className={`font-mono text-sm bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed ${allErrors.appId ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}`}
              />
              {allErrors.appId && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.appId}</p>}
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
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <Input name="shortDescription" value={formData.shortDescription || ''} onChange={handleChange} placeholder="One sentence summary" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label>Full Description</Label>
                <span className="text-[11px] text-slate-400 font-medium">Optional</span>
              </div>
              <Textarea
                name="fullDescription"
                rows={3}
                value={formData.fullDescription || ''}
                onChange={handleChange}
                placeholder="Comprehensive details regarding the purpose and functionality..."
                className={allErrors.fullDescription ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.fullDescription && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.fullDescription}</p>}
            </div>
            {/* Legal Information */}
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Legal Information</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure official terms of service and privacy disclosures for this Mini Application.
                </p>
              </div>

              <div className="space-y-6">
                {/* Terms of Service Section */}
                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Terms of Service
                    </h5>
                    <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                  </div>
                  
                  <ValidatedUrlInput
                    name="termsUrl"
                    label="Terms of Service URL"
                    value={formData.termsUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/terms"
                    helperText="Public terms of service URL for this Mini Application."
                    optional={true}
                    externalError={allErrors.termsUrl}
                  />

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label>Terms of Service Description</Label>
                      <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <Textarea
                      name="termsDescription"
                      rows={2}
                      value={formData.termsDescription || ''}
                      onChange={handleChange}
                      placeholder="Brief overview or key terms governing the usage of this Mini Application..."
                      className={allErrors.termsDescription ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
                    />
                    <p className="mt-1 text-xs text-slate-500">Summary or key provisions of the Terms of Service.</p>
                    {allErrors.termsDescription && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.termsDescription}</p>}
                  </div>
                </div>

                {/* Privacy Policy Section */}
                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Privacy Policy
                    </h5>
                    <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                  </div>

                  <ValidatedUrlInput
                    name="privacyPolicyUrl"
                    label="Privacy Policy URL"
                    value={formData.privacyPolicyUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/privacy-policy"
                    helperText="Public privacy policy URL describing data handling."
                    optional={true}
                    externalError={allErrors.privacyPolicyUrl}
                  />

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label>Privacy Policy Description</Label>
                      <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <Textarea
                      name="privacyPolicyDescription"
                      rows={2}
                      value={formData.privacyPolicyDescription || ''}
                      onChange={handleChange}
                      placeholder="Summary of user data collection, storage, processing, and privacy protections..."
                      className={allErrors.privacyPolicyDescription ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
                    />
                    <p className="mt-1 text-xs text-slate-500">Summary or disclosures regarding data privacy and security.</p>
                    {allErrors.privacyPolicyDescription && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.privacyPolicyDescription}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>


        
    </>
  );
}
