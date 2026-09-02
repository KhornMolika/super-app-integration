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
import ValidationReportTab from '@/components/ui/ValidationReportTab';
import { ValidatedUrlInput } from '@/components/ui/ValidatedUrlInput';
import { LogoUploadInput } from '@/components/ui/LogoUploadInput';
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
    termsUrl: '',
    privacyPolicyUrl: '',
    teamName: '',
    ownerName: '',
    ownerEmail: '',
    supportEmail: '',
    integrationMethod: IntegrationMethod.WEBVIEW,
    integrationConfigWebView: { productionUrl: '' },
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    integrationConfigDeepLink: { urlScheme: '', packageName: '', appStoreUrl: '' },
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
  const { can, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'integration' | 'permissions' | 'report' | 'activity'>('overview');
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
      const isDev =
        process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV' ||
        process.env.NODE_ENV !== 'production' ||
        (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

      if (!isDev) {
        if (!prodUrl.startsWith('https://')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
        } else if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost in production.';
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
        } catch (e) { }
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

  const openSandboxPreview = () => {
    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      setPreviewUrl(formData.integrationConfigWebView?.productionUrl || '');
    } else if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
      setPreviewUrl(formData.integrationConfigDeepLink?.urlScheme || (formData as any).integrationConfig?.urlScheme || 'app://open');
    } else {
      const conf = formData.integrationConfigFlutter;
      const target = conf?.sourceType === SourceType.GIT
        ? conf.gitUrl || ''
        : `http://localhost:8081/repository/pub-group/api/packages/${conf?.packageName || 'dps_core_package'}`;
      setPreviewUrl(target);
    }
    setShowPreview(true);
  };

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
            integrationConfigWebView: data.integrationMethod === IntegrationMethod.WEBVIEW ? {
              ...data.integrationConfig,
              allowedDomains: Array.isArray(data.integrationConfig?.allowedDomains)
                ? data.integrationConfig.allowedDomains.join(', ')
                : (data.integrationConfig?.allowedDomains || ''),
            } : { productionUrl: '', allowedDomains: '', stagingUrl: '' },
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

  const handleDomainVerified = (data: any) => {
    setFormData(prev => {
      const nextErrors = prev.validationErrors ? { ...prev.validationErrors } : {};
      delete nextErrors['integrationConfigWebView.domainVerification'];
      return {
        ...prev,
        isDomainVerified: true,
        domainVerifiedAt: data.domainVerifiedAt || new Date().toISOString(),
        integrationConfigWebView: {
          productionUrl: prev.integrationConfigWebView?.productionUrl || '',
          ...prev.integrationConfigWebView,
          allowedDomains: data.allowedDomains && Array.isArray(data.allowedDomains)
            ? data.allowedDomains.join(', ')
            : (prev.integrationConfigWebView?.allowedDomains || ''),
        },
        validationErrors: nextErrors,
      };
    });
    setLocalErrors(prev => {
      const next = { ...prev };
      delete next['integrationConfigWebView.domainVerification'];
      return next;
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
      termsUrl: formData.termsUrl,
      privacyPolicyUrl: formData.privacyPolicyUrl,
      teamName: formData.teamName,
      ownerName: formData.ownerName,
      ownerEmail: formData.ownerEmail,
      supportEmail: formData.supportEmail,
      integrationMethod: formData.integrationMethod,
      permissions: cleanPermissions
    };

    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      const webConfig = { ...formData.integrationConfigWebView };
      if (typeof webConfig.allowedDomains === 'string') {
        webConfig.allowedDomains = (webConfig.allowedDomains as any)
          .split(',')
          .map((d: string) => d.trim())
          .filter(Boolean);
      }
      payload.integrationConfigWebView = webConfig;
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


  const handleLifecycleAction = async (action: 'submit' | 'approve' | 'reject' | 'request-changes' | 'start-testing' | 'activate' | 'suspend', explicitReason?: string) => {
    let reason = explicitReason || '';
    if (action === 'reject' && !explicitReason) {
      const response = prompt('Please enter a reason for rejection:');
      if (response === null) return;
      reason = response;
    } else if (action === 'request-changes' && !explicitReason) {
      const response = prompt('Please specify the changes or fixes required:');
      if (response === null) return;
      reason = response;
    } else if (!explicitReason) {
      const actionLabel = action === 'start-testing' ? 'move to testing' : action === 'activate' ? 'activate' : action;
      const isConfirmed = await confirm({
        title: `Confirm ${actionLabel}`,
        message: `Are you sure you want to ${actionLabel} this Mini App?`,
        confirmText: `Yes, proceed`,
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
        setModalState({ isOpen: true, status: 'success', message: `Mini App status successfully updated!` });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const errorData = await res.json().catch(() => null);
        setModalState({ isOpen: true, status: 'error', message: errorData?.message || `Failed to execute ${action}.` });
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
      <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${formData.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : formData.status === 'APPROVED'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
                      : formData.status === 'IN_REVIEW'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        : formData.status === 'TESTING' || formData.status === 'BUILDING'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                          : formData.status === 'REJECTED' || formData.status === 'SUSPENDED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${formData.status === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : formData.status === 'APPROVED'
                        ? 'bg-teal-500'
                        : formData.status === 'IN_REVIEW'
                          ? 'bg-blue-500 animate-pulse'
                          : formData.status === 'TESTING' || formData.status === 'BUILDING'
                            ? 'bg-purple-500 animate-pulse'
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
                <span>
                  {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE
                    ? 'Flutter Package'
                    : formData.integrationMethod === IntegrationMethod.DEEP_LINK
                    ? 'Deep Link'
                    : 'WebView'}
                </span>
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
            {/* Sandbox Preview & Download APK in Header:
                - Always shown when NOT in TESTING mode for everyone
                - In TESTING mode: ONLY displayed in header for MINI_APP_MANAGER (since SA Admin, Admin, and Developer have the dedicated Manual Sandbox Testing Phase banner below) */}
            {(formData.status !== 'TESTING' || role === 'MINI_APP_MANAGER') && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openSandboxPreview}
                  className="h-9 px-3.5 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm"
                  title="Launch Super App Sandbox Preview"
                >
                  <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span>Sandbox Preview</span>
                </Button>

                <a
                  href="http://localhost:8081/repository/apk-releases/superapp/v1.1.0/app-debug.apk"
                  download="superapp-debug.apk"
                  className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
                  title="Download Super App Test Build APK (Nexus)"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>Download Test APK</span>
                </a>
              </>
            )}

            {/* Edit Configuration Toggle */}
            {can('miniapp:update') && (
              <Button
                type="button"
                variant={isEditingUnlocked ? 'primary' : 'outline'}
                onClick={() => setIsEditingUnlocked(!isEditingUnlocked)}
                className={`h-9 px-3.5 text-xs font-medium transition-all ${isEditingUnlocked
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
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800/60">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          openSandboxPreview();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        <span>Super App Sandbox</span>
                      </button>
                      <a
                        href="http://localhost:8081/repository/apk-releases/superapp/v1.1.0/app-debug.apk"
                        download="superapp-debug.apk"
                        onClick={() => setShowActionsMenu(false)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2.5 font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span>Download Test APK</span>
                      </a>
                    </div>
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

        {/* SA Admin Review & Action Banner for IN_REVIEW */}
        {can('miniapp:approve') && formData.status === 'IN_REVIEW' && (
          <div className="mb-6 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                  SA Admin Review Required
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Automated security validation has <strong>PASSED</strong>. Review the integration configuration, permissions, and report below, then Approve or Request Changes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                type="button"
                onClick={() => handleLifecycleAction('approve')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Approve Mini App</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleLifecycleAction('request-changes')}
                disabled={isSubmitting}
                className="border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-xs px-3 py-2 font-medium"
              >
                Request Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleLifecycleAction('reject')}
                disabled={isSubmitting}
                className="border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-xs px-3 py-2 font-medium"
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* SA Admin Banner for APPROVED */}
        {can('miniapp:approve') && formData.status === 'APPROVED' && (
          <div className="mb-6 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/80 dark:bg-teal-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-200 dark:border-teal-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-teal-900 dark:text-teal-200">
                  Mini App Approved — Ready for Testing
                </h4>
                <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                  Integration review approved by SA Admin. Proceed to manual testing in the Super App sandbox, or activate directly.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                type="button"
                onClick={() => handleLifecycleAction('start-testing')}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3.5 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                <span>Move to Testing Phase</span>
              </Button>
              <Button
                type="button"
                onClick={() => handleLifecycleAction('activate')}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 font-semibold shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Activate Live</span>
              </Button>
            </div>
          </div>
        )}

        {/* Manual Sandbox Testing Phase Banner: Visible for SA Admin, Admin, and Developer when status is TESTING */}
        {formData.status === 'TESTING' && (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'DEVELOPER') && (
          <div className="mb-6 p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/90 via-slate-50 to-indigo-50/50 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/30 shadow-sm animate-in fade-in space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Manual Sandbox Testing Phase
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 rounded-full">
                      Ready for Testing
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    MA Manager & SA Admin can test the integration in the interactive Super App sandbox container or download the APK for physical device verification before granting production activation.
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Action Bar: Verification Tools vs Workflow Decisions */}
            <div className="pt-3 border-t border-purple-100 dark:border-purple-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Group 1: Verification Tools */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Button
                  type="button"
                  onClick={openSandboxPreview}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span>Super App Sandbox</span>
                </Button>

                <a
                  href="http://localhost:8081/repository/apk-releases/superapp/v1.1.0/app-debug.apk"
                  download="superapp-debug.apk"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm"
                  title="Download Super App Test Build APK (Nexus)"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>Download Test APK</span>
                </a>
              </div>

              {/* Group 2: Workflow Decisions */}
              <div className="flex items-center gap-2 flex-wrap">
                {can('miniapp:approve') && (
                  <Button
                    type="button"
                    onClick={() => handleLifecycleAction('activate')}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                    <span>Final Approval & Activate</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleLifecycleAction('request-changes')}
                  disabled={isSubmitting}
                  className="border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 text-xs px-3.5 py-2 font-medium rounded-xl transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>Report Issues</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-700 mb-6 px-2 overflow-x-auto">
          {['overview', 'team', 'integration', 'permissions', 'report', 'activity'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 font-medium text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {tab === 'report' && (
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>{tab === 'report' ? 'Report' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              {tab === 'report' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  (formData as any).validationStatus === 'PASSED'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : (formData as any).validationStatus === 'RUNNING'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 animate-pulse'
                    : (formData as any).validationStatus === 'FAILED'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {(formData as any).validationStatus || 'PENDING'}
                </span>
              )}
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
                    <Label>App ID <span className="text-rose-500">*</span></Label>
                    <Input readOnly className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed" name="appId" value={formData.appId || ''} placeholder="com.fsa..." />
                  </div>
                  <div>
                    <Label>App Name <span className="text-rose-500">*</span></Label>
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
                    <Label>Category <span className="text-rose-500">*</span></Label>
                    <Select name="category" value={formData.category || 'Banking'} onChange={handleChange}>
                      <option>Banking</option>
                      <option>Insurance</option>
                      <option>Lifestyle</option>
                      <option>Shopping</option>
                    </Select>
                  </div>

                  <div>
                    <LogoUploadInput
                      value={formData.logo || ''}
                      onChange={(logoVal) => setFormData(prev => ({ ...prev, logo: logoVal }))}
                      error={allErrors.logo}
                      required={true}
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label>Short Description</Label>
                      <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <Input name="shortDescription" value={formData.shortDescription || ''} onChange={handleChange} placeholder="Brief summary of the app..." />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label>Full Description</Label>
                      <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <textarea
                      name="fullDescription"
                      rows={3}
                      value={formData.fullDescription || ''}
                      onChange={handleChange}
                      placeholder="Comprehensive details regarding the purpose and functionality..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Legal Information */}
                  <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span>Legal Information</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ValidatedUrlInput
                        name="termsUrl"
                        label="Terms & Conditions URL"
                        value={formData.termsUrl || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/terms"
                        helperText="Public terms of service URL for this Mini Application."
                        optional={true}
                        externalError={allErrors.termsUrl}
                      />

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
                    </div>
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
                onDomainVerified={handleDomainVerified}
              />
            </Card>}

            {
              activeTab === 'permissions' && <Card>
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
              </Card>
            }

            {
              activeTab === 'report' && (
                <ValidationReportTab
                  miniApp={{ ...formData, id }}
                  onRefresh={async () => {
                    try {
                      const res = await fetch(`${API_URL}/mini-apps/${id}`);
                      if (res.ok) {
                        const data = await res.json();
                        setFormData(data);
                      }
                    } catch (e) {}
                  }}
                />
              )
            }

            {
              activeTab === 'activity' && (
                <Card>
                  <CardHeader title="Activity Timeline" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                  <p className="text-sm text-slate-500 mb-8">Timeline of all events related to this Mini App.</p>
                  <ActivityTab miniAppId={id as string} />
                </Card>
              )
            }

          </fieldset >
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
        </form >

        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          url={previewUrl}
          title={formData.name || ''}
          category={formData.category}
          appId={formData.appId}
          version={(formData as any).version || '1.0.0'}
          isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
        />
      </div >

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
      {
        !modalState.isOpen && hasErrors && (
          <ValidationIssuesButton errors={allErrors} onNavigate={handleNavigateToIssue} />
        )
      }
    </>
  );
}
