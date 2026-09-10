"use client";
import { API_URL } from '@/lib/config';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal, { SubmissionModalState } from '@/components/ui/SubmissionModal';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import TeamForm from '@/components/forms/TeamForm';
import IntegrationForm from '@/components/forms/IntegrationForm';
import PermissionsForm, { formatCompliantPurpose } from '@/components/forms/PermissionsForm';
import ValidationIssuesButton from '@/components/ValidationIssuesButton';
import ActivityTab from '@/components/ui/ActivityTab';
import ValidationReportTab from '@/components/ui/ValidationReportTab';
import MiniAppDetailHeader from '@/components/miniapp-detail/MiniAppDetailHeader';
import MiniAppLifecycleBanners from '@/components/miniapp-detail/MiniAppLifecycleBanners';
import MiniAppDetailTabs, { MiniAppTabType } from '@/components/miniapp-detail/MiniAppDetailTabs';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';
import { validateUrlFormat } from '@/components/ui/ValidatedUrlInput';

export default function ManageMiniAppPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [formData, setFormData] = useState<Partial<CreateMiniAppDto & { status: string; validationErrors?: Record<string, string>; validationStatus?: string; validationStages?: any; validationReport?: any; issues?: any[] }>>({
    name: '',
    appId: '',
    category: 'Insurance',
    shortDescription: '',
    fullDescription: '',
    logo: '',
    termsUrl: '',
    termsDescription: '',
    privacyPolicyUrl: '',
    privacyPolicyDescription: '',
    teamName: '',
    ownerName: '',
    ownerEmail: '',
    supportEmail: '',
    integrationMethod: IntegrationMethod.WEBVIEW,
    integrationConfigWebView: { productionUrl: '' },
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    integrationConfigDeepLink: { urlScheme: '', packageName: '', appStoreUrl: '' },
    permissions: [],
    securityChecks: [],
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
  const [activeTab, setActiveTab] = useState<MiniAppTabType>('overview');
  const [customPermission, setCustomPermission] = useState('');
  const [isEditingUnlocked, setIsEditingUnlocked] = useState(false);

  useEffect(() => {
    const errors: Record<string, string> = {};
    if (formData.appId && !/^[a-z0-9_.-]+$/.test(formData.appId)) {
      errors.appId = 'Mini App ID can only contain lowercase letters, numbers, and underscores (e.g. miniapp_8f32a1)';
    }
    if (formData.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Owner Email must be a valid email';
    }
    if (formData.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      errors.supportEmail = 'Support Email must be a valid email';
    }
    if (formData.name && formData.name.length < 2) {
      errors.name = 'Mini App Name must be at least 2 characters';
    }

    if (formData.integrationMethod === IntegrationMethod.WEBVIEW && formData.integrationConfigWebView?.productionUrl) {
      const prodUrl = formData.integrationConfigWebView.productionUrl;
      const envVal = (
        process.env.NEXT_PUBLIC_ENVIRONMENT ||
        process.env.ENVIRONMENT ||
        process.env.NODE_ENV ||
        ''
      ).toUpperCase();
      const isDev =
        envVal !== 'PROD' &&
        (envVal === 'DEV' ||
          (typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname.endsWith('.local') ||
              window.location.hostname.endsWith('.orb.local'))));

      if (!isDev) {
        if (!prodUrl.startsWith('https://')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS in PROD mode.';
        } else if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
          errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost in PROD mode.';
        }
      }
    }

    setLocalErrors(errors);

    if (formData.appId || formData.name) {
      const timeoutId = setTimeout(async () => {
        try {
          const queryParams = new URLSearchParams();
          if (formData.appId && !errors.appId) queryParams.append('appId', formData.appId);
          if (formData.name && !errors.name) queryParams.append('name', formData.name);
          if (id) queryParams.append('excludeId', id as string);

          if (queryParams.toString()) {
            const res = await fetch(`${API_URL}/mini-apps/check-exists?${queryParams.toString()}`);
            if (res.ok) {
              const data = await res.json();
              setLocalErrors((prev) => {
                const newErrors = { ...prev };
                if (data.appIdExists) newErrors.appId = 'This Mini App ID is already taken.';
                if (data.nameExists) newErrors.name = 'This Mini App Name is already taken.';
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
      if (tabParam && ['overview', 'team', 'permissions', 'integration', 'activity', 'validation', 'report'].includes(tabParam)) {
        setActiveTab(tabParam === 'validation' ? 'report' : (tabParam as MiniAppTabType));
      }
    }
  }, []);

  const fetchApp = async () => {
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
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  useEffect(() => {
    if (formData.status !== 'BUILDING') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/mini-apps/${id}`);
        if (res.ok) {
          const updated = await res.json();
          if (updated.status && updated.status !== 'BUILDING') {
            setFormData((prev) => ({ ...prev, status: updated.status }));
          }
        }
      } catch (_) {}
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [formData.status, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const fieldName = e.target.name;
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[fieldName];
      }
      return {
        ...prev,
        [fieldName]: e.target.value,
        validationErrors: nextValidationErrors,
      };
    });
  };

  const handleWebViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name;
    const isProdUrlChange = fieldName === 'productionUrl';
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigWebView.${fieldName}`];
      }
      return {
        ...prev,
        isDomainVerified: isProdUrlChange ? false : prev.isDomainVerified,
        integrationConfigWebView: { ...prev.integrationConfigWebView!, [fieldName]: e.target.value },
        validationErrors: nextValidationErrors,
      };
    });
    if (isProdUrlChange) {
      setLocalErrors((prev) => ({
        ...prev,
        'integrationConfigWebView.domainVerification':
          'Domain ownership has not been verified. Please verify domain ownership before submitting.',
      }));
    }
  };

  const handleFlutterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const fieldName = e.target.name;
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigFlutter.${fieldName}`];
      }
      return {
        ...prev,
        integrationConfigFlutter: { ...prev.integrationConfigFlutter!, [fieldName]: e.target.value },
        validationErrors: nextValidationErrors,
      };
    });
  };

  const handleDeepLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const fieldName = e.target.name;
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigDeepLink.${fieldName}`];
      }
      return {
        ...prev,
        integrationConfigDeepLink: { ...prev.integrationConfigDeepLink!, [fieldName]: e.target.value } as any,
        validationErrors: nextValidationErrors,
      };
    });
  };

  const togglePermission = (type: string) => {
    const exists = formData.permissions?.find((p) => p.type === type);
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        Object.keys(nextValidationErrors).forEach((key) => {
          if (key.toLowerCase().includes(type.toLowerCase()) || key.startsWith('permissions.')) {
            delete nextValidationErrors[key];
          }
        });
      }

      let updatedPermissions;
      if (exists) {
        updatedPermissions = prev.permissions?.filter((p) => p.type !== type);
      } else {
        const defaultPurpose = formatCompliantPurpose(type, '', prev.name);
        updatedPermissions = [...(prev.permissions || []), { type, purpose: defaultPurpose, termsUrl: '' }];
      }

      return {
        ...prev,
        permissions: updatedPermissions,
        validationErrors: nextValidationErrors,
      };
    });
  };

  const handleDomainVerified = (data: any) => {
    const isVerified = Boolean(data.verified === true || data.isDomainVerified === true);
    setFormData((prev) => {
      const nextErrors = prev.validationErrors ? { ...prev.validationErrors } : {};
      if (isVerified) {
        delete nextErrors['integrationConfigWebView.domainVerification'];
      }
      return {
        ...prev,
        isDomainVerified: isVerified,
        domainVerifiedAt: isVerified ? (data.domainVerifiedAt || new Date().toISOString()) : undefined,
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
    setLocalErrors((prev) => {
      const next = { ...prev };
      if (isVerified) {
        delete next['integrationConfigWebView.domainVerification'];
      } else {
        next['integrationConfigWebView.domainVerification'] =
          'Domain ownership has not been verified. Please verify domain ownership before submitting.';
      }
      return next;
    });
  };

  const handlePermissionFieldChange = (type: string, field: string, value: string) => {
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        Object.keys(nextValidationErrors).forEach((key) => {
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
        permissions: prev.permissions?.map((p) => (p.type === type ? { ...p, [field]: value } : p)),
        validationErrors: nextValidationErrors,
      };
    });
  };

  const handleSave = async (e: React.FormEvent, isDraftOnly = false) => {
    if (e && e.preventDefault) e.preventDefault();

    if (formData.termsUrl && formData.termsUrl.trim()) {
      const v = validateUrlFormat(formData.termsUrl, 'Terms of Service URL', true);
      if (!v.valid && v.error) {
        setLocalErrors((prev) => ({ ...prev, termsUrl: v.error }));
        return;
      }
    }
    if (formData.privacyPolicyUrl && formData.privacyPolicyUrl.trim()) {
      const v = validateUrlFormat(formData.privacyPolicyUrl, 'Privacy Policy URL', true);
      if (!v.valid && v.error) {
        setLocalErrors((prev) => ({ ...prev, privacyPolicyUrl: v.error }));
        return;
      }
    }

    if (!isDraftOnly && formData.integrationMethod === IntegrationMethod.WEBVIEW && !formData.isDomainVerified) {
      setLocalErrors((prev) => ({
        ...prev,
        'integrationConfigWebView.domainVerification':
          'Domain ownership has not been verified. Please host the verification association file and verify domain ownership before submitting.',
      }));
      return;
    }

    setIsSubmitting(true);
    setModalState({ isOpen: true, status: 'loading' });

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
      termsDescription: formData.termsDescription,
      privacyPolicyUrl: formData.privacyPolicyUrl,
      privacyPolicyDescription: formData.privacyPolicyDescription,
      teamName: formData.teamName,
      ownerName: formData.ownerName,
      ownerEmail: formData.ownerEmail,
      supportEmail: formData.supportEmail,
      integrationMethod: formData.integrationMethod,
      permissions: cleanPermissions,
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
        body: JSON.stringify(payload),
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
              setFormData((prev) => ({
                ...appData,
                permissions: Array.isArray(appData.permissions) ? appData.permissions : prev.permissions,
                integrationConfigWebView: appData.integrationMethod === IntegrationMethod.WEBVIEW ? appData.integrationConfig : prev.integrationConfigWebView,
                integrationConfigFlutter: appData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ? appData.integrationConfig : prev.integrationConfigFlutter,
                integrationConfigDeepLink: appData.integrationMethod === IntegrationMethod.DEEP_LINK ? appData.integrationConfig : prev.integrationConfigDeepLink,
              }));

              const statusUpper = (appData.status || '').toUpperCase();
              if (statusUpper !== 'PROCESSING') {
                const hasValidationErrors = appData.validationErrors && Object.keys(appData.validationErrors).length > 0;
                if (hasValidationErrors) {
                  clearInterval(pollTimer);
                  setModalState({
                    isOpen: true,
                    status: 'error',
                    message: 'Validation failed.',
                    errors: appData.validationErrors || {},
                  });
                  setIsSubmitting(false);
                } else {
                  clearInterval(pollTimer);
                  setModalState({ isOpen: true, status: 'success', message: 'Saved and submitted for review successfully!' });
                  setIsSubmitting(false);
                }
              }
            }
          } catch (pollErr) {}
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
          errors: errorsObj,
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      setModalState({ isOpen: true, status: 'error', message: 'Error connecting to backend.' });
      setIsSubmitting(false);
    }
  };

  const handleLifecycleAction = async (
    action: 'submit' | 'approve' | 'reject' | 'request-changes' | 'start-testing' | 'activate' | 'suspend',
    explicitReason?: string
  ) => {
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
      const isTestBuild = action === 'start-testing';
      const actionLabel = isTestBuild ? 'build test package and advance to testing' : action === 'activate' ? 'activate' : action;
      const isConfirmed = await confirm({
        title: isTestBuild ? 'Trigger Super App Test Build' : `Confirm ${actionLabel}`,
        message: isTestBuild
          ? 'Are you sure you want to trigger the Jenkins test build? This will compile the Super App container in debug mode and upload the test APK to Nexus for manual testing.'
          : `Are you sure you want to ${actionLabel} this Mini App?`,
        confirmText: isTestBuild ? 'Trigger Test Build' : `Yes, proceed`,
        cancelText: 'Cancel',
      });
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/mini-apps/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setModalState({
          isOpen: true,
          status: 'success',
          message:
            action === 'start-testing'
              ? 'Super App test build pipeline triggered in Jenkins! Packaging test APK for Nexus store...'
              : `Mini App status successfully updated!`,
        });
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
      confirmVariant: 'danger',
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
        <MiniAppDetailHeader
          formData={formData}
          role={role}
          can={can}
          isEditingUnlocked={isEditingUnlocked}
          onToggleEditing={() => setIsEditingUnlocked(!isEditingUnlocked)}
          onOpenSandbox={openSandboxPreview}
          onLifecycleAction={handleLifecycleAction}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}
        />

        {/* Lifecycle Status Banners */}
        <MiniAppLifecycleBanners
          status={formData.status || 'DRAFT'}
          can={can}
          role={role}
          testVersion={(formData as any).integrationConfig?.superAppTestVersion || 'v1.1.1'}
          isSubmitting={isSubmitting}
          onLifecycleAction={handleLifecycleAction}
          onOpenSandbox={openSandboxPreview}
        />

        {/* Tab Navigation List */}
        <MiniAppDetailTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          allErrors={allErrors}
          validationStatus={formData.validationStatus}
        />

        {/* Tab Contents */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <Card>
              <CardHeader
                title="General Information"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <BasicInfoForm formData={formData} handleChange={handleChange} allErrors={allErrors} isEditable={isEditable} />
            </Card>
          )}

          {activeTab === 'team' && (
            <Card>
              <CardHeader
                title="Team & Support"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <TeamForm formData={formData} handleChange={handleChange} allErrors={allErrors} isEditable={isEditable} />
            </Card>
          )}

          {activeTab === 'integration' && (
            <Card>
              <CardHeader
                title="Technical Integration"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
              />
              <IntegrationForm
                formData={formData}
                handleChange={handleChange}
                allErrors={allErrors}
                handleWebViewChange={handleWebViewChange}
                handleFlutterChange={handleFlutterChange}
                handleDeepLinkChange={handleDeepLinkChange}
                onDomainVerified={handleDomainVerified}
                isEditable={isEditable}
              />
            </Card>
          )}

          {activeTab === 'permissions' && (
            <Card>
              <CardHeader
                title="Permissions & Capabilities"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                }
              />
              <PermissionsForm
                formData={formData}
                setFormData={setFormData}
                handleChange={handleChange}
                allErrors={allErrors}
                togglePermission={togglePermission}
                handlePermissionFieldChange={handlePermissionFieldChange}
                customPermission={customPermission}
                setCustomPermission={setCustomPermission}
                isEditable={isEditable}
              />
            </Card>
          )}

          {activeTab === 'report' && (
            <ValidationReportTab miniApp={formData} onRefresh={fetchApp} />
          )}

          {activeTab === 'activity' && (
            <ActivityTab miniAppId={id as string} />
          )}
        </div>

        {/* Save Changes Bottom Toolbar for Editable Modes */}
        {isEditable && activeTab !== 'report' && activeTab !== 'activity' && (
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSave(e, true)}
              disabled={isSubmitting}
              className="h-11 px-6 text-base font-semibold"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSave(e, false)}
              disabled={isSubmitting}
              className="h-11 px-6 text-base font-semibold"
            >
              {isSubmitting ? 'Saving...' : 'Save & Submit Changes'}
            </Button>
          </div>
        )}

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
        mode="manage"
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onFixLater={() => {
          setModalState({ ...modalState, isOpen: false });
        }}
        onRunInBackground={() => {
          setModalState({ ...modalState, isOpen: false });
        }}
        onSuccessContinue={() => {}}
      />

      {/* Floating Error Summary Button */}
      {!modalState.isOpen && hasErrors && (
        <ValidationIssuesButton errors={allErrors} onNavigate={handleNavigateToIssue} />
      )}
    </>
  );
}
