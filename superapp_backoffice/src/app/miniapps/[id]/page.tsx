"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import ActivityTab from '@/components/ui/ActivityTab';
import ValidationReportTab from '@/components/ui/ValidationReportTab';
import VersionHistoryTab from '@/components/miniapp-detail/VersionHistoryTab';
import MiniAppDetailHeader from '@/components/miniapp-detail/MiniAppDetailHeader';

import MiniAppLifecycleBanners from '@/components/miniapp-detail/MiniAppLifecycleBanners';
import MiniAppDetailTabs, { MiniAppTabType } from '@/components/miniapp-detail/MiniAppDetailTabs';
import { RevisionReviewModal } from '@/components/review/RevisionReviewModal';
import ReasonPromptModal from '@/components/ui/ReasonPromptModal';
import BuildProgressModal, { BuildProgressModalState } from '@/components/ui/BuildProgressModal';
import { CreateMiniAppDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';
import { validateUrlFormat } from '@/components/ui/ValidatedUrlInput';
import { toast } from '@/components/ui/Toast';
import { miniappsApi, superAppApi } from '@/api';

export default function ManageMiniAppPage({ params: _params }: { params?: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const routeParams = useParams();
  const id = (typeof routeParams?.id === 'string' ? routeParams.id : (Array.isArray(routeParams?.id) ? routeParams.id[0] : '')) || '';

  const [formData, setFormData] = useState<Partial<CreateMiniAppDto & { id?: string; status: string; validationErrors?: Record<string, string>; validationStatus?: string; validationStages?: any; validationReport?: any; buildStages?: any; buildStatus?: string; buildError?: string; issues?: any[]; pendingRevision?: any; activeTestVersion?: string; currentReleaseVersion?: string; draftVersion?: string; version?: string; versionHistory?: any[]; integrationConfig?: any }>>({
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
    teamTelegramChatId: '',
    integrationMethod: IntegrationMethod.WEBVIEW,
    integrationConfigWebView: { productionUrl: '' },
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    integrationConfigDeepLink: { urlScheme: '', packageName: '', appStoreUrl: '' },
    permissions: [],
    securityChecks: [],
    status: 'DRAFT',
    validationErrors: undefined as Record<string, string> | undefined,
    pendingRevision: undefined as any,
    activeTestVersion: undefined as string | undefined,
    currentReleaseVersion: undefined as string | undefined,
    draftVersion: undefined as string | undefined,
    version: undefined as string | undefined,
    versionHistory: undefined as any[] | undefined,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<SubmissionModalState>({ isOpen: false, status: 'loading' });
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const [isReviewDiffOpen, setIsReviewDiffOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionChangelog, setRevisionChangelog] = useState('');
  const [revisionJustification, setRevisionJustification] = useState('');
  const [lifecycleReasonModal, setLifecycleReasonModal] = useState<{
    isOpen: boolean;
    action: 'reject' | 'request-changes' | 'discard-revision';
    title: string;
    description: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning';
    quickSuggestions: string[];
    placeholder: string;
  } | null>(null);

  const confirm = useConfirm();
  const { can, role } = useAuth();
  const [activeTab, setActiveTab] = useState<MiniAppTabType>('overview');
  const [customPermission, setCustomPermission] = useState('');
  const [isEditingUnlocked, setIsEditingUnlocked] = useState(false);
  const [latestTestVersion, setLatestTestVersion] = useState<string>('v0.3.7');
  const [pendingArchiveFile, setPendingArchiveFile] = useState<File | null>(null);
  const [buildModalState, setBuildModalState] = useState<BuildProgressModalState>({
    isOpen: false,
    status: 'building',
  });

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
              window.location.hostname.endsWith('.orb.local') ||
              /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname))));

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
          const paramsToCheck: { appId?: string; name?: string; excludeId?: string } = {};
          if (formData.appId && !errors.appId) paramsToCheck.appId = formData.appId;
          if (formData.name && !errors.name) paramsToCheck.name = formData.name;
          if (id) paramsToCheck.excludeId = id as string;

          if (paramsToCheck.appId || paramsToCheck.name) {
            const data = await miniappsApi.checkExists(paramsToCheck);
            if (data) {
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

  const rawErrors = { ...localErrors, ...(formData.validationErrors || {}) };
  const allErrors = Object.entries(rawErrors).reduce((acc, [key, val]) => {
    if (
      formData.integrationMethod !== IntegrationMethod.WEBVIEW &&
      key.startsWith('integrationConfigWebView')
    ) {
      return acc;
    }
    if (
      formData.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE &&
      key.startsWith('integrationConfigFlutter')
    ) {
      return acc;
    }
    if (
      formData.integrationMethod !== IntegrationMethod.DEEP_LINK &&
      key.startsWith('integrationConfigDeepLink')
    ) {
      return acc;
    }
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);
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
        : `http://localhost:8081/repository/pub-group/api/packages/${conf?.packageName || 'superapp_core'}`;
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

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchApp = async (isRetry = false, isSilent = false) => {
    if (!id) return;
    if (!isSilent) setIsLoading(true);
    if (!isRetry) setFetchError(null);
    try {
      const data = await miniappsApi.getById(id);
      if (data && data.id) {
        setFetchError(null);
        const activeOrRev = data.pendingRevision ? { ...data, ...data.pendingRevision } : data;
        setFormData({
          ...data,
          ...activeOrRev,
          pendingRevision: data.pendingRevision,
          permissions: Array.isArray(activeOrRev.permissions) ? activeOrRev.permissions : [],
          integrationConfigWebView: activeOrRev.integrationMethod === IntegrationMethod.WEBVIEW ? {
            ...activeOrRev.integrationConfig,
            allowedDomains: Array.isArray(activeOrRev.integrationConfig?.allowedDomains)
              ? activeOrRev.integrationConfig.allowedDomains.join(', ')
              : (activeOrRev.integrationConfig?.allowedDomains || ''),
          } : { productionUrl: '', allowedDomains: '', stagingUrl: '' },
          integrationConfigFlutter: activeOrRev.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ? activeOrRev.integrationConfig : { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
          integrationConfigDeepLink: activeOrRev.integrationMethod === IntegrationMethod.DEEP_LINK ? activeOrRev.integrationConfig : { urlScheme: '', packageName: '', appStoreUrl: '' },
        });

        // Fetch current active ecosystem test build version
        try {
          const eco = await superAppApi.getEcosystemStatus();
          if (eco && (eco.superAppTestVersion || eco.superAppVersion)) {
            setLatestTestVersion(eco.superAppTestVersion || eco.superAppVersion);
          }
        } catch (_) {}

        // Auto-open Sandbox Preview modal if query param is set
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (
            urlParams.get('preview') === 'true' ||
            urlParams.get('preview') === '1' ||
            urlParams.get('sandbox') === 'true' ||
            urlParams.get('tab') === 'sandbox' ||
            urlParams.get('tab') === 'preview'
          ) {
            if (activeOrRev.integrationMethod === IntegrationMethod.WEBVIEW) {
              setPreviewUrl(activeOrRev.integrationConfig?.productionUrl || '');
            } else if (activeOrRev.integrationMethod === IntegrationMethod.DEEP_LINK) {
              setPreviewUrl(
                activeOrRev.integrationConfig?.urlScheme ||
                  (activeOrRev as any).integrationConfig?.urlScheme ||
                  'app://open',
              );
            } else {
              const conf = activeOrRev.integrationConfig;
              const target =
                conf?.sourceType === SourceType.GIT
                  ? conf.gitUrl || ''
                  : `http://localhost:8081/repository/pub-group/api/packages/${conf?.packageName || 'superapp_core'}`;
              setPreviewUrl(target);
            }
            setShowPreview(true);
          }
        }
      } else {
        if (!isRetry) {
          setTimeout(() => fetchApp(true, isSilent), 500);
          return;
        }
        setFetchError('Mini App not found or failed to load configuration.');
        toast.error('Failed to fetch mini app details.', 'Load Failed');
      }
    } catch (error: any) {
      if (!isRetry) {
        setTimeout(() => fetchApp(true, isSilent), 500);
        return;
      }
      setFetchError(error?.message || 'Error connecting to backend.');
      toast.error('Error connecting to backend.', 'Connection Error');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  useEffect(() => {
    const isBuilding = formData.status === 'BUILDING' || (buildModalState.isOpen && buildModalState.status === 'building');
    if (!isBuilding) return;

    const pollInterval = setInterval(async () => {
      try {
        const updated = await miniappsApi.getById(id);
        if (updated) {
          setFormData((prev: any) => ({
            ...prev,
            ...updated,
            status: updated.status || prev.status,
            buildStages: updated.buildStages || prev.buildStages,
            buildStatus: updated.buildStatus || prev.buildStatus,
            buildError: updated.buildError || prev.buildError,
            activeTestVersion: updated.activeTestVersion || prev.activeTestVersion,
          }));

          setBuildModalState((prev) => {
            if (!prev.isOpen) return prev;
            const isFailed = updated.status === 'BUILD_FAILED' || updated.buildStatus === 'FAILED';
            const isSuccess = updated.status === 'TESTING' || updated.buildStatus === 'COMPLETED';
            return {
              ...prev,
              status: isFailed ? 'error' : isSuccess ? 'success' : 'building',
              stages: updated.buildStages || prev.stages,
              errorMessage: updated.buildError || prev.errorMessage,
              releaseVersion: updated.activeTestVersion || prev.releaseVersion,
            };
          });
        }
      } catch (_) {}
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [formData.status, buildModalState.isOpen, buildModalState.status, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const fieldName = e.target.name;
    if (fieldName === 'integrationMethod') {
      const newMethod = e.target.value;
      if (newMethod !== IntegrationMethod.WEBVIEW) {
        setLocalErrors((prev) => {
          const next = { ...prev };
          delete next['integrationConfigWebView.domainVerification'];
          delete next['integrationConfigWebView.productionUrl'];
          delete next['integrationConfigWebView.stagingUrl'];
          delete next['integrationConfigWebView.allowedDomains'];
          return next;
        });
      }
    }
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[fieldName];
        if (fieldName === 'integrationMethod' && e.target.value !== IntegrationMethod.WEBVIEW) {
          delete nextValidationErrors['integrationConfigWebView.domainVerification'];
          delete nextValidationErrors['integrationConfigWebView.productionUrl'];
        }
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
    if (isProdUrlChange && formData.integrationMethod === IntegrationMethod.WEBVIEW) {
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

  const handleUpdateFlutterConfig = (
    updates: Record<string, any>,
    extraData?: { archiveFile?: File; detectedPermissions?: any[] },
  ) => {
    if (extraData?.archiveFile) {
      setPendingArchiveFile(extraData.archiveFile);
    }
    setFormData((prev: any) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        Object.keys(updates).forEach((k) => {
          delete nextValidationErrors[`integrationConfigFlutter.${k}`];
        });
      }
      return {
        ...prev,
        integrationConfigFlutter: { ...(prev.integrationConfigFlutter || {}), ...updates },
        permissions:
          extraData?.detectedPermissions && extraData.detectedPermissions.length > 0
            ? extraData.detectedPermissions
            : prev.permissions,
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
    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
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
    }
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

    if (!isDraftOnly && formData.status === 'ACTIVE') {
      setRevisionModalOpen(true);
      return;
    }

    await executeSave(isDraftOnly);
  };

  const executeSave = async (isDraftOnly = false, changelog?: string, justification?: string) => {
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
      teamTelegramChatId: formData.teamTelegramChatId,
      integrationMethod: formData.integrationMethod,
      permissions: cleanPermissions,
    };

    if (changelog) payload.changelog = changelog;
    if (justification) payload.justification = justification;

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
      if (pendingArchiveFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', pendingArchiveFile);
          if (id) uploadFormData.append('miniAppId', id);
          const ver = formData.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
          uploadFormData.append('version', ver);

          const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
          if (uploadRes && (uploadRes.success || uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl)) {
            formData.integrationConfigFlutter = {
              sourceType: formData.integrationConfigFlutter?.sourceType || SourceType.ARTIFACT,
              ...formData.integrationConfigFlutter,
              packageStoragePath: uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl,
              packageUrl: uploadRes.packageUrl,
              archiveChecksum: uploadRes.sha256 || formData.integrationConfigFlutter?.archiveChecksum,
            };
          }
        } catch (err) {
          console.error('Failed to upload archive to MinIO on edit save:', err);
        }
      }
      payload.integrationConfigFlutter = formData.integrationConfigFlutter;
    } else if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
      payload.integrationConfigDeepLink = formData.integrationConfigDeepLink;
    }

    try {
      const resData = await miniappsApi.update(id, payload);

      if (resData) {
        if (isDraftOnly) {
          toast.success('Draft saved successfully.', 'Draft Saved');
          setIsSubmitting(false);
          fetchApp();
          return;
        }

        if (resData.isFastTrack) {
          toast.success('General information updated live instantly (Fast-Track applied).', 'Updated Live');
          setModalState({ isOpen: false, status: 'success' });
          setIsSubmitting(false);
          fetchApp();
          return;
        }

        let attempts = 0;
        const pollTimer = setInterval(async () => {
          attempts++;
          try {
            const appData = await miniappsApi.getById(id);
            if (appData) {
              setFormData((prev: any) => ({
                ...appData,
                permissions: Array.isArray(appData.permissions) ? appData.permissions : prev.permissions,
                integrationConfigWebView: appData.integrationMethod === IntegrationMethod.WEBVIEW ? appData.integrationConfig : prev.integrationConfigWebView,
                integrationConfigFlutter: appData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ? appData.integrationConfig : prev.integrationConfigFlutter,
                integrationConfigDeepLink: appData.integrationMethod === IntegrationMethod.DEEP_LINK ? appData.integrationConfig : prev.integrationConfigDeepLink,
              }));

              const statusUpper = (appData.status || '').toUpperCase();
              if (statusUpper !== 'PROCESSING') {
                const hasValidationErrors = appData.validationErrors && Object.keys(appData.validationErrors).length > 0;
                setModalState({
                  isOpen: false,
                  status: (statusUpper === 'REJECTED' || hasValidationErrors) ? 'error' : 'success',
                  errors: appData.validationErrors,
                });
                clearInterval(pollTimer);
                setIsSubmitting(false);
                fetchApp();
              }
            }
          } catch (e) {
            // Polling error ignored
          }

          if (attempts >= 15) {
            clearInterval(pollTimer);
            setModalState({ isOpen: false, status: 'success' });
            setIsSubmitting(false);
            fetchApp();
          }
        }, 1000);
      }
    } catch (error: any) {
      let errorsObj: Record<string, string> | undefined = undefined;
      if (Array.isArray(error?.message)) {
        errorsObj = {};
        const errs = errorsObj as Record<string, string>;
        error.message.forEach((msg: string) => {
          const field = msg.split(' ')[0];
          errs[field] = msg;
        });
      }
      setModalState({
        isOpen: true,
        status: 'error',
        message: Array.isArray(error?.message) ? undefined : error?.message || 'Failed to save changes.',
        errors: errorsObj,
      });
      setIsSubmitting(false);
    }
  };

  const handleLifecycleAction = async (
    action: 'submit' | 'approve' | 'reject' | 'request-changes' | 'start-testing' | 'activate' | 'suspend' | 'publish-revision' | 'discard-revision',
    explicitReason?: string
  ) => {
    const isLiveWithRevision = formData.status === 'ACTIVE' && Boolean(formData.pendingRevision);

    if (action === 'discard-revision' && explicitReason === undefined) {
      setLifecycleReasonModal({
        isOpen: true,
        action: 'discard-revision',
        title: 'Reject & Discard Staged Revision',
        description: 'Are you sure you want to reject this revision? All proposed changes will be discarded while the live version remains active in the Super App catalog.',
        confirmText: 'Reject Revision',
        confirmVariant: 'danger',
        placeholder: 'Explain why this revision cannot be accepted...',
        quickSuggestions: [
          'Violates Super App platform capability and security policies',
          'High-risk permissions requested without required partner certification',
          'Duplicate or conflicting capability with existing Super App core features',
          'Incompatible technical architecture or failed automated security baseline',
        ],
      });
      return;
    }

    if (action === 'reject' && explicitReason === undefined) {
      if (isLiveWithRevision) {
        setLifecycleReasonModal({
          isOpen: true,
          action: 'discard-revision',
          title: 'Reject & Discard Staged Revision',
          description: 'Are you sure you want to reject this staged revision? All proposed changes will be discarded while the live version remains active in the Super App.',
          confirmText: 'Reject Revision',
          confirmVariant: 'danger',
          placeholder: 'Explain why this revision is being rejected...',
          quickSuggestions: [
            'Violates Super App platform capability and security policies',
            'High-risk permissions requested without required partner certification',
            'Duplicate or conflicting capability with existing Super App core features',
            'Security baseline checks failed on proposed endpoint or artifact',
          ],
        });
        return;
      }

      setLifecycleReasonModal({
        isOpen: true,
        action: 'reject',
        title: 'Reject Mini App Submission',
        description: 'Specify the reason for rejecting this Mini App. The developer will receive this feedback to remediate issues.',
        confirmText: 'Reject Mini App',
        confirmVariant: 'danger',
        placeholder: 'Explain why this Mini App is being rejected...',
        quickSuggestions: [
          'App description or assets violate Super App content guidelines',
          'Integration endpoint is unreachable or returning invalid responses',
          'High-risk permissions requested without acceptable justification',
          'Security or domain verification requirements failed baseline',
        ],
      });
      return;
    }

    if (action === 'request-changes' && explicitReason === undefined) {
      if (isLiveWithRevision) {
        setLifecycleReasonModal({
          isOpen: true,
          action: 'request-changes',
          title: 'Request Changes on Staged Revision',
          description: 'Specify the required fixes. The staged revision will remain in draft for the developer while the live version remains active.',
          confirmText: 'Send Request',
          confirmVariant: 'warning',
          placeholder: 'Specify what updates are needed in this revision...',
          quickSuggestions: [
            'Permission purpose is too vague; provide explicit business context',
            'Domain whitelist includes unverified external domains',
            'Terms of Service / Privacy Policy URL is inaccessible or invalid',
            'Security scan flagged potential SSRF risk on target endpoint',
          ],
        });
        return;
      }

      setLifecycleReasonModal({
        isOpen: true,
        action: 'request-changes',
        title: 'Request Changes from Developer',
        description: 'Provide details on what needs to be updated before this Mini App can proceed through the approval pipeline.',
        confirmText: 'Send Request',
        confirmVariant: 'warning',
        placeholder: 'Specify what updates are needed...',
        quickSuggestions: [
          'Please clarify and provide detailed purpose for requested permissions',
          'Domain verification TXT / association record is missing or expired',
          'Update Terms of Service and Privacy Policy URLs to valid live documents',
          'Resolve reported security scan vulnerabilities before resubmission',
        ],
      });
      return;
    }

    let reason = explicitReason || '';
    if (!explicitReason) {
      const isTestBuild = action === 'start-testing';
      const isPublishRev = action === 'publish-revision';
      const isDiscardRev = action === 'discard-revision';
      const actionLabel = isTestBuild
        ? 'build test package and advance to testing'
        : isPublishRev
        ? 'publish the staged revision live to production'
        : isDiscardRev
        ? 'discard the pending revision'
        : action === 'activate'
        ? 'activate'
        : action;

      const isConfirmed = await confirm({
        title: isPublishRev
          ? 'Publish Staged Revision to Live'
          : isDiscardRev
          ? 'Discard Staged Revision'
          : isTestBuild
          ? 'Trigger Super App Test Build'
          : `Confirm ${actionLabel}`,
        message: isPublishRev
          ? 'Are you sure you want to publish the staged revision to production? This will update the live Mini App in the Super App catalog immediately.'
          : isDiscardRev
          ? 'Are you sure you want to discard this pending draft revision? Any unmerged changes will be lost.'
          : isTestBuild
          ? 'Are you sure you want to trigger the Jenkins test build? This will compile the Super App container in debug mode and upload the test APK to Nexus for manual testing.'
          : `Are you sure you want to ${actionLabel} this Mini App?`,
        confirmText: isPublishRev
          ? 'Publish Live'
          : isDiscardRev
          ? 'Discard Changes'
          : isTestBuild
          ? 'Trigger Test Build'
          : `Yes, proceed`,
        confirmVariant: isDiscardRev ? 'danger' : 'primary',
        cancelText: 'Cancel',
      });
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      if (action === 'start-testing') {
        setBuildModalState({
          isOpen: true,
          status: 'building',
          releaseVersion: formData.activeTestVersion || (formData.integrationConfig as any)?.superAppTestVersion || 'v1.0.0',
          stages: formData.buildStages || {},
          appId: formData.appId,
          appName: formData.name,
          errorMessage: undefined,
        });
      }

      const res = await miniappsApi.triggerAction(id, action, reason);
      const msg =
        action === 'start-testing'
          ? 'Super App test build pipeline triggered in Jenkins! Packaging test APK for Nexus store...'
          : action === 'publish-revision'
          ? 'Staged revision published live to Super App successfully!'
          : action === 'discard-revision'
          ? 'Pending draft revision has been discarded.'
          : action === 'approve'
          ? 'Mini App approved successfully! Redirecting to Security & Compliance scan...'
          : res?.message || 'Mini App status successfully updated!';
      toast.success(msg, 'Lifecycle Updated');
      fetchApp();
      if (action === 'approve' || action === 'submit') {
        setActiveTab('report');
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to execute ${action}.`, 'Action Failed');
      if (action === 'start-testing') {
        setBuildModalState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err?.message || 'Failed to trigger Jenkins test build.',
        }));
      }
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
      await miniappsApi.delete(id);
      toast.success('Mini App deleted successfully.', 'Deleted');
      router.push('/miniapps');
    } catch (error: any) {
      toast.error(error?.message || 'Error deleting mini app.', 'Connection Error');
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

  if (fetchError || !formData.id) {
    return (
      <div className="w-full max-w-xl mx-auto mt-24 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-lg animate-in fade-in">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Mini App Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
          {fetchError || `Unable to locate mini app with ID "${id}". It may have been deleted or the link is invalid.`}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/miniapps')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Mini Apps
          </Button>
          <Button
            variant="primary"
            onClick={() => fetchApp(false)}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Loading
          </Button>
        </div>
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
          latestTestVersion={latestTestVersion}
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
          testVersion={formData.activeTestVersion || latestTestVersion || (formData as any).integrationConfig?.superAppTestVersion || 'v0.3.7'}
          isSubmitting={isSubmitting}
          onLifecycleAction={handleLifecycleAction}
          onOpenSandbox={openSandboxPreview}
          onOpenReviewDiff={() => setIsReviewDiffOpen(true)}
          pendingRevision={formData.pendingRevision}
          buildStages={formData.buildStages}
          buildError={formData.buildError}
          currentReleaseVersion={formData.currentReleaseVersion || ((formData as any).versionHistory?.find((v: any) => v.type === 'PRODUCTION' && v.status === 'ACTIVE')?.version)}
          draftVersion={formData.pendingRevision?.version || (formData as any).draftVersion || formData.version}
          hasActiveProduction={Boolean((formData.status === 'ACTIVE' || formData.status === 'Published') && ((formData as any).versionHistory?.some((v: any) => v.type === 'PRODUCTION' && (v.status === 'ACTIVE' || v.status === 'PREVIOUS')) || formData.currentReleaseVersion))}
          onOpenBuildModal={() =>
            setBuildModalState({
              isOpen: true,
              status: formData.status === 'BUILD_FAILED' ? 'error' : formData.status === 'TESTING' ? 'success' : 'building',
              stages: formData.buildStages || {},
              releaseVersion: formData.activeTestVersion || (formData.integrationConfig as any)?.superAppTestVersion || 'v1.0.0',
              errorMessage: formData.buildError,
              appId: formData.appId,
              appName: formData.name,
            })
          }
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
              <TeamForm formData={formData} setFormData={setFormData} handleChange={handleChange} allErrors={allErrors} isEditable={isEditable} />
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
                onUpdateFlutterConfig={handleUpdateFlutterConfig}
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

          {activeTab === 'versions' && (
            <VersionHistoryTab
              miniAppId={id as string}
              miniAppName={formData.name || ''}
              appId={formData.appId}
              currentStatus={formData.status}
              teamTelegramChatId={formData.teamTelegramChatId}
              pendingRevision={formData.pendingRevision}
            />
          )}

          {activeTab === 'report' && (
            <ValidationReportTab miniApp={formData} onRefresh={() => fetchApp(false, true)} />
          )}

          {activeTab === 'activity' && (
            <ActivityTab miniAppId={id as string} />
          )}
        </div>

        {/* Save Changes Bottom Toolbar for Editable Modes */}
        {isEditable && activeTab !== 'report' && activeTab !== 'activity' && activeTab !== 'versions' && (
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSave(e, true)}
              disabled={isSubmitting}
              className="h-11 px-6 text-base font-semibold flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Save as Draft</span>
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSave(e, false)}
              disabled={isSubmitting}
              className="h-11 px-6 text-base font-semibold flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{isSubmitting ? 'Saving...' : 'Save & Submit Changes'}</span>
            </Button>
          </div>
        )}

        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          url={previewUrl}
          title={formData.name}
          version={
            formData.activeTestVersion ||
            latestTestVersion ||
            (formData as any).integrationConfig?.superAppTestVersion ||
            (formData.integrationConfigFlutter as any)?.packageVersion ||
            formData.integrationConfigFlutter?.versionConstraint ||
            (formData as any).version ||
            'v1.0.0'
          }
          apkUrl={`/api/download-apk?type=test&version=${encodeURIComponent(formData.activeTestVersion || latestTestVersion || (formData as any).integrationConfig?.superAppTestVersion || 'v0.3.7')}`}
          category={formData.category}
          appId={formData.appId}
          status={formData.status}
          buildCompletedAt={
            (formData as any).validationReport?.completedAt ||
            (formData as any).validationStages?.RELEASE_ASSEMBLY?.completedAt ||
            (formData as any).validationStages?.BUILD?.completedAt ||
            (formData as any).updatedAt
          }
          isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
        />
      </div>

      {/* Revision Submission Modal (What & Why for Active Mini Apps) */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-5 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Submit Revision for Review</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provide context for Super Admins to review your update</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  What was updated? (Release Notes / Changelog) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={revisionChangelog}
                  onChange={(e) => setRevisionChangelog(e.target.value)}
                  placeholder="e.g. Added biometric auth permission, updated endpoint to v2 API, upgraded dependencies..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Why is this change needed? (Business / Security Justification) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={revisionJustification}
                  onChange={(e) => setRevisionJustification(e.target.value)}
                  placeholder="e.g. Required to support quick fingerprint checkout on Super App client..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="leading-relaxed">
                  General Info edits apply instantly via <strong>Smart Fast-Track</strong>. Security or Build configuration changes will be safely staged for SA Admin approval while your live app continues running.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRevisionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setRevisionModalOpen(false);
                  await executeSave(false, revisionChangelog, revisionJustification);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Submit Revision</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Review Diff Modal */}
      {isReviewDiffOpen && (
        <RevisionReviewModal
          isOpen={isReviewDiffOpen}
          onClose={() => setIsReviewDiffOpen(false)}
          miniAppId={id as string}
          miniAppName={formData.name}
          onSuccess={() => {
            setIsReviewDiffOpen(false);
            fetchApp();
          }}
        />
      )}

      <SubmissionModal
        state={modalState}
        mode="manage"
        securityChecks={formData.securityChecks}
        integrationMethod={formData.integrationMethod}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onFixLater={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onRunInBackground={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onSuccessContinue={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          fetchApp();
        }}
      />

      {lifecycleReasonModal?.isOpen && (
        <ReasonPromptModal
          isOpen={lifecycleReasonModal.isOpen}
          title={lifecycleReasonModal.title}
          description={lifecycleReasonModal.description}
          placeholder={lifecycleReasonModal.placeholder}
          confirmText={lifecycleReasonModal.confirmText}
          confirmVariant={lifecycleReasonModal.confirmVariant}
          quickSuggestions={lifecycleReasonModal.quickSuggestions}
          isLoading={isSubmitting}
          onClose={() => setLifecycleReasonModal(null)}
          onConfirm={(reason) => {
            const action = lifecycleReasonModal.action;
            setLifecycleReasonModal(null);
            handleLifecycleAction(action, reason);
          }}
        />
      )}

      <BuildProgressModal
        state={buildModalState}
        onClose={() => {
          setBuildModalState((prev) => ({ ...prev, isOpen: false }));
          fetchApp();
        }}
        onRunInBackground={() => {
          setBuildModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onRetry={() => {
          setBuildModalState((prev) => ({ ...prev, isOpen: false }));
          handleLifecycleAction('start-testing');
        }}
        onOpenSandbox={openSandboxPreview}
      />
    </>
  );
}
