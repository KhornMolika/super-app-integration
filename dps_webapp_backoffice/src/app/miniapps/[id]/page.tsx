"use client";
import { API_URL } from '@/lib/config';

import Link from 'next/link';
import { BackButton } from '@/components/ui/BackButton';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { useAuth } from '@/lib/auth';
import { Input, Label, Select, Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal, { SubmissionModalState } from '@/components/ui/SubmissionModal';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import TeamForm from '@/components/forms/TeamForm';
import IntegrationForm from '@/components/forms/IntegrationForm';
import PermissionsForm from '@/components/forms/PermissionsForm';
import ValidationIssuesButton from '@/components/ValidationIssuesButton';
import ActivityTab from '@/components/ui/ActivityTab';
import SecurityGateCard from '@/components/security/SecurityGateCard';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';



export default function ManageMiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [formData, setFormData] = useState<Partial<CreateMiniAppDto & { status: string, validationErrors?: Record<string, string> }>>({
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
    integrationConfigWebView: { productionUrl: ''},
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    permissions: [],
    status: 'DRAFT',
    validationErrors: undefined as Record<string, string> | undefined,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<SubmissionModalState>({ isOpen: false, status: 'loading' });
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  
  const confirm = useConfirm();
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'permissions' | 'integration' | 'security' | 'activity' | 'validation'>('overview');
  const [customPermission, setCustomPermission] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  

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
          if (id) params.append('excludeId', id as string);
          
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
  }, [formData.appId, formData.name, formData.ownerEmail, formData.supportEmail, formData.logo, id]);

    const handleNavigateToIssue = (field: string) => {
    if (field.startsWith('permission')) setActiveTab('permissions');
    else if (field.startsWith('integration')) setActiveTab('integration');
    else if (['teamName', 'ownerName', 'ownerEmail', 'supportEmail'].includes(field)) setActiveTab('team');
    else setActiveTab('overview');
  };

  const allErrors = { ...localErrors, ...(formData.validationErrors || {}) };
  const hasErrors = Object.keys(allErrors).length > 0;
  const [isEditingUnlocked, setIsEditingUnlocked] = useState(false);
  const isEditable = can('miniapp:update') && (formData.status === 'DRAFT' || formData.status === 'REJECTED' || isEditingUnlocked);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['overview', 'team', 'permissions', 'integration', 'activity', 'validation'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`${API_URL}/mini-apps/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            ...data,
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
            integrationConfigWebView: data.integrationMethod === IntegrationMethod.WEBVIEW ? data.integrationConfig : { productionUrl: ''},
            integrationConfigFlutter: data.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ? data.integrationConfig : { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
            integrationConfigDeepLink: data.integrationMethod === IntegrationMethod.DEEP_LINK ? data.integrationConfig : { urlScheme: '', packageName: '', appStoreUrl: '' },
          });
        } else {
          setModalState({ isOpen: true, status: 'error', message: 'Failed to fetch mini app details.' });
        }
      } catch (error) {
        setModalState({ isOpen: true, status: 'error', message: 'Error connecting to backend.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchApp();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const fieldName = e.target.name;
    setFormData(prev => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[fieldName];
      }
      return {
        ...prev,
        [fieldName]: e.target.value,
        validationErrors: nextValidationErrors
      };
    });
  };

  const handleWebViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name;
    setFormData(prev => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigWebView.${fieldName}`];
      }
      return {
        ...prev,
        integrationConfigWebView: { ...prev.integrationConfigWebView!, [fieldName]: e.target.value },
        validationErrors: nextValidationErrors
      };
    });
  };

  const handleFlutterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const fieldName = e.target.name;
    setFormData(prev => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigFlutter.${fieldName}`];
      }
      return {
        ...prev,
        integrationConfigFlutter: { ...prev.integrationConfigFlutter!, [fieldName]: e.target.value },
        validationErrors: nextValidationErrors
      };
    });
  };

  const handleDeepLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const fieldName = e.target.name;
    setFormData(prev => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigDeepLink.${fieldName}`];
      }
      return {
        ...prev,
        integrationConfigDeepLink: { ...prev.integrationConfigDeepLink!, [fieldName]: e.target.value } as any,
        validationErrors: nextValidationErrors
      };
    });
  };

  const togglePermission = (type: string) => {
    const exists = formData.permissions?.find(p => p.type === type);
    setFormData(prev => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        Object.keys(nextValidationErrors).forEach(key => {
          if (key.toLowerCase().includes(type.toLowerCase()) || key.startsWith('permissions.')) {
            delete nextValidationErrors[key];
          }
        });
      }

      let updatedPermissions;
      if (exists) {
        updatedPermissions = prev.permissions?.filter(p => p.type !== type);
      } else {
        updatedPermissions = [...(prev.permissions || []), { type, purpose: '', termsUrl: '' }];
      }

      return {
        ...prev,
        permissions: updatedPermissions,
        validationErrors: nextValidationErrors
      };
    });
  };

  const handlePermissionFieldChange = (type: string, field: string, value: string) => {
    setFormData(prev => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        // Clear any validation errors related to this permission field
        Object.keys(nextValidationErrors).forEach(key => {
          const errVal = nextValidationErrors[key];
          if (
            key.includes(type) || 
            (key.includes(field) && (key.startsWith('permissions.') || key.startsWith('permission_') || key.startsWith('permissionRequests.'))) ||
            (typeof errVal === 'string' && errVal.toLowerCase().includes(type.toLowerCase()))
          ) {
            delete nextValidationErrors[key];
          }
        });
      }

      return {
        ...prev,
        permissions: prev.permissions?.map(p => p.type === type ? { ...p, [field]: value } : p),
        validationErrors: nextValidationErrors
      };
    });
  };

  const handleSave = async (e: React.FormEvent, isDraftOnly = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    setModalState({ isOpen: true, status: 'loading' });

    // Deduplicate permissions by type to prevent any duplicate arrays
    const cleanPermissions = Array.from(
      new Map((formData.permissions || []).map((p: any) => [p.type, p])).values()
    );

    const payload: any = {
      name: formData.name,
      appId: formData.appId,
      category: formData.category,
      shortDescription: formData.shortDescription,
      fullDescription: formData.fullDescription,
      logo: formData.logo,
      teamName: formData.teamName,
      ownerName: formData.ownerName,
      ownerEmail: formData.ownerEmail,
      supportEmail: formData.supportEmail,
      integrationMethod: formData.integrationMethod,
      permissions: cleanPermissions
    };

    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      payload.integrationConfigWebView = formData.integrationConfigWebView;
    } else if (formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE) {
      payload.integrationConfigFlutter = formData.integrationConfigFlutter;
    } else if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
      payload.integrationConfigDeepLink = formData.integrationConfigDeepLink;
    }

    try {
      const response = await fetch(`${API_URL}/mini-apps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json().catch(() => ({}));

      if (response.ok) {
        if (isDraftOnly) {
          setModalState({ isOpen: true, status: 'success', message: 'Draft saved successfully.' });
          setIsSubmitting(false);
          return;
        }

        let attempts = 0;
        
        const pollTimer = setInterval(async () => {
          attempts++;
          try {
            const pollRes = await fetch(`${API_URL}/mini-apps/${id}`);
            if (pollRes.ok) {
              const appData = await pollRes.json();
              setFormData(prev => ({
                ...appData,
                permissions: Array.isArray(appData.permissions) ? appData.permissions : prev.permissions,
                integrationConfigWebView: appData.integrationMethod === IntegrationMethod.WEBVIEW ? appData.integrationConfig : prev.integrationConfigWebView,
                integrationConfigFlutter: appData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ? appData.integrationConfig : prev.integrationConfigFlutter,
                integrationConfigDeepLink: appData.integrationMethod === IntegrationMethod.DEEP_LINK ? appData.integrationConfig : prev.integrationConfigDeepLink,
              }));

              const statusUpper = (appData.status || '').toUpperCase();
              if (statusUpper !== 'PROCESSING') {
                const hasErrors = appData.validationErrors && Object.keys(appData.validationErrors).length > 0;
                if (hasErrors) {
                  clearInterval(pollTimer);
                  setModalState({ 
                    isOpen: true, 
                    status: 'error', 
                    message: 'Validation failed.', 
                    errors: appData.validationErrors || {} 
                  });
                  setIsSubmitting(false);
                } else {
                  clearInterval(pollTimer);
                  setModalState({ isOpen: true, status: 'success', message: 'Saved and submitted for review successfully!' });
                  setIsSubmitting(false);
                }
              }
            }
          } catch (pollErr) {
          }
          if (attempts > 30) {
            clearInterval(pollTimer);
            setModalState({ isOpen: true, status: 'error', message: 'Validation timed out.' });
            setIsSubmitting(false);
          }
        }, 1000);
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
          message: Array.isArray(resData.message) ? undefined : resData.message || 'Failed to save changes.',
          errors: errorsObj
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      setModalState({ isOpen: true, status: 'error', message: 'Error connecting to backend.' });
      setIsSubmitting(false);
    }
  };

  
  const handleLifecycleAction = async (action: 'submit' | 'approve' | 'reject' | 'suspend', explicitReason?: string) => {
    let reason = explicitReason || '';
    if (action === 'reject' && !explicitReason) {
      const response = prompt('Please enter a reason for rejection:');
      if (response === null) return;
      reason = response;
    } else if (!explicitReason) {
      const isConfirmed = await confirm({
        title: `Confirm ${action}`,
        message: `Are you sure you want to ${action} this Mini App?`,
        confirmText: `Yes, ${action}`,
        cancelText: 'Cancel'
      });
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/mini-apps/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        setModalState({ isOpen: true, status: 'success', message: `Mini App successfully ${action}ed!` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errorData = await res.json().catch(() => null);
        setModalState({ isOpen: true, status: 'error', message: errorData?.message || `Failed to ${action} Mini App.` });
      }
    } catch (err) {
      setModalState({ isOpen: true, status: 'error', message: 'Network error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: 'Delete Mini App',
      message: 'Are you sure you want to delete this mini app? This action cannot be undone.',
      confirmText: 'Delete App',
      confirmVariant: 'danger'
    });
    
    if (!isConfirmed) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/mini-apps/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/miniapps');
      } else {
        setModalState({ isOpen: true, status: 'error', message: 'Failed to delete mini app.' });
        setIsSubmitting(false);
      }
    } catch (error) {
      setModalState({ isOpen: true, status: 'error', message: 'Error connecting to backend.' });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-32 space-y-4">
        <svg className="animate-spin h-10 w-10 text-brand-600 dark:text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="text-slate-500 dark:text-slate-400 font-medium">Loading app configuration...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
        {/* Top Header Card */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <BackButton href="/miniapps" />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {formData.name || 'Manage Mini App'}
                </h2>
                {/* Status Pill Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    formData.status === 'APPROVED' || formData.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : formData.status === 'PENDING_REVIEW'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : formData.status === 'REJECTED' || formData.status === 'SUSPENDED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      formData.status === 'APPROVED' || formData.status === 'ACTIVE'
                        ? 'bg-emerald-500'
                        : formData.status === 'PENDING_REVIEW'
                        ? 'bg-amber-500 animate-pulse'
                        : formData.status === 'REJECTED' || formData.status === 'SUSPENDED'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{formData.status || 'DRAFT'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-slate-600 dark:text-slate-300">{formData.appId || 'com.app'}</span>
                <span>•</span>
                <span>{formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ? 'Flutter Package' : 'WebView'}</span>
                {formData.category && (
                  <>
                    <span>•</span>
                    <span>{formData.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Preview Button */}
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
                  setPreviewUrl(formData.integrationConfigWebView?.productionUrl || '');
                } else {
                  const conf = formData.integrationConfigFlutter;
                  const target = conf?.sourceType === SourceType.GIT 
                    ? conf.gitUrl || ''
                    : `http://localhost:8081/repository/pub-group/api/packages/${conf?.packageName || 'dps_core_package'}`;
                  setPreviewUrl(target);
                }
                setShowPreview(true);
              }}
              className="h-9 px-3.5 text-xs font-medium border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <svg className="w-3.5 h-3.5 mr-1.5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Preview</span>
            </Button>

            {/* Edit Configuration Toggle */}
            {can('miniapp:update') && (
              <Button
                type="button"
                variant={isEditingUnlocked ? 'primary' : 'outline'}
                onClick={() => setIsEditingUnlocked(!isEditingUnlocked)}
                className={`h-9 px-3.5 text-xs font-medium transition-all ${
                  isEditingUnlocked
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isEditingUnlocked ? (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Finish Editing</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Configuration</span>
                  </>
                )}
              </Button>
            )}

          {/* More Actions Dropdown (...) */}
          {(can('miniapp:approve') || can('miniapp:suspend') || can('miniapp:delete')) && (
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm focus:ring-2 focus:ring-brand-500/20"
                aria-label="More actions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {can('miniapp:approve') && formData.status === 'PENDING_REVIEW' && (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleLifecycleAction('approve');
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        <span>Approve App</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleLifecycleAction('reject');
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        <span>Reject App</span>
                      </button>
                    </div>
                  )}

                  {can('miniapp:suspend') && (formData.status === 'APPROVED' || formData.status === 'ACTIVE') && (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleLifecycleAction('suspend');
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left px-4 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Suspend App</span>
                      </button>
                    </div>
                  )}

                  {can('miniapp:delete') && (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleDelete();
                        }}
                        disabled={isSubmitting}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <span>Delete App</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-700 mb-6 px-2 overflow-x-auto">
        {['overview', 'team', 'permissions', 'integration', 'security', 'validation', 'activity'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {tab === 'security' ? 'Security Gates (1 & 2)' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-t-full" />}
          </button>
        ))}
      </div>
      <form className="space-y-6" onSubmit={handleSave}>
      <fieldset disabled={!isEditable}>
        {activeTab === 'overview' && (
        <Card>
          <CardHeader title="General Information" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>App ID</Label>
              <Input readOnly className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed" name="appId" value={formData.appId || ''} placeholder="com.fsa..." />
            </div>
            <div>
              <Label>App Name</Label>
              <Input 
                required 
                name="name" 
                value={formData.name || ''} 
                onChange={handleChange} 
                placeholder="e.g. Insurance Portal" 
                className={allErrors.name ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
              />
              {allErrors.name && <p className="mt-1.5 text-xs text-rose-600 font-medium">{allErrors.name}</p>}
            </div>
            <div>
              <Label>Category</Label>
              <Select name="category" value={formData.category || 'Banking'} onChange={handleChange}>
                <option>Banking</option>
                <option>Insurance</option>
                <option>Lifestyle</option>
                <option>Shopping</option>
              </Select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <Label>Short Description</Label>
              <Input name="shortDescription" value={formData.shortDescription || ''} onChange={handleChange} placeholder="Brief summary of the app..." />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <Label>Full Description</Label>
              <textarea 
                name="fullDescription" 
                rows={3} 
                value={formData.fullDescription || ''} 
                onChange={handleChange} 
                placeholder="Comprehensive details regarding the purpose and functionality..." 
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </Card>
        )}

        {activeTab === 'team' && <Card>
          <CardHeader title="Developer & Contact Info" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
          <TeamForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
        </Card>}

        {activeTab === 'integration' && <Card>
          <CardHeader title="Technical Integration" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
          <IntegrationForm 
            formData={formData} 
            handleChange={handleChange} 
            allErrors={allErrors} 
            handleWebViewChange={handleWebViewChange} 
            handleFlutterChange={handleFlutterChange}
            handleDeepLinkChange={handleDeepLinkChange}
          />
        </Card>}

        {activeTab === 'security' && (
          <SecurityGateCard miniApp={formData} />
        )}

        {activeTab === 'validation' && (
          <div className="space-y-6">
            <SecurityGateCard miniApp={formData} />
            <Card>
              <CardHeader title="Validation Issues Log" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <p className="text-sm text-slate-500 mb-5">Granular pass/fail status of all platform validation rules.</p>
              
              <div className="space-y-4">
                {(formData as any).issues?.length > 0 ? (
                  (formData as any).issues.map((issue: any, index: number) => (
                    <div key={index} className="flex items-start p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-500/10 dark:border-rose-500/20">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mr-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{issue.classification || 'MINI_APP_ISSUE'} ({issue.severity || 'HIGH'})</h4>
                        <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">{issue.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">All Platform Checks Passed</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">This Mini App has passed all automated security and platform validation checks.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
        
        {activeTab === 'permissions' && <Card>
          <CardHeader title="Native Permissions" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>} />
          <PermissionsForm 
            formData={formData} 
            handleChange={handleChange} 
            allErrors={allErrors} 
            togglePermission={togglePermission}
            handlePermissionFieldChange={handlePermissionFieldChange}
            customPermission={customPermission}
            setCustomPermission={setCustomPermission}
          />
        </Card>}

        {activeTab === 'activity' && (
          <Card>
            <CardHeader title="Activity Timeline" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <p className="text-sm text-slate-500 mb-8">Timeline of all events related to this Mini App.</p>
            <ActivityTab miniAppId={id as string} />
          </Card>
        )}

        </fieldset>
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/miniapps" className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </Link>
          {isEditable && (
            <>
              <Button 
                type="button" 
                variant="outline"
                disabled={isSubmitting}
                onClick={(e) => handleSave(e as any, true)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 !shadow-none"
              >
                Save as Draft
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Save & Submit'}
              </Button>
            </>
          )}
        </div>
      </form>

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        url={previewUrl}
        title={formData.name || ''}
        isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
      />
      </div>

      <SubmissionModal
        state={modalState}
        mode="manage"
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onRunInBackground={() => {
          setModalState({ ...modalState, isOpen: false });
          router.push('/miniapps');
        }}
        onFixLater={() => {
          setModalState({ ...modalState, isOpen: false });
          router.push('/miniapps');
        }}
        onSuccessContinue={() => setModalState({ ...modalState, isOpen: false })}
      />

      {/* Floating Error Summary Button */}
      {!modalState.isOpen && hasErrors && (
        <ValidationIssuesButton errors={allErrors} onNavigate={handleNavigateToIssue} />
      )}
    </>
  );
}
