'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { miniappsApi, superAppApi, unwrapItem } from '@/api';
import { toast } from '@/components/ui/Toast';
import { validateUrlFormat } from '@/components/ui/ValidatedUrlInput';
import { formatCompliantPurpose } from '@/components/forms/CapabilitiesForm';
import { IntegrationMethod, NativeSdkConfigDto, SourceType } from '@/types/miniapp.types';
import { SubmissionModalState } from '@/components/ui/SubmissionModal';
import { BuildProgressModalState } from '@/components/ui/BuildProgressModal';
import { MiniAppDetailFormData, INITIAL_MINIAPP_FORM_DATA } from '../types';

export function useMiniAppDetail(id: string, can: (permission: string) => boolean) {
  const router = useRouter();

  const [formData, setFormData] = useState<MiniAppDetailFormData>(INITIAL_MINIAPP_FORM_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const [isEditingUnlocked, setIsEditingUnlocked] = useState(false);
  const [latestTestVersion, setLatestTestVersion] = useState<string>('v0.0.1');
  const [pendingArchiveFile, setPendingArchiveFile] = useState<File | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [customPermission, setCustomPermission] = useState('');

  const [modalState, setModalState] = useState<SubmissionModalState>({ isOpen: false, status: 'loading' });
  const [buildModalState, setBuildModalState] = useState<BuildProgressModalState>({
    isOpen: false,
    status: 'building',
  });
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [isReviewDiffOpen, setIsReviewDiffOpen] = useState(false);

  // Field Validation & Uniqueness check
  useEffect(() => {
    const errors: Record<string, string> = {};
    if (formData.appId && !/^[a-z0-9_.-]+$/.test(formData.appId)) {
      errors.appId = 'MiniApp ID can only contain lowercase letters, numbers, and underscores (e.g. miniapp_8f32a1)';
    }
    if (formData.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Owner Email must be a valid email';
    }
    if (formData.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      errors.supportEmail = 'Support Email must be a valid email';
    }
    if (formData.name && formData.name.length < 2) {
      errors.name = 'MiniApp Name must be at least 2 characters';
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
          if (id) paramsToCheck.excludeId = id;

          if (paramsToCheck.appId || paramsToCheck.name) {
            const data = await miniappsApi.checkExists(paramsToCheck);
            if (data) {
              setLocalErrors((prev) => {
                const newErrors = { ...prev };
                if (data.appIdExists) newErrors.appId = 'This MiniApp ID is already taken.';
                if (data.nameExists) newErrors.name = 'This MiniApp Name is already taken.';
                return newErrors;
              });
            }
          }
        } catch (_) {}
      }, 600);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.appId, formData.name, formData.ownerEmail, formData.supportEmail, formData.logo, formData.integrationMethod, formData.integrationConfigWebView?.productionUrl, id]);

  // Aggregate active integration errors
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
    if (
      formData.integrationMethod !== IntegrationMethod.NATIVE_SDK &&
      key.startsWith('integrationConfigNativeSdk')
    ) {
      return acc;
    }
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);

  const hasErrors = Object.keys(allErrors).length > 0;
  const isEditable = can('miniapp:update') && isEditingUnlocked;

  // Fetch MiniApp Configuration
  const fetchApp = useCallback(async (isRetry = false, isSilent = false) => {
    if (!id || id === 'superapp') return;
    if (!isSilent) setIsLoading(true);
    if (!isRetry) setFetchError(null);

    try {
      const raw = await miniappsApi.getById(id);
      const data = unwrapItem(raw);
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
          integrationConfigNativeSdk: activeOrRev.integrationMethod === IntegrationMethod.NATIVE_SDK ? (activeOrRev.integrationConfig || {}) : {
            iosModuleName: '',
            iosTypeName: '',
            iosArtifactFilename: '',
            androidPackageName: '',
            androidObjectName: '',
            androidArtifactFilename: '',
            androidMavenGroupId: '',
            androidMavenArtifactId: '',
            androidMavenVersion: '',
          },
        });

        // Ecosystem test version
        try {
          const eco = await superAppApi.getEcosystemStatus();
          if (eco && (eco.superAppTestVersion || eco.superAppVersion)) {
            setLatestTestVersion(eco.superAppTestVersion || eco.superAppVersion);
          }
        } catch (_) {}

        // Auto-open Sandbox Preview if query param indicates
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
              const nexusBase = (process.env.NEXT_PUBLIC_NEXUS_URL || 'http://localhost:8081').replace(/\/+$/, '');
              const target =
                conf?.sourceType === SourceType.GIT
                  ? conf.gitUrl || ''
                  : `${nexusBase}/repository/pub-group/api/packages/${conf?.packageName || 'ma_flutter_trust_regulator'}`;
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
        setFetchError('MiniApp not found or failed to load configuration.');
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
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // Polling for automated builds
  useEffect(() => {
    const isBuilding =
      (formData.status === 'BUILDING' && formData.buildStatus !== 'FAILED') ||
      (buildModalState.isOpen && buildModalState.status === 'building');
    if (!isBuilding) return;

    const pollInterval = setInterval(async () => {
      if (isSubmitting) return;

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

            const isCurrentlyBuilding =
              updated.status === 'BUILDING' ||
              updated.buildStatus === 'BUILDING' ||
              (updated.buildStages && Object.values(updated.buildStages).some((s: any) => s?.status === 'RUNNING'));

            if (isCurrentlyBuilding) {
              return {
                ...prev,
                status: 'building',
                stages: updated.buildStages || prev.stages,
                releaseVersion: updated.activeTestVersion || prev.releaseVersion,
              };
            }

            const isSuccess = updated.status === 'TESTING' || updated.buildStatus === 'COMPLETED';
            const isFailed =
              updated.status === 'BUILD_FAILED' ||
              updated.buildStatus === 'FAILED' ||
              (updated.buildStages && Object.values(updated.buildStages).some((s: any) => s?.status === 'FAILED'));

            return {
              ...prev,
              status: isSuccess ? 'success' : isFailed ? 'error' : prev.status,
              stages: updated.buildStages || prev.stages,
              errorMessage: updated.buildError || prev.errorMessage,
              releaseVersion: updated.activeTestVersion || prev.releaseVersion,
            };
          });
        }
      } catch (_) {}
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [formData.status, formData.buildStatus, buildModalState.isOpen, isSubmitting, id]);

  // Form field change handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;

    if (fieldName === 'organization' || fieldName === 'category') {
      setFormData((prev) => ({
        ...prev,
        organization: fieldValue,
        category: fieldValue,
      }));
      return;
    }
    if (fieldName === 'organizationCode') {
      setFormData((prev) => ({
        ...prev,
        organizationCode: fieldValue,
      }));
      return;
    }
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

  const handleFlutterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleNativeSdkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        delete nextValidationErrors[`integrationConfigNativeSdk.${name}`];
      }
      return {
        ...prev,
        integrationConfigNativeSdk: { ...(prev.integrationConfigNativeSdk as any), [name]: value },
        validationErrors: nextValidationErrors,
      };
    });
    setLocalErrors((prev) => {
      const next = { ...prev };
      delete next[`integrationConfigNativeSdk.${name}`];
      return next;
    });
  };

  const handleUpdateNativeSdkConfig = (
    updates: Partial<NativeSdkConfigDto>,
    extraData?: { iosFile?: File; androidFile?: File; detectedPermissions?: any[] },
  ) => {
    setFormData((prev: any) => {
      const nextValidationErrors = prev.validationErrors ? { ...prev.validationErrors } : undefined;
      if (nextValidationErrors) {
        Object.keys(updates).forEach((k) => {
          delete nextValidationErrors[`integrationConfigNativeSdk.${k}`];
        });
      }
      const nextSdk = {
        ...(prev.integrationConfigNativeSdk || {}),
        ...updates,
      };
      const nextPermissions =
        extraData?.detectedPermissions && extraData.detectedPermissions.length > 0
          ? [
              ...(prev.permissions || []).filter(
                (p: any) => !extraData.detectedPermissions!.some((dp) => dp.type === p.type),
              ),
              ...extraData.detectedPermissions,
            ]
          : prev.permissions;

      return {
        ...prev,
        integrationConfigNativeSdk: nextSdk,
        permissions: nextPermissions,
        validationErrors: nextValidationErrors,
      };
    });

    setLocalErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((key) => {
        delete next[`integrationConfigNativeSdk.${key}`];
      });
      return next;
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

  const executeSave = async (isDraftOnly = false, changelog?: string, justification?: string) => {
    setIsSubmitting(true);
    if (!isDraftOnly) {
      setModalState({ isOpen: true, status: 'loading' });
    }

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
    } else if (formData.integrationMethod === IntegrationMethod.NATIVE_SDK) {
      payload.integrationConfigNativeSdk = formData.integrationConfigNativeSdk;
    }

    try {
      const resData = await miniappsApi.update(id, payload);

      if (resData) {
        if (isDraftOnly) {
          toast.success('Draft saved successfully.', 'Draft Saved');
          setIsSubmitting(false);
          setIsEditingUnlocked(false);
          fetchApp();
          return;
        }

        if (resData.isFastTrack) {
          toast.success('General information updated live instantly (Fast-Track applied).', 'Updated Live');
          setModalState({ isOpen: false, status: 'success' });
          setIsSubmitting(false);
          setIsEditingUnlocked(false);
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
                integrationConfigNativeSdk: appData.integrationMethod === IntegrationMethod.NATIVE_SDK ? appData.integrationConfig : prev.integrationConfigNativeSdk,
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
                setIsEditingUnlocked(false);
                fetchApp();
              }
            }
          } catch (_) {}

          if (attempts >= 15) {
            clearInterval(pollTimer);
            setModalState({ isOpen: false, status: 'success' });
            setIsSubmitting(false);
            setIsEditingUnlocked(false);
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

  const openSandboxPreview = () => {
    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      setPreviewUrl(formData.integrationConfigWebView?.productionUrl || '');
    } else if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
      setPreviewUrl(formData.integrationConfigDeepLink?.urlScheme || (formData as any).integrationConfig?.urlScheme || 'app://open');
    } else {
      const conf = formData.integrationConfigFlutter;
      const nexusBase = (process.env.NEXT_PUBLIC_NEXUS_URL || 'http://localhost:8081').replace(/\/+$/, '');
      const target = conf?.sourceType === SourceType.GIT
        ? conf.gitUrl || ''
        : `${nexusBase}/repository/pub-group/api/packages/${conf?.packageName || 'ma_flutter_trust_regulator'}`;
      setPreviewUrl(target);
    }
    setShowPreview(true);
  };

  return {
    formData,
    setFormData,
    isLoading,
    isSubmitting,
    setIsSubmitting,
    fetchError,
    fetchApp,
    allErrors,
    hasErrors,
    isEditable,
    isEditingUnlocked,
    setIsEditingUnlocked,
    latestTestVersion,
    showPreview,
    setShowPreview,
    previewUrl,
    customPermission,
    setCustomPermission,
    modalState,
    setModalState,
    buildModalState,
    setBuildModalState,
    revisionModalOpen,
    setRevisionModalOpen,
    isReviewDiffOpen,
    setIsReviewDiffOpen,
    handleChange,
    handleWebViewChange,
    handleFlutterChange,
    handleUpdateFlutterConfig,
    handleDeepLinkChange,
    handleNativeSdkChange,
    handleUpdateNativeSdkConfig,
    togglePermission,
    handleDomainVerified,
    handlePermissionFieldChange,
    handleSave,
    executeSave,
    openSandboxPreview,
  };
}
