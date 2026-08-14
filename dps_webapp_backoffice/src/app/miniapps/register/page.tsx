"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

export default function RegisterMiniAppPage() {
  const [formData, setFormData] = useState<Partial<CreateMiniAppDto>>({
    name: '',
    appId: '',
    category: 'Insurance',
    shortDescription: '',
    fullDescription: '',
    logo: '',
    teamName: '',
    ownerName: '',
    ownerEmail: '',
    supportEmail: '',
    integrationMethod: IntegrationMethod.WEBVIEW,
    integrationConfigWebView: { productionUrl: '', stagingUrl: '' },
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    permissions: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string | string[], type: string }>({ text: '', type: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (formData.name) {
      const generatedId = `com.fsa.${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (formData.appId !== generatedId) {
        setFormData(prev => ({ ...prev, appId: generatedId }));
      }
    } else if (formData.appId !== '') {
      setFormData(prev => ({ ...prev, appId: '' }));
    }
  }, [formData.name]);

  const handleWebViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      integrationConfigWebView: { ...formData.integrationConfigWebView!, [e.target.name]: e.target.value }
    });
  };

  const handleFlutterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      integrationConfigFlutter: { ...formData.integrationConfigFlutter!, [e.target.name]: e.target.value }
    });
  };

  const togglePermission = (type: string) => {
    const exists = formData.permissions?.find(p => p.type === type);
    if (exists) {
      setFormData({ ...formData, permissions: formData.permissions?.filter(p => p.type !== type) });
    } else {
      setFormData({ ...formData, permissions: [...(formData.permissions || []), { type, purpose: '' }] });
    }
  };

  const handlePermissionPurposeChange = (type: string, purpose: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions?.map(p => p.type === type ? { ...p, purpose } : p)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    // Clean up unused config before submitting
    const payload = { ...formData };
    if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) delete payload.integrationConfigWebView;
    if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) delete payload.integrationConfigFlutter;

    try {
      const response = await fetch('http://localhost:3000/mini-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok) {
        setMessage({ text: 'Mini App successfully registered!', type: 'success' });
        // Reset form or redirect
      } else {
        setMessage({ text: resData.message || 'Failed to register mini app.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error connecting to backend.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
      <div className="mb-8 flex items-center space-x-4">
        <Link href="/miniapps" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm">
          <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Register Mini App</h2>
          <p className="text-slate-500 mt-1 text-sm">Deploy a new service to the Super App gateway</p>
        </div>
      </div>

      {message.text && message.text.length > 0 && (
        <div className={`p-4 mb-6 rounded-xl flex items-start space-x-3 border ${message.type === 'success' ? 'bg-brand-50 text-brand-800 border-brand-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          {message.type === 'success' ? (
            <svg className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <div className="flex-1">
            <span className="font-semibold text-sm block mb-1">
              {message.type === 'success' ? 'Success' : 'Please fix the following errors:'}
            </span>
            {Array.isArray(message.text) ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {message.text.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            ) : (
              <span className="font-medium text-sm">{message.text}</span>
            )}
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader title="General Information" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>App ID (Auto-generated)</Label>
              <Input readOnly className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed" name="appId" value={formData.appId} placeholder="com.fsa..." />
            </div>
            <div>
              <Label>App Name</Label>
              <Input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Insurance Portal" />
            </div>
            <div>
              <Label>Category</Label>
              <Select name="category" value={formData.category} onChange={handleChange}>
                <option>Insurance</option>
                <option>Banking</option>
                <option>Securities</option>
                <option>Payment</option>
              </Select>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input name="logo" value={formData.logo} onChange={handleChange} type="url" placeholder="https://..." />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label>Short Description</Label>
              <Input name="shortDescription" value={formData.shortDescription} onChange={handleChange} placeholder="One sentence summary" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Team Information" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Team Name</Label>
              <Input name="teamName" value={formData.teamName} onChange={handleChange} placeholder="e.g. Core Banking Team" />
            </div>
            <div>
              <Label>Owner Name</Label>
              <Input name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="John Doe" />
            </div>
            <div>
              <Label>Owner Email</Label>
              <Input required name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} type="email" placeholder="john.doe@fsa.gov" />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input name="supportEmail" value={formData.supportEmail} onChange={handleChange} type="email" placeholder="support@fsa.gov" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Integration Configuration" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <Label>Production URL</Label>
                <Input required name="productionUrl" value={formData.integrationConfigWebView?.productionUrl || ''} onChange={handleWebViewChange} type="url" placeholder="https://..." />
              </div>
              <div>
                <Label>Staging URL</Label>
                <Input name="stagingUrl" value={formData.integrationConfigWebView?.stagingUrl || ''} onChange={handleWebViewChange} type="url" placeholder="https://..." />
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
                    <Input required name="versionConstraint" value={formData.integrationConfigFlutter?.versionConstraint || ''} onChange={handleFlutterChange} placeholder="e.g. ^1.0.0" />
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
        </Card>

        <Card>
          <CardHeader title="Native Permissions" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} />
          <p className="text-sm text-slate-500 mb-5">Select the native device features this Mini App requires access to.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Camera', 'Location', 'Biometrics', 'Microphone'].map((type) => {
              const activePerm = formData.permissions?.find(p => p.type === type);
              const isActive = !!activePerm;
              
              return (
                <div key={type} className={`relative flex flex-col rounded-xl border p-4 shadow-sm transition-all ${isActive ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-brand-300'}`}>
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
                      </div>
                    </div>
                  </label>
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-500/20">
                      <Label className="text-xs mb-1">Purpose (Why is this needed?)</Label>
                      <Input 
                        required
                        value={activePerm.purpose}
                        onChange={(e) => handlePermissionPurposeChange(type, e.target.value)}
                        placeholder="e.g. To scan QR codes"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Register Mini App'}
          </Button>
        </div>
      </form>
    </div>
  );
}
