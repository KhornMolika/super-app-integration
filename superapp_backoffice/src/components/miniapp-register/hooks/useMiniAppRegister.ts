'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/components/ui/SidebarContext';
import {
  CreateMiniAppDto,
  FlutterPackageConfigDto,
  NativeSdkConfigDto,
  IntegrationMethod,
  SourceType,
} from '@/types/miniapp.types';
import { miniappsApi, telegramApi } from '@/api';
import { permissionsApi } from '@/api/permissions.api';
import { toast } from '@/components/ui/Toast';
import { SubmissionModalState } from '@/components/ui/SubmissionModal';
import { validateMiniAppStep } from '@/lib/miniapp-form.validator';
import { validateUrlFormat } from '@/components/ui/ValidatedUrlInput';
import {
  deriveNativeSdkDefaults,
  generateClientSlug,
} from '@/components/forms/IntegrationForm';
import {
  formatCompliantPurpose,
  normalizeCapabilityKey,
  WHITELISTED_HOST_CAPABILITIES,
} from '@/components/forms/CapabilitiesForm';
import { getInitialRegisterFormData } from '../constants';
import {
  prepareDraftPayload,
  prepareSubmitPayload,
  extractValidationErrors,
} from '../utils/registerPayload.utils';
import {
  isStepRequiredInfoComplete,
  getStepsCompletionMap,
} from '../utils/stepValidation.utils';

export function useMiniAppRegister() {
  const router = useRouter();
  const { can, user } = useAuth();
  const searchParams = useSearchParams();
  const { setCompletedWizardSteps } = useSidebar();

  // Permission guard
  useEffect(() => {
    if (!can('miniapp:create')) {
      router.push('/miniapps');
    }
  }, [can, router]);

  const [formData, setFormData] = useState<Partial<CreateMiniAppDto>>(getInitialRegisterFormData());

  // Step state with query parameter synchronization
  const stepQuery = searchParams?.get('step');
  const parsedStep = stepQuery ? parseInt(stepQuery, 10) : 1;
  const initialStep = !isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 6 ? parsedStep : 1;
  const [step, setStepState] = useState(initialStep);
  const [maxVisitedStep, setMaxVisitedStep] = useState(initialStep);

  const setStep = (newStep: number | ((prev: number) => number)) => {
    setStepState((prev) => {
      const resolved = typeof newStep === 'function' ? newStep(prev) : newStep;
      const clamped = Math.max(1, Math.min(6, resolved));

      // Guard: do not allow advancing if any previous step is incomplete
      if (clamped > 1) {
        for (let s = 1; s < clamped; s++) {
          if (!isStepRequiredInfoComplete(s, formData, pendingArchiveFile)) {
            toast.warning(`Please complete Step ${s} before proceeding.`, 'Required Info Missing');
            router.replace(`/miniapps/register?step=${s}`, { scroll: false });
            return s;
          }
        }
      }

      setMaxVisitedStep((oldMax) => Math.max(oldMax, clamped));
      router.replace(`/miniapps/register?step=${clamped}`, { scroll: false });
      return clamped;
    });
  };

  useEffect(() => {
    if (stepQuery) {
      const p = parseInt(stepQuery, 10);
      if (!isNaN(p) && p >= 1 && p <= 6 && p !== step) {
        setStepState(p);
        setMaxVisitedStep((oldMax) => Math.max(oldMax, p));
      }
    }
  }, [stepQuery]);

  // Modal and submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<SubmissionModalState>({
    isOpen: false,
    status: 'loading',
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [customPermission, setCustomPermission] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pendingArchiveFile, setPendingArchiveFile] = useState<File | null>(null);
  const [pendingIosFile, setPendingIosFile] = useState<File | null>(null);
  const [pendingAndroidFile, setPendingAndroidFile] = useState<File | null>(null);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

  // Step completion calculation
  const completionMap = useMemo(() => {
    return getStepsCompletionMap(formData, pendingArchiveFile, maxVisitedStep);
  }, [formData, pendingArchiveFile, maxVisitedStep]);

  // Check if all required info for current step is completed
  const isCurrentStepComplete = useMemo(() => {
    return isStepRequiredInfoComplete(step, formData, pendingArchiveFile);
  }, [step, formData, pendingArchiveFile]);

  // Synchronize completed steps to the sidebar navigation
  useEffect(() => {
    setCompletedWizardSteps(completionMap);
  }, [completionMap, setCompletedWizardSteps]);

  // Ensure user cannot stay on an advanced step if previous steps become incomplete
  useEffect(() => {
    if (step > 1) {
      for (let s = 1; s < step; s++) {
        if (!isStepRequiredInfoComplete(s, formData, pendingArchiveFile)) {
          setStepState(s);
          router.replace(`/miniapps/register?step=${s}`, { scroll: false });
          break;
        }
      }
    }
  }, [step, formData, pendingArchiveFile, router]);

  // Auto-populate owner & Telegram details from telegram profile and auth user
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const data = await telegramApi.getStatus();
        if (data && data.user) {
          setFormData((prev) => ({
            ...prev,
            ownerName: prev.ownerName || data.user?.name || '',
            ownerEmail: prev.ownerEmail || data.user?.email || '',
            supportEmail: prev.supportEmail || data.user?.email || '',
            teamTelegramChatId:
              prev.teamTelegramChatId ||
              data.user?.teamTelegramChatId ||
              data.user?.telegramChatId ||
              '',
          }));
        }
      } catch (_) {}
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    if (user) {
      const userOrg = user.organization;
      const userOrgName = typeof userOrg === 'string' ? userOrg : userOrg?.name || '';
      const userOrgCode = typeof userOrg === 'object' ? userOrg?.code || '' : '';

      setFormData((prev) => ({
        ...prev,
        ownerName: prev.ownerName || user.name || '',
        ownerEmail: prev.ownerEmail || user.email || '',
        supportEmail: prev.supportEmail || user.email || '',
        organization: prev.organization || userOrgName,
        organizationCode: prev.organizationCode || userOrgCode,
        category: prev.category || userOrgName,
      }));
    }
  }, [user]);

  // Auto-derive Slug from MiniApp Name
  useEffect(() => {
    if (formData.name && formData.name.trim()) {
      const generatedSlug = generateClientSlug(formData.name);
      setFormData((prev) => ({
        ...prev,
        slug: generatedSlug,
        appId: prev.appId || `com.fsa.${generatedSlug.replace(/-/g, '_')}`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, slug: '' }));
    }
  }, [formData.name]);

  // Auto-Detection Bridge: Wire package-to-app_id detection directly into Integration step
  useEffect(() => {
    let detectedId = '';
    if (formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE) {
      detectedId = formData.integrationConfigFlutter?.packageName?.trim() || '';
    } else if (formData.integrationMethod === IntegrationMethod.NATIVE_SDK) {
      detectedId =
        (
          formData.integrationConfigNativeSdk?.androidPackageName ||
          formData.integrationConfigNativeSdk?.iosModuleName
        )?.trim() || '';
    } else if (formData.integrationMethod === IntegrationMethod.DEEP_LINK) {
      detectedId =
        (
          formData.integrationConfigDeepLink?.packageName ||
          formData.integrationConfigDeepLink?.urlScheme
        )?.trim() || '';
    } else if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      if (formData.slug) {
        detectedId = `com.fsa.${formData.slug.replace(/-/g, '_')}`;
      }
    }

    if (detectedId && detectedId !== formData.appId) {
      setFormData((prev) => ({
        ...prev,
        appId: detectedId,
      }));
    }
  }, [
    formData.integrationMethod,
    formData.integrationConfigFlutter?.packageName,
    formData.integrationConfigNativeSdk?.androidPackageName,
    formData.integrationConfigNativeSdk?.iosModuleName,
    formData.integrationConfigDeepLink?.packageName,
    formData.integrationConfigDeepLink?.urlScheme,
    formData.slug,
  ]);

  // Real-time client side field validation & uniqueness checking
  useEffect(() => {
    const errors: Record<string, string> = {};
    if (formData.appId && !/^[a-z0-9_.-]+$/.test(formData.appId)) {
      errors.appId =
        'MiniApp ID can only contain lowercase letters, numbers, and underscores (e.g. miniapp_8f32a1)';
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

    if (
      formData.integrationMethod === IntegrationMethod.WEBVIEW &&
      formData.integrationConfigWebView?.productionUrl
    ) {
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
              /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(
                window.location.hostname
              ))));

      if (!isDev) {
        if (!prodUrl.startsWith('https://')) {
          errors['integrationConfigWebView.productionUrl'] =
            'Production URL must use HTTPS in PROD mode.';
        } else if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
          errors['integrationConfigWebView.productionUrl'] =
            'Production URL cannot be localhost in PROD mode.';
        }
      }
    }

    if (formData.termsUrl && formData.termsUrl.trim()) {
      const v = validateUrlFormat(formData.termsUrl, 'Terms of Service URL', true);
      if (!v.valid && v.error) {
        errors.termsUrl = v.error;
      }
    }

    if (formData.privacyPolicyUrl && formData.privacyPolicyUrl.trim()) {
      const v = validateUrlFormat(formData.privacyPolicyUrl, 'Privacy Policy URL', true);
      if (!v.valid && v.error) {
        errors.privacyPolicyUrl = v.error;
      }
    }

    setLocalErrors(errors);

    if (formData.appId || formData.name) {
      const timeoutId = setTimeout(async () => {
        try {
          const paramsToCheck: { appId?: string; name?: string } = {};
          if (formData.appId && !errors.appId) paramsToCheck.appId = formData.appId;
          if (formData.name && !errors.name) paramsToCheck.name = formData.name;

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
  }, [
    formData.appId,
    formData.name,
    formData.ownerEmail,
    formData.supportEmail,
    formData.logo,
    formData.termsUrl,
    formData.privacyPolicyUrl,
  ]);

  // Aggregate errors based on active integration method
  const allRawErrors = { ...localErrors, ...(modalState.errors || {}) };
  const allErrors = Object.entries(allRawErrors).reduce((acc, [key, val]) => {
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
      formData.integrationMethod !== IntegrationMethod.NATIVE_SDK &&
      key.startsWith('integrationConfigNativeSdk')
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

  // Handlers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'organization' || name === 'category') {
      setFormData((prev) => ({
        ...prev,
        organization: value,
        category: value,
      }));
      return;
    }
    if (name === 'organizationCode') {
      setFormData((prev) => ({
        ...prev,
        organizationCode: value,
      }));
      return;
    }
    if (name === 'integrationMethod') {
      const newMethod = value;
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
      if (newMethod === IntegrationMethod.NATIVE_SDK) {
        setFormData((prev) => {
          const existing: Partial<NativeSdkConfigDto> = prev.integrationConfigNativeSdk || {};
          if (!existing.iosModuleName && !existing.androidPackageName) {
            const defaults = deriveNativeSdkDefaults(
              prev.name,
              prev.appId,
              prev.organization || prev.teamName,
              prev.organizationCode
            );
            const nextSdk: Partial<NativeSdkConfigDto> = {
              ...existing,
              iosModuleName: existing.iosModuleName || defaults.iosModuleName,
              iosTypeName: existing.iosTypeName || defaults.iosTypeName,
              androidMavenGroupId: existing.androidMavenGroupId || defaults.androidMavenGroupId,
              androidMavenArtifactId:
                existing.androidMavenArtifactId || defaults.androidMavenArtifactId,
              androidMavenVersion: existing.androidMavenVersion || defaults.androidMavenVersion,
              androidPackageName: existing.androidPackageName || defaults.androidPackageName,
              androidObjectName: existing.androidObjectName || defaults.androidObjectName,
            };
            return {
              ...prev,
              integrationMethod: newMethod as IntegrationMethod,
              integrationConfigNativeSdk: nextSdk as NativeSdkConfigDto,
            };
          }
          return { ...prev, integrationMethod: newMethod as IntegrationMethod };
        });
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWebViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isUrlChange = e.target.name === 'productionUrl';
    setFormData((prev) => ({
      ...prev,
      isDomainVerified: isUrlChange ? false : prev.isDomainVerified,
      integrationConfigWebView: {
        ...prev.integrationConfigWebView!,
        [e.target.name]: e.target.value,
      },
    }));
    if (isUrlChange && formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      setLocalErrors((prev) => ({
        ...prev,
        'integrationConfigWebView.domainVerification':
          'Domain ownership has not been verified. Please host the verification association file and verify domain ownership before proceeding to the next step.',
      }));
    }
  };

  const handleFlutterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      integrationConfigFlutter: { ...prev.integrationConfigFlutter!, [name]: value },
    }));
    setLocalErrors((prev) => {
      const next = { ...prev };
      delete next[`integrationConfigFlutter.${name}`];
      return next;
    });
  };

  const handleUpdateFlutterConfig = (
    updates: Partial<FlutterPackageConfigDto>,
    extraData?: { archiveFile?: File; detectedPermissions?: any[] }
  ) => {
    if (extraData?.archiveFile) {
      setPendingArchiveFile(extraData.archiveFile);
    }
    setFormData((prev) => {
      const nextFlutter: FlutterPackageConfigDto = {
        sourceType: SourceType.ARTIFACT,
        ...(prev.integrationConfigFlutter || {}),
        ...updates,
      };
      const nextPermissions =
        extraData?.detectedPermissions && extraData.detectedPermissions.length > 0
          ? extraData.detectedPermissions.map((p: any) => ({
              ...p,
              purpose: formatCompliantPurpose(p.type, p.purpose, prev.name),
            }))
          : prev.permissions;

      return {
        ...prev,
        integrationConfigFlutter: nextFlutter,
        permissions: nextPermissions,
      };
    });

    setLocalErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((key) => {
        delete next[`integrationConfigFlutter.${key}`];
      });
      return next;
    });
  };

  const handleNativeSdkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      integrationConfigNativeSdk: { ...prev.integrationConfigNativeSdk!, [name]: value } as any,
    }));
    setLocalErrors((prev) => {
      const next = { ...prev };
      delete next[`integrationConfigNativeSdk.${name}`];
      return next;
    });
  };

  const handleUpdateNativeSdkConfig = (
    updates: Partial<NativeSdkConfigDto>,
    extraData?: { iosFile?: File; androidFile?: File; detectedPermissions?: any[] }
  ) => {
    if (extraData?.iosFile) setPendingIosFile(extraData.iosFile);
    if (extraData?.androidFile) setPendingAndroidFile(extraData.androidFile);

    setFormData((prev) => {
      const nextSdk: NativeSdkConfigDto = {
        ...(prev.integrationConfigNativeSdk as NativeSdkConfigDto),
        ...updates,
      };
      const mappedIncoming = (extraData?.detectedPermissions || []).map((p: any) => ({
        ...p,
        purpose: formatCompliantPurpose(p.type, p.purpose, prev.name),
      }));
      const nextPermissions =
        mappedIncoming.length > 0
          ? [
              ...(prev.permissions || []).filter(
                (p) => !mappedIncoming.some((dp) => dp.type === p.type)
              ),
              ...mappedIncoming,
            ]
          : prev.permissions;

      return {
        ...prev,
        integrationConfigNativeSdk: nextSdk,
        permissions: nextPermissions,
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

  const handleDeepLinkChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      integrationConfigDeepLink: {
        ...formData.integrationConfigDeepLink!,
        [e.target.name]: e.target.value,
      } as any,
    });
  };

  const togglePermission = (type: string) => {
    const canon = normalizeCapabilityKey(type);
    const exists = formData.permissions?.find(
      (p) => normalizeCapabilityKey(p.type) === canon
    );
    if (exists) {
      setFormData({
        ...formData,
        permissions: formData.permissions?.filter(
          (p) => normalizeCapabilityKey(p.type) !== canon
        ),
      });
    } else {
      const defaultPurpose = formatCompliantPurpose(type, '', formData.name);
      setFormData({
        ...formData,
        permissions: [
          ...(formData.permissions || []),
          { type, purpose: defaultPurpose, termsUrl: '' },
        ],
      });
    }
  };

  const handlePermissionFieldChange = (type: string, field: string, value: string) => {
    const canon = normalizeCapabilityKey(type);
    setFormData({
      ...formData,
      permissions: formData.permissions?.map((p) =>
        normalizeCapabilityKey(p.type) === canon ? { ...p, [field]: value } : p
      ),
    });
  };

  const handleDomainVerified = (data: any) => {
    const isVerified = Boolean(data.verified === true || data.isDomainVerified === true);
    setFormData((prev) => ({
      ...prev,
      isDomainVerified: isVerified,
      domainVerifiedAt: isVerified ? data.domainVerifiedAt || new Date().toISOString() : undefined,
      verificationToken: data.verificationToken || prev.verificationToken,
      integrationConfigWebView: {
        productionUrl: prev.integrationConfigWebView?.productionUrl || '',
        ...prev.integrationConfigWebView,
        verificationToken:
          data.verificationToken || prev.integrationConfigWebView?.verificationToken,
        allowedDomains:
          data.allowedDomains && Array.isArray(data.allowedDomains)
            ? data.allowedDomains.join(', ')
            : prev.integrationConfigWebView?.allowedDomains || '',
      },
    }));
    if (formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      setLocalErrors((prev) => {
        const next = { ...prev };
        if (isVerified) {
          delete next['integrationConfigWebView.domainVerification'];
        } else {
          next['integrationConfigWebView.domainVerification'] =
            'Domain ownership has not been verified. Please host the verification association file and verify domain ownership before proceeding to the next step.';
        }
        return next;
      });
    }
  };

  const validateStep = async (currentStep: number) => {
    const result = await validateMiniAppStep(currentStep, {
      ...formData,
      pendingArchiveFile: pendingArchiveFile || undefined,
      pendingIosFile: pendingIosFile || undefined,
      pendingAndroidFile: pendingAndroidFile || undefined,
    } as any);
    if (!result.isValid) {
      setLocalErrors((prev) => ({ ...prev, ...result.errors }));
    } else {
      setLocalErrors((prev) => {
        const next = { ...prev };
        Object.keys(result.errors).forEach((k) => delete next[k]);
        return next;
      });
      if (result.detectedPermissions) {
        setFormData((prev) => ({ ...prev, permissions: result.detectedPermissions }));
      }
    }
    return result.isValid;
  };

  const nextStep = async () => {
    if (!isCurrentStepComplete) {
      toast.warning('Please complete all required fields before proceeding to the next step.', 'Required Info Missing');
      await validateStep(step);
      return;
    }
    setIsSubmitting(true);
    const valid = await validateStep(step);
    setIsSubmitting(false);
    if (valid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    const payload = await prepareDraftPayload(formData, pendingArchiveFile);

    try {
      await miniappsApi.createDraft(payload);
      router.push('/miniapps');
    } catch (_) {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    for (let s = 1; s <= 5; s++) {
      const valid = await validateStep(s);
      if (!valid) {
        setIsSubmitting(false);
        setStep(s);
        return;
      }
    }

    setModalState((prev) => ({ isOpen: true, status: 'loading', createdId: prev.createdId }));
    const payload = await prepareSubmitPayload(formData, pendingArchiveFile);

    try {
      const resData = modalState.createdId
        ? await miniappsApi.update(modalState.createdId, payload)
        : await miniappsApi.create(payload);

      if (resData) {
        const appId = modalState.createdId || resData.id;
        let attempts = 0;

        const pollTimer = setInterval(async () => {
          attempts++;
          try {
            const appData = await miniappsApi.getById(appId);
            if (appData) {
              if (appData.validationStages) {
                setModalState((prev) => ({
                  ...prev,
                  stages: appData.validationStages,
                }));
              }

              const statusUpper = (appData.status || '').toUpperCase();
              const valStatusUpper = (appData.validationStatus || '').toUpperCase();

              if (statusUpper === 'PROCESSING' || valStatusUpper === 'RUNNING') {
                return;
              }

              const hasValidationIssues =
                valStatusUpper === 'FAILED' ||
                (appData.validationErrors && Object.keys(appData.validationErrors).length > 0) ||
                (appData.issues && appData.issues.length > 0);

              if (hasValidationIssues) {
                clearInterval(pollTimer);
                const displayErrors = extractValidationErrors(appData);

                setModalState({
                  isOpen: true,
                  status: 'error',
                  message:
                    'Security audit identified blocking issues. Please review and resolve the flagged violations.',
                  errors: displayErrors,
                  createdId: appId,
                });
                setIsSubmitting(false);
              } else {
                clearInterval(pollTimer);
                setModalState({ isOpen: true, status: 'success' });
                setTimeout(() => router.push(`/miniapps/${appId}`), 1200);
              }
            }
          } catch (_) {}

          if (attempts > 500) {
            clearInterval(pollTimer);
            setModalState({
              isOpen: true,
              status: 'error',
              message: 'Validation timed out.',
              createdId: appId,
            });
            setIsSubmitting(false);
          }
        }, 600);
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
        message: Array.isArray(error?.message)
          ? undefined
          : error?.message || 'Failed to register mini app.',
        errors: errorsObj,
      });
      setIsSubmitting(false);
    }
  };

  const handleConfirmUnsupported = async () => {
    const unsupported = (formData.permissions || []).filter(
      (p: any) => !WHITELISTED_HOST_CAPABILITIES.includes(normalizeCapabilityKey(p.type || ''))
    );
    for (const perm of unsupported) {
      try {
        await permissionsApi.createProposal({
          permissionKey: perm.type,
          permissionName: perm.type,
          description:
            perm.purpose || `Capability requested for MiniApp "${formData.name || 'Draft MiniApp'}"`,
          metadata: {
            miniAppName: formData.name,
            miniAppId: formData.appId,
            purpose: perm.purpose,
            requestedSource: 'MINIAPP_REGISTRATION_WIZARD',
          },
        });
      } catch (e) {
        console.warn('Failed to auto-create permission proposal on proceed:', e);
      }
    }
    toast.success('Capability proposal submitted! Admins can now review and inject code.');
    setShowUnsupportedModal(false);
    setStep(5);
  };

  const handleFixLater = async () => {
    setModalState((prev) => ({ ...prev, status: 'loading' }));
    const payload = { ...formData };
    if (payload.integrationMethod !== 'WEBVIEW') delete payload.integrationConfigWebView;
    if (payload.integrationMethod !== 'FLUTTER_PACKAGE') delete payload.integrationConfigFlutter;

    try {
      await miniappsApi.createDraft(payload);
      setModalState({ isOpen: false, status: 'success' });
      router.push('/miniapps');
    } catch (e: any) {
      setModalState((prev) => ({
        ...prev,
        status: 'error',
        message: e?.message || 'Failed to save draft',
      }));
    }
  };

  return {
    formData,
    setFormData,
    step,
    setStep,
    nextStep,
    prevStep,
    isCurrentStepComplete,
    completionMap,
    maxVisitedStep,
    isSubmitting,
    setIsSubmitting,
    modalState,
    setModalState,
    localErrors,
    allErrors,
    hasErrors,
    customPermission,
    setCustomPermission,
    showPreview,
    setShowPreview,
    previewUrl,
    setPreviewUrl,
    showUnsupportedModal,
    setShowUnsupportedModal,
    handleChange,
    handleWebViewChange,
    handleFlutterChange,
    handleUpdateFlutterConfig,
    handleNativeSdkChange,
    handleUpdateNativeSdkConfig,
    handleDeepLinkChange,
    handleDomainVerified,
    togglePermission,
    handlePermissionFieldChange,
    handleSaveDraft,
    handleSubmit,
    handleConfirmUnsupported,
    handleFixLater,
  };
}
