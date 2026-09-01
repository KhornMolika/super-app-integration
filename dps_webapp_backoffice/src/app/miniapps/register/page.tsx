"use client";
import { API_URL } from '@/lib/config';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { Input, Label, Select, Textarea, Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal, { SubmissionModalState } from '@/components/ui/SubmissionModal';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import TeamForm from '@/components/forms/TeamForm';
import IntegrationForm, { generateClientVerificationToken } from '@/components/forms/IntegrationForm';
import PermissionsForm from '@/components/forms/PermissionsForm';
import ValidationIssuesButton from '@/components/ValidationIssuesButton';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';


export default function RegisterMiniAppPage() {
  const router = useRouter();
  const { can } = useAuth();

  useEffect(() => {
    if (!can('miniapp:create')) {
      router.push('/miniapps');
    }
  }, [can, router]);
  const [formData, setFormData] = useState<Partial<CreateMiniAppDto>>({
    name: '',
    appId: '',
    category: 'Insurance',
    shortDescription: '',
    fullDescription: '',
    logo: '',
    termsUrl: '',
    privacyPolicyUrl: '',
    teamName: '',
    ownerName: '',
    ownerEmail: '',
    supportEmail: '',
    integrationMethod: IntegrationMethod.WEBVIEW,
    verificationToken: generateClientVerificationToken(),
    integrationConfigWebView: {
      productionUrl: '',
      verificationToken: generateClientVerificationToken(),
    },
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    integrationConfigDeepLink: { urlScheme: '', packageName: '', appStoreUrl: '' },
    permissions: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<SubmissionModalState>({ isOpen: false, status: 'loading' });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [customPermission, setCustomPermission] = useState('');

  const validateStep = async (currentStep: number) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.name || formData.name.trim().length < 2) {
        errors.name = 'App Name must be at least 2 characters';
        isValid = false;
      }
      if (!formData.appId) {
        errors.appId = 'App ID is required';
        isValid = false;
      } else if (!/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(formData.appId)) {
        errors.appId = 'App ID must be in reverse-domain format (e.g. com.company.app)';
        isValid = false;
      }
      if (!formData.logo || !formData.logo.trim()) {
        errors.logo = 'Logo is required';
        isValid = false;
      } else if (!formData.logo.startsWith('http') && !formData.logo.startsWith('data:image/') && !formData.logo.startsWith('/')) {
        errors.logo = 'Logo must be an uploaded image or valid URL';
        isValid = false;
      }
      if (formData.termsUrl && !formData.termsUrl.startsWith('http')) {
        errors.termsUrl = 'Terms & Conditions URL must be a valid URL (e.g. https://...)';
        isValid = false;
      }
      if (formData.privacyPolicyUrl && !formData.privacyPolicyUrl.startsWith('http')) {
        errors.privacyPolicyUrl = 'Privacy Policy URL must be a valid URL (e.g. https://...)';
        isValid = false;
      }
    }

    if (currentStep === 2) {
      if (!formData.ownerEmail) {
        errors.ownerEmail = 'Owner Email is required';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
        errors.ownerEmail = 'Owner Email must be a valid email';
        isValid = false;
      }
      if (formData.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
        errors.supportEmail = 'Support Email must be a valid email';
        isValid = false;
      }
    }

    if (currentStep === 3) {
      if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
        const prodUrl = formData.integrationConfigWebView?.productionUrl;
        if (!prodUrl) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL is required';
          isValid = false;
        } else {
          const isDev =
            process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' ||
            process.env.NODE_ENV !== 'production' ||
            (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

          if (!isDev && !prodUrl.startsWith('https://')) {
            errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS in production';
            isValid = false;
          }

          if (isValid) {
            try {
              const res = await fetch(`${API_URL}/mini-apps/check-url?url=${encodeURIComponent(prodUrl)}`);
              const data = await res.json();
              if (!data.reachable) {
                errors['integrationConfigWebView.productionUrl'] = 'Production URL is not reachable';
                isValid = false;
              }
            } catch (e) {
              errors['integrationConfigWebView.productionUrl'] = 'Error checking URL reachability';
              isValid = false;
            }
          }
        }
      }
      if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
        const conf = formData.integrationConfigDeepLink;
        if (!conf?.urlScheme || conf.urlScheme.trim() === '') {
          errors['integrationConfigDeepLink.urlScheme'] = 'URL Scheme is required (e.g. trustregulator:// or myapp://open)';
          isValid = false;
        }
      }

      if (formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE) {
        const conf = formData.integrationConfigFlutter;
        if (conf?.sourceType === SourceType.ARTIFACT) {
          if (!conf.packageName) {
            errors['integrationConfigFlutter.packageName'] = 'Package Name is required';
            isValid = false;
          } else if (isValid) {
            try {
              const res = await fetch(`/api/integrations/nexus/packages/${encodeURIComponent(conf.packageName)}`);
              const data = await res.json();
              if (data && data.exists === false) {
                errors['integrationConfigFlutter.packageName'] = `Package "${conf.packageName}" does not exist on Nexus. Please save as Draft or publish the package to Nexus before submitting for review.`;
                isValid = false;
              }
            } catch (e) {
              // non-blocking if offline
            }
          }
          if (!conf.versionConstraint) {
            errors['integrationConfigFlutter.versionConstraint'] = 'Version Constraint is required';
            isValid = false;
          }
        } else {
          if (!conf?.gitUrl) {
            errors['integrationConfigFlutter.gitUrl'] = 'Git URL is required';
            isValid = false;
          } else if (isValid) {
            try {
              const res = await fetch('/api/integrations/git/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: conf.gitUrl,
                  ref: conf.gitBranch,
                  token: conf.gitAccessToken,
                  path: conf.gitPath,
                }),
              });
              const data = await res.json();
              if (data && data.validation) {
                if (!data.validation.isValid) {
                  errors['integrationConfigFlutter.gitUrl'] =
                    data.validation.error || 'Git repository or pubspec.yaml could not be verified.';
                  isValid = false;
                } else {
                  // Auto-detect required native permissions from dependencies
                  const deps = data.validation.dependencies || {};
                  const detectedPerms = [...(formData.permissions || [])];
                  const pluginMap: Record<string, string> = {
                    nfc_manager: 'NFC',
                    camera: 'CAMERA',
                    geolocator: 'LOCATION',
                    location: 'LOCATION',
                    local_auth: 'BIOMETRICS',
                    image_picker: 'PHOTO_LIBRARY',
                    file_picker: 'STORAGE',
                    contacts_service: 'CONTACTS',
                  };

                  let added = false;
                  Object.keys(deps).forEach((dep) => {
                    const permType = pluginMap[dep];
                    if (permType && !detectedPerms.some((p) => p.type === permType)) {
                      detectedPerms.push({
                        type: permType,
                        purpose: `Required for ${dep} platform capability`,
                        termsUrl: 'https://privacy.example.com',
                      });
                      added = true;
                    }
                  });

                  if (added) {
                    setFormData((prev: any) => ({ ...prev, permissions: detectedPerms }));
                  }
                }
              }
            } catch (e) {
              // non-blocking if offline
            }
          }
        }
      }
    }

    if (currentStep === 4) {
      if (formData.permissions && formData.permissions.length > 0) {
        formData.permissions.forEach((p) => {
          if (!p.purpose || p.purpose.trim() === '') {
            errors[`permission_${p.type}_purpose`] = 'Purpose is required';
            isValid = false;
          }
        });
      }
    }

    if (!isValid) {
      setLocalErrors(prev => ({ ...prev, ...errors }));
    } else {
      // Clear errors for this step
      setLocalErrors(prev => {
        const next = { ...prev };
        Object.keys(errors).forEach(k => delete next[k]);
        return next;
      });
    }

    return isValid;
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    const payload = { ...formData };
    if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) delete payload.integrationConfigWebView;
    if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) delete payload.integrationConfigFlutter;

    try {
      const response = await fetch(`${API_URL}/mini-apps/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        router.push('/miniapps');
      } else {
        setIsSubmitting(false);
      }
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    setIsSubmitting(true);
    const valid = await validateStep(step);
    setIsSubmitting(false);
    if (valid) setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleDomainVerified = (data: any) => {
    setFormData(prev => ({
      ...prev,
      isDomainVerified: true,
      domainVerifiedAt: data.domainVerifiedAt || new Date().toISOString(),
      verificationToken: data.verificationToken || prev.verificationToken,
      integrationConfigWebView: {
        productionUrl: prev.integrationConfigWebView?.productionUrl || '',
        ...prev.integrationConfigWebView,
        verificationToken: data.verificationToken || prev.integrationConfigWebView?.verificationToken,
        allowedDomains: data.allowedDomains && Array.isArray(data.allowedDomains)
          ? data.allowedDomains.join(', ')
          : (prev.integrationConfigWebView?.allowedDomains || ''),
      },
    }));
    setLocalErrors(prev => {
      const next = { ...prev };
      delete next['integrationConfigWebView.domainVerification'];
      return next;
    });
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
      if (!prodUrl.startsWith('https://')) {
        if (prodUrl.startsWith('http://localhost') || prodUrl.startsWith('http://127.0.0.1')) {
          // Let localhost pass the HTTPS check on frontend. Backend will verify if it's reachable.
        } else {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
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
        } catch (e) { }
      }, 600);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.appId, formData.name, formData.ownerEmail, formData.supportEmail, formData.logo]);

  const handleNavigateToIssue = (field: string) => {
    if (field === 'name' || field === 'appId' || field === 'category' || field === 'logo') setStep(1);
    else if (field === 'teamName' || field === 'ownerName' || field === 'ownerEmail' || field === 'supportEmail') setStep(2);
    else if (field.startsWith('integration')) setStep(3);
    else if (field.startsWith('permission')) setStep(4);
  };
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

  const handleDeepLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      integrationConfigDeepLink: { ...formData.integrationConfigDeepLink!, [e.target.name]: e.target.value } as any
    });
  };

  const togglePermission = (type: string) => {
    const exists = formData.permissions?.find(p => p.type === type);
    if (exists) {
      setFormData({ ...formData, permissions: formData.permissions?.filter(p => p.type !== type) });
    } else {
      setFormData({ ...formData, permissions: [...(formData.permissions || []), { type, purpose: '', termsUrl: '' }] });
    }
  };

  const handlePermissionFieldChange = (type: string, field: string, value: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions?.map(p => p.type === type ? { ...p, [field]: value } : p)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Add validation before submit
    const valid = await validateStep(4);
    if (!valid) {
      setIsSubmitting(false);
      return;
    }

    setModalState(prev => ({ isOpen: true, status: 'loading', createdId: prev.createdId }));

    const payload = { ...formData };
    if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) {
      delete payload.integrationConfigWebView;
    } else if (payload.integrationConfigWebView) {
      const webConfig = { ...payload.integrationConfigWebView };
      if (typeof webConfig.allowedDomains === 'string') {
        webConfig.allowedDomains = (webConfig.allowedDomains as any)
          .split(',')
          .map((d: string) => d.trim())
          .filter(Boolean);
      }
      payload.integrationConfigWebView = webConfig;
    }
    if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) delete payload.integrationConfigFlutter;
    if (payload.integrationMethod !== IntegrationMethod.DEEP_LINK) delete payload.integrationConfigDeepLink;

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
              if (appData.validationStages) {
                setModalState(prev => ({
                  ...prev,
                  stages: appData.validationStages
                }));
              }

              const statusUpper = (appData.status || '').toUpperCase();
              const valStatusUpper = (appData.validationStatus || '').toUpperCase();

              // Still running Jenkins security scans
              if (statusUpper === 'PROCESSING' || valStatusUpper === 'RUNNING') {
                return;
              }

              // Finished scanning
              const hasErrors = valStatusUpper === 'FAILED' || (appData.validationErrors && Object.keys(appData.validationErrors).length > 0) || (appData.issues && appData.issues.length > 0);
              if (hasErrors) {
                clearInterval(pollTimer);
                const displayErrors: Record<string, string> = { ...(appData.validationErrors || {}) };

                // 1. Findings from validationReport
                if (appData.validationReport?.findings?.length > 0) {
                  appData.validationReport.findings.forEach((finding: any) => {
                    const key = finding.title || finding.id || 'Security Finding';
                    displayErrors[key] = `${finding.description}${finding.recommendation ? ' (Remediation: ' + finding.recommendation + ')' : ''}`;
                  });
                }

                // 2. Issues from database
                if (Array.isArray(appData.issues) && appData.issues.length > 0) {
                  appData.issues.forEach((iss: any, idx: number) => {
                    const key = iss.title || iss.classification || `Security Finding #${idx + 1}`;
                    if (!Object.values(displayErrors).some(val => val.includes(iss.description))) {
                      displayErrors[key] = iss.description;
                    }
                  });
                }

                // 3. Failed stages from pipeline execution (e.g. TLS failed)
                if (appData.validationStages) {
                  Object.values(appData.validationStages).forEach((st: any) => {
                    if (st.status === 'FAILED') {
                      const stageName = st.name || st.id || 'Validation Stage';
                      if (!displayErrors[stageName]) {
                        displayErrors[stageName] = st.details || 'Failed automated security check.';
                      }
                    }
                  });
                }

                // 4. Default fallback if somehow still empty
                if (Object.keys(displayErrors).length === 0) {
                  displayErrors['Security Validation'] = 'Automated security scan failed on this endpoint. Please verify your URLs and TLS configuration.';
                }

                setModalState({
                  isOpen: true,
                  status: 'error',
                  message: 'Automated security validation failed. Please address the issues below.',
                  errors: displayErrors,
                  createdId: appId
                });
                setIsSubmitting(false);
              } else {
                clearInterval(pollTimer);
                setModalState({ isOpen: true, status: 'success' });
                setTimeout(() => router.push(`/miniapps/${appId}`), 1200);
              }
            }
          } catch (pollErr) {
          }
          if (attempts > 500) {
            clearInterval(pollTimer);
            setModalState({ isOpen: true, status: 'error', message: 'Validation timed out.', createdId: appId });
            setIsSubmitting(false);
          }
        }, 600);
      } else {
        let errorsObj: Record<string, string> | undefined = undefined;
        if (Array.isArray(resData.message)) {
          errorsObj = {};
          const errs = errorsObj as Record<string, string>;
          resData.message.forEach((msg: string) => {
            const field = msg.split(' ')[0];
            errs[field] = msg;
          });
        }
        setModalState({
          isOpen: true,
          status: 'error',
          message: Array.isArray(resData.message) ? undefined : resData.message || 'Failed to register mini app.',
          errors: errorsObj
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      setModalState({ isOpen: true, status: 'error', message: 'Error connecting to backend.' });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
        <div className="mb-8 flex items-center space-x-4">
          <Link href="/miniapps" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm">
            <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Register Mini App</h2>
            <p className="text-slate-500 mt-1 text-sm">Deploy a new service to the Super App gateway</p>
          </div>
        </div>



        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-brand-600 text-white' : step > s ? 'bg-brand-200 text-brand-800' : 'bg-slate-200 text-slate-500'}`}>
                  {s}
                </div>
                <span className="text-xs mt-2 text-slate-500 hidden sm:block">
                  {s === 1 ? 'Basic Info' : s === 2 ? 'Team' : s === 3 ? 'Integration' : s === 4 ? 'Permissions' : 'Review'}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
          </div>
        </div>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (step === 5) handleSubmit(e); }}>
          {step === 1 && <Card>
            <CardHeader title="General Information" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <BasicInfoForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
          </Card>}

          {step === 2 && <Card>
            <CardHeader title="Team & Support" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
            <TeamForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
          </Card>}

          {step === 3 && <Card>
            <CardHeader title="Technical Integration" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
            <IntegrationForm
              formData={formData}
              handleChange={handleChange}
              allErrors={allErrors}
              handleWebViewChange={handleWebViewChange}
              handleFlutterChange={handleFlutterChange}
              handleDeepLinkChange={handleDeepLinkChange}
              onDomainVerified={handleDomainVerified}
            />
          </Card>}

          {step === 4 && <Card>
            <CardHeader title="Native Permissions" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>} />
            <PermissionsForm
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
              allErrors={allErrors}
              togglePermission={togglePermission}
              handlePermissionFieldChange={handlePermissionFieldChange}
              customPermission={customPermission}
              setCustomPermission={setCustomPermission}
            />
          </Card>}

          {step === 5 && <Card>
            <CardHeader title="Review Registration" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <div className="space-y-6 p-6 text-sm">

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white border-b pb-2 mb-3">1. Basic Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-slate-500">App Name:</span> <br />{formData.name || '-'}</div>
                  <div><span className="text-slate-500">App ID:</span> <br /><span className="font-mono text-xs">{formData.appId || '-'}</span></div>
                  <div><span className="text-slate-500">Category:</span> <br />{formData.category || '-'}</div>
                  <div><span className="text-slate-500">Logo:</span> <br />{formData.logo ? <span className="text-brand-600 truncate block w-full">{formData.logo}</span> : '-'}</div>
                  {formData.shortDescription && (
                    <div className="col-span-2"><span className="text-slate-500">Short Description:</span> <br />{formData.shortDescription}</div>
                  )}
                  {formData.fullDescription && (
                    <div className="col-span-2"><span className="text-slate-500">Full Description:</span> <br />{formData.fullDescription}</div>
                  )}
                  {formData.termsUrl && (
                    <div className="col-span-2"><span className="text-slate-500">Terms & Conditions:</span> <br />{formData.termsUrl}</div>
                  )}
                  {formData.privacyPolicyUrl && (
                    <div className="col-span-2"><span className="text-slate-500">Privacy Policy:</span> <br />{formData.privacyPolicyUrl}</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white border-b pb-2 mb-3">2. Team</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-slate-500">Team Name:</span> <br />{formData.teamName || '-'}</div>
                  <div><span className="text-slate-500">Owner Name:</span> <br />{formData.ownerName || '-'}</div>
                  <div><span className="text-slate-500">Owner Email:</span> <br />{formData.ownerEmail || '-'}</div>
                  <div><span className="text-slate-500">Support Email:</span> <br />{formData.supportEmail || '-'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white border-b pb-2 mb-3">3. Integration</h4>
                <div className="mb-2"><span className="text-slate-500">Method:</span> {formData.integrationMethod}</div>
                {formData.integrationMethod === 'WEBVIEW' && (
                  <div><span className="text-slate-500">Production URL:</span> {formData.integrationConfigWebView?.productionUrl || '-'}</div>
                )}
                {formData.integrationMethod === 'DEEP_LINK' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-slate-500">URL Scheme:</span> <br /><span className="font-mono">{formData.integrationConfigDeepLink?.urlScheme || '-'}</span></div>
                    <div><span className="text-slate-500">Package Name:</span> <br /><span className="font-mono">{formData.integrationConfigDeepLink?.packageName || '-'}</span></div>
                    <div className="col-span-2"><span className="text-slate-500">Store Fallback URL:</span> <br />{formData.integrationConfigDeepLink?.appStoreUrl || '-'}</div>
                  </div>
                )}
                {formData.integrationMethod === 'FLUTTER_PACKAGE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-slate-500">Source Type:</span> <br />{formData.integrationConfigFlutter?.sourceType}</div>
                    {formData.integrationConfigFlutter?.sourceType === 'ARTIFACT' ? (
                      <>
                        <div><span className="text-slate-500">Package Name:</span> <br />{formData.integrationConfigFlutter?.packageName || '-'}</div>
                        <div><span className="text-slate-500">Version:</span> <br />{formData.integrationConfigFlutter?.versionConstraint || '-'}</div>
                      </>
                    ) : (
                      <>
                        <div><span className="text-slate-500">Git URL:</span> <br />{formData.integrationConfigFlutter?.gitUrl || '-'}</div>
                        <div><span className="text-slate-500">Branch:</span> <br />{formData.integrationConfigFlutter?.gitBranch || '-'}</div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white border-b pb-2 mb-3">4. Permissions</h4>
                {formData.permissions && formData.permissions.length > 0 ? (
                  <ul className="space-y-2">
                    {formData.permissions.map((p, i) => (
                      <li key={i} className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <strong>{p.type}</strong>
                        <div className="text-slate-500 mt-1">Purpose: {p.purpose || '-'}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">No special permissions requested.</span>
                )}
              </div>

              <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl border border-brand-100 dark:border-brand-800 text-brand-700 dark:text-brand-300">
                Please verify all the details above. Clicking register will create your Mini App and submit it for validation.
              </div>
            </div>
          </Card>}

          <div className="flex justify-between space-x-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <Button type="button" variant="outline" onClick={step === 1 ? () => router.push('/miniapps') : prevStep}>
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 5 ? (
              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>Save as Draft</Button>
                <Button type="button" onClick={nextStep} disabled={isSubmitting}>Next Step</Button>
              </div>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Register Mini App'}
              </Button>
            )}
          </div>
        </form>

        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          url={previewUrl}
          title={formData.name}
          isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
        />
      </div>

      <SubmissionModal
        state={modalState}
        mode="register"
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onFixLater={async () => {
          setModalState(prev => ({ ...prev, status: 'loading' }));
          const payload = { ...formData };
          if (payload.integrationMethod !== 'WEBVIEW') delete payload.integrationConfigWebView;
          if (payload.integrationMethod !== 'FLUTTER_PACKAGE') delete payload.integrationConfigFlutter;

          try {
            const url = `${API_URL}/mini-apps/draft`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (response.ok) {
              setModalState({ isOpen: false, status: 'success' });
              router.push('/miniapps');
            } else {
              setModalState(prev => ({ ...prev, status: 'error', message: 'Failed to save draft' }));
            }
          } catch (e) {
            setModalState(prev => ({ ...prev, status: 'error', message: 'Network error' }));
          }
        }}
        onRunInBackground={() => {
          setModalState({ ...modalState, isOpen: false });
          router.push('/miniapps');
        }}
        onSuccessContinue={() => { }}
      />

      {/* Floating Error Summary Button */}
      {!modalState.isOpen && hasErrors && (
        <ValidationIssuesButton errors={allErrors} onNavigate={handleNavigateToIssue} />
      )}
    </>
  );
}
