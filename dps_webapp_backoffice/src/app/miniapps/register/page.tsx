"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal, { SubmissionModalState } from '@/components/ui/SubmissionModal';
import ValidationIssuesButton from '@/components/ValidationIssuesButton';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function RegisterMiniAppPage() {
  const router = useRouter();
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
  const [modalState, setModalState] = useState<SubmissionModalState>({ isOpen: false, status: 'loading' });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const errors: Record<string, string> = {};
    if (formData.appId && !/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(formData.appId)) {
      errors.appId = 'App ID must be in reverse-domain format (e.g. com.company.app)';
    }
    if (formData.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Owner Email must be a valid email';
    }
    if (formData.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      errors.supportEmail = 'Support Email must be a valid email';
    }
    if (formData.name && formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (formData.integrationMethod === IntegrationMethod.WEBVIEW && formData.integrationConfigWebView?.productionUrl) {
      const prodUrl = formData.integrationConfigWebView.productionUrl;
      const allowLocal = process.env.NEXT_PUBLIC_ALLOW_LOCAL_PROD_URLS === 'true';
      if (!allowLocal) {
        if (!prodUrl.startsWith('https://')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
        } else if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost.';
        }
      }
    }
    
    setLocalErrors(errors);

    if (formData.appId || formData.name) {
      const timeoutId = setTimeout(async () => {
        try {
          const params = new URLSearchParams();
          if (formData.appId && !errors.appId) params.append('appId', formData.appId);
          if (formData.name && !errors.name) params.append('name', formData.name);
          
          if (params.toString()) {
            const res = await fetch(`${API_URL}/mini-apps/check-exists?${params.toString()}`);
            if (res.ok) {
              const data = await res.json();
              setLocalErrors(prev => {
                const newErrors = { ...prev };
                if (data.appIdExists) newErrors.appId = 'This App ID is already taken.';
                if (data.nameExists) newErrors.name = 'This App Name is already taken.';
                return newErrors;
              });
            }
          }
        } catch (e) {}
      }, 600);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.appId, formData.name, formData.ownerEmail, formData.supportEmail, formData.logo]);

  const allErrors = { ...localErrors, ...(modalState.errors || {}) };
  const hasErrors = Object.keys(allErrors).length > 0;
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
    setModalState(prev => ({ isOpen: true, status: 'loading', createdId: prev.createdId }));

    const payload = { ...formData };
    if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) delete payload.integrationConfigWebView;
    if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) delete payload.integrationConfigFlutter;

    try {
      const url = modalState.createdId ? `${API_URL}/mini-apps/${modalState.createdId}` : `${API_URL}/mini-apps`;
      const method = modalState.createdId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok) {
        const appId = modalState.createdId || resData.id;
        let attempts = 0;
        
        const pollTimer = setInterval(async () => {
          attempts++;
          try {
            const pollRes = await fetch(`${API_URL}/mini-apps/${appId}`);
            if (pollRes.ok) {
              const appData = await pollRes.json();
              if (appData.status === 'Draft' || appData.status === 'Published') {
                clearInterval(pollTimer);
                setModalState({ isOpen: true, status: 'success' });
                setTimeout(() => router.push(`/miniapps/${appId}`), 1500);
              } else if (appData.status === 'Issues') {
                clearInterval(pollTimer);
                setModalState({ 
                  isOpen: true, 
                  status: 'error', 
                  message: 'Validation failed.', 
                  errors: appData.validationErrors || {},
                  createdId: appId
                });
                setIsSubmitting(false);
              }
            }
          } catch (pollErr) {
          }
          if (attempts > 30) {
            clearInterval(pollTimer);
            setModalState({ isOpen: true, status: 'error', message: 'Validation timed out.', createdId: appId });
            setIsSubmitting(false);
          }
        }, 1000);
      } else {
        setModalState({ isOpen: true, status: 'error', message: resData.message || 'Failed to register mini app.' });
        setIsSubmitting(false);
      }
    } catch (error) {
      setModalState({ isOpen: true, status: 'error', message: 'Error connecting to backend.' });
      setIsSubmitting(false);
    }
  };

  return (
    <>
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


      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader title="General Information" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
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
              <Label>Support Email</Label>
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
                    <Label>Staging URL</Label>
                    <Input 
                      name="stagingUrl" 
                      value={formData.integrationConfigWebView?.stagingUrl || ''} 
                      onChange={handleWebViewChange} 
                      type="url" 
                      placeholder="https://staging..." 
                      className={allErrors['integrationConfigWebView.stagingUrl'] ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
                    />
                    {allErrors['integrationConfigWebView.stagingUrl'] && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors['integrationConfigWebView.stagingUrl']}</p>}
                  </div>
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
        </Card>

        <Card>
          <CardHeader title="Native Permissions" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} />
          <p className="text-sm text-slate-500 mb-5">Select the native device features this Mini App requires access to.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Camera', 'Location', 'Biometrics', 'Microphone'].map((type) => {
              const activePerm = formData.permissions?.find(p => p.type === type);
              const isActive = !!activePerm;
              
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

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        url={previewUrl}
        title={formData.name}
      />
      </div>

      <SubmissionModal
        state={modalState}
        mode="register"
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onFixLater={() => {
          setModalState({ ...modalState, isOpen: false });
          router.push('/miniapps');
        }}
        onRunInBackground={() => {
          setModalState({ ...modalState, isOpen: false });
          router.push('/miniapps');
        }}
        onSuccessContinue={() => {}}
      />

      {/* Floating Error Summary Button */}
      {!modalState.isOpen && hasErrors && (
        <ValidationIssuesButton errors={allErrors} />
      )}
    </>
  );
}
