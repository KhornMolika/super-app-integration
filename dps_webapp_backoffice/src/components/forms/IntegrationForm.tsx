"use client";
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function IntegrationForm({ formData, handleChange, allErrors = {}, handleWebViewChange, handleFlutterChange }: any) {
  return (
    <>
          <div className="mb-6">
            <Label>Integration Method</Label>
            <Select name="integrationMethod" value={formData.integrationMethod} onChange={handleChange}>
              <option value={IntegrationMethod.WEBVIEW}>WebView (Web App)</option>
              <option value={IntegrationMethod.FLUTTER_PACKAGE}>Flutter Package</option>
              <option value={IntegrationMethod.NATIVE_SDK} disabled>Native SDK (Coming Soon)</option>
              <option value={IntegrationMethod.DEEP_LINK} disabled>Deep Link (Coming Soon)</option>
            </Select>
          </div>

          {formData.integrationMethod === IntegrationMethod.WEBVIEW && (
            <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <Label>Production URL</Label>
                    <Input 
                      name="productionUrl" 
                      value={formData.integrationConfigWebView?.productionUrl || ''} 
                      onChange={handleWebViewChange} 
                      type="url" 
                      placeholder="https://..." 
                      className={allErrors['integrationConfigWebView.productionUrl'] ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
                    />
                    {allErrors['integrationConfigWebView.productionUrl'] && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors['integrationConfigWebView.productionUrl']}</p>}
                  </div>
            </div>
          )}

          {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <Label>Source Type</Label>
                <Select name="sourceType" value={formData.integrationConfigFlutter?.sourceType} onChange={handleFlutterChange}>
                  <option value={SourceType.ARTIFACT}>Compiled Artifact (Private Pub)</option>
                  <option value={SourceType.GIT}>Git Repository (Source Code)</option>
                </Select>
              </div>

              {formData.integrationConfigFlutter?.sourceType === SourceType.ARTIFACT ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Package Name</Label>
                    <Input required name="packageName" value={formData.integrationConfigFlutter?.packageName || ''} onChange={handleFlutterChange} placeholder="e.g. dps_banking_miniapp" />
                  </div>
                  <div>
                    <Label>Version Constraint</Label>
                    <Input 
                      name="versionConstraint" 
                      value={formData.integrationConfigFlutter?.versionConstraint || ''} 
                      onChange={handleFlutterChange} 
                      placeholder="e.g. ^1.0.0" 
                      className={allErrors['integrationConfigFlutter.versionConstraint'] ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
                    />
                    {allErrors['integrationConfigFlutter.versionConstraint'] && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors['integrationConfigFlutter.versionConstraint']}</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <Label>Git URL</Label>
                    <Input required name="gitUrl" value={formData.integrationConfigFlutter?.gitUrl || ''} onChange={handleFlutterChange} placeholder="https://github.com/..." />
                  </div>
                  <div>
                    <Label>Git Branch</Label>
                    <Input required name="gitBranch" value={formData.integrationConfigFlutter?.gitBranch || ''} onChange={handleFlutterChange} placeholder="e.g. main" />
                  </div>
                  <div>
                    <Label>Access Token (Optional)</Label>
                    <Input name="gitAccessToken" type="password" value={formData.integrationConfigFlutter?.gitAccessToken || ''} onChange={handleFlutterChange} placeholder="ghp_..." />
                  </div>
                </div>
              )}
            </div>
          )}
        
    </>
  );
}
