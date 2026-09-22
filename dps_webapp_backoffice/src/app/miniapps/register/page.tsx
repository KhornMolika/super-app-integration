"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/inputs';
import { Card, CardHeader } from '@/components/ui/card';
import PreviewModal from '@/components/ui/PreviewModal';
import SubmissionModal, { SubmissionModalState } from '@/components/ui/SubmissionModal';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import TeamForm from '@/components/forms/TeamForm';
import IntegrationForm, { generateClientVerificationToken, generateClientMiniAppId } from '@/components/forms/IntegrationForm';
import PermissionsForm, { formatCompliantPurpose, WHITELISTED_HOST_CAPABILITIES } from '@/components/forms/PermissionsForm';
import UnsupportedPermissionsModal from '@/components/forms/UnsupportedPermissionsModal';
import SecurityForm from '@/components/forms/SecurityForm';
import ReviewSummaryStep from '@/components/forms/ReviewSummaryStep';
import RegistrationWizardSteps from '@/components/forms/RegistrationWizardSteps';
import { validateMiniAppStep } from '@/lib/miniapp-form.validator';
import { validateUrlFormat } from '@/components/ui/ValidatedUrlInput';
import { CreateMiniAppDto, FlutterPackageConfigDto, IntegrationMethod, SourceType } from '@/types/miniapp.types';
import { miniappsApi, telegramApi } from '@/api';

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
    category: 'General Secretariat (which houses administrative units, including the FinTech Center)',
    organization: 'General Secretariat (which houses administrative units, including the FinTech Center)',
    organizationCode: 'FTC',
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
    verificationToken: generateClientVerificationToken(),
    integrationConfigWebView: {
      productionUrl: '',
      verificationToken: generateClientVerificationToken(),
    },
    integrationConfigFlutter: { sourceType: SourceType.ARTIFACT, packageName: '', versionConstraint: '' },
    integrationConfigDeepLink: { urlScheme: '', packageName: '', appStoreUrl: '' },
    permissions: [],
    securityChecks: [],
  });

  // Auto-populate owner & Telegram details from current user profile on mount
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
      } catch (err) {
        // Silently continue if network fails
      }
    };

    loadUserProfile();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<SubmissionModalState>({ isOpen: false, status: 'loading' });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [customPermission, setCustomPermission] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pendingArchiveFile, setPendingArchiveFile] = useState<File | null>(null);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

  const validateStep = async (currentStep: number) => {
    const result = await validateMiniAppStep(currentStep, {
      ...formData,
      pendingArchiveFile: pendingArchiveFile || undefined,
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

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    const payload = { ...formData };
    if (payload.integrationMethod !== IntegrationMethod.WEBVIEW) delete payload.integrationConfigWebView;
    if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) {
      delete payload.integrationConfigFlutter;
    } else if (pendingArchiveFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', pendingArchiveFile);
        if (payload.appId) uploadFormData.append('miniAppId', payload.appId);
        const ver = payload.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
        uploadFormData.append('version', ver);

        const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
        if (uploadRes && (uploadRes.success || uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl)) {
          payload.integrationConfigFlutter = {
            sourceType: payload.integrationConfigFlutter?.sourceType || SourceType.ARTIFACT,
            ...payload.integrationConfigFlutter,
            packageStoragePath: uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl,
            packageUrl: uploadRes.packageUrl,
            archiveChecksum: uploadRes.sha256 || payload.integrationConfigFlutter?.archiveChecksum,
          };
        }
      } catch (err) {
        console.error('Failed to upload archive to MinIO on draft save:', err);
      }
    }

    try {
      await miniappsApi.createDraft(payload);
      router.push('/miniapps');
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    setIsSubmitting(true);
    const valid = await validateStep(step);
    setIsSubmitting(false);
    if (valid) {
      if (step === 4) {
        const unsupported = (formData.permissions || []).filter(
          (p: any) => !WHITELISTED_HOST_CAPABILITIES.includes((p.type || '').toLowerCase())
        );
        if (unsupported.length > 0) {
          setShowUnsupportedModal(true);
          return;
        }
      }
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const handleDomainVerified = (data: any) => {
    const isVerified = Boolean(data.verified === true || data.isDomainVerified === true);
    setFormData((prev) => ({
      ...prev,
      isDomainVerified: isVerified,
      domainVerifiedAt: isVerified ? (data.domainVerifiedAt || new Date().toISOString()) : undefined,
      verificationToken: data.verificationToken || prev.verificationToken,
      integrationConfigWebView: {
        productionUrl: prev.integrationConfigWebView?.productionUrl || '',
        ...prev.integrationConfigWebView,
        verificationToken: data.verificationToken || prev.integrationConfigWebView?.verificationToken,
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

  useEffect(() => {
    if (formData.name && formData.name.trim()) {
      const generatedId = generateClientMiniAppId(formData.name);
      setFormData((prev) => ({ ...prev, appId: generatedId }));
    } else if (formData.appId !== '') {
      setFormData((prev) => ({ ...prev, appId: '' }));
    }
  }, [formData.name]);

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
  }, [formData.appId, formData.name, formData.ownerEmail, formData.supportEmail, formData.logo, formData.termsUrl, formData.privacyPolicyUrl]);

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
      formData.integrationMethod !== IntegrationMethod.DEEP_LINK &&
      key.startsWith('integrationConfigDeepLink')
    ) {
      return acc;
    }
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);
  const hasErrors = Object.keys(allErrors).length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'integrationMethod') {
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWebViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isUrlChange = e.target.name === 'productionUrl';
    setFormData((prev) => ({
      ...prev,
      isDomainVerified: isUrlChange ? false : prev.isDomainVerified,
      integrationConfigWebView: { ...prev.integrationConfigWebView!, [e.target.name]: e.target.value },
    }));
    if (isUrlChange && formData.integrationMethod === IntegrationMethod.WEBVIEW) {
      setLocalErrors((prev) => ({
        ...prev,
        'integrationConfigWebView.domainVerification':
          'Domain ownership has not been verified. Please host the verification association file and verify domain ownership before proceeding to the next step.',
      }));
    }
  };

  const handleFlutterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    extraData?: { archiveFile?: File; detectedPermissions?: any[] },
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
          ? extraData.detectedPermissions
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

  const handleDeepLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      integrationConfigDeepLink: { ...formData.integrationConfigDeepLink!, [e.target.name]: e.target.value } as any,
    });
  };

  const togglePermission = (type: string) => {
    const exists = formData.permissions?.find((p) => p.type === type);
    if (exists) {
      setFormData({ ...formData, permissions: formData.permissions?.filter((p) => p.type !== type) });
    } else {
      const defaultPurpose = formatCompliantPurpose(type, '', formData.name);
      setFormData({
        ...formData,
        permissions: [...(formData.permissions || []), { type, purpose: defaultPurpose, termsUrl: '' }],
      });
    }
  };

  const handlePermissionFieldChange = (type: string, field: string, value: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions?.map((p) => (p.type === type ? { ...p, [field]: value } : p)),
    });
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
    if (payload.integrationMethod !== IntegrationMethod.FLUTTER_PACKAGE) {
      delete payload.integrationConfigFlutter;
    } else if (pendingArchiveFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', pendingArchiveFile);
        if (payload.appId) uploadFormData.append('miniAppId', payload.appId);
        const ver = payload.integrationConfigFlutter?.versionConstraint?.replace(/^[\^~>=<]+/, '') || '1.0.0';
        uploadFormData.append('version', ver);

        const uploadRes = await miniappsApi.uploadArtifact(uploadFormData);
        if (uploadRes && (uploadRes.success || uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl)) {
          payload.integrationConfigFlutter = {
            sourceType: payload.integrationConfigFlutter?.sourceType || SourceType.ARTIFACT,
            ...payload.integrationConfigFlutter,
            packageStoragePath: uploadRes.packageStoragePath || uploadRes.minioKey || uploadRes.packageUrl,
            packageUrl: uploadRes.packageUrl,
            archiveChecksum: uploadRes.sha256 || payload.integrationConfigFlutter?.archiveChecksum,
          };
        }
      } catch (err) {
        console.error('Failed to upload archive to MinIO on submit:', err);
      }
    }
    if (payload.integrationMethod !== IntegrationMethod.DEEP_LINK) delete payload.integrationConfigDeepLink;

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

              const hasErrors =
                valStatusUpper === 'FAILED' ||
                (appData.validationErrors && Object.keys(appData.validationErrors).length > 0) ||
                (appData.issues && appData.issues.length > 0);

              if (hasErrors) {
                clearInterval(pollTimer);
                const displayErrors: Record<string, string> = { ...(appData.validationErrors || {}) };

                if (appData.validationReport?.findings?.length > 0) {
                  appData.validationReport.findings.forEach((finding: any) => {
                    const key = finding.title || finding.id || 'Security Finding';
                    displayErrors[key] = `${finding.description}${
                      finding.recommendation ? ' (Remediation: ' + finding.recommendation + ')' : ''
                    }`;
                  });
                }

                if (Array.isArray(appData.issues) && appData.issues.length > 0) {
                  appData.issues.forEach((iss: any, idx: number) => {
                    const key = iss.title || iss.classification || `Security Finding #${idx + 1}`;
                    if (!Object.values(displayErrors).some((val) => val.includes(iss.description))) {
                      displayErrors[key] = iss.description;
                    }
                  });
                }

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

                if (Object.keys(displayErrors).length === 0) {
                  displayErrors['Security Validation'] =
                    'Automated security scan failed on this endpoint. Please verify your URLs and TLS configuration.';
                }

                setModalState({
                  isOpen: true,
                  status: 'error',
                  message: 'Security audit identified blocking issues. Please review and resolve the flagged violations.',
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
          } catch (pollErr) {}
          if (attempts > 500) {
            clearInterval(pollTimer);
            setModalState({ isOpen: true, status: 'error', message: 'Validation timed out.', createdId: appId });
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
        message: Array.isArray(error?.message) ? undefined : error?.message || 'Failed to register mini app.',
        errors: errorsObj,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
        <div className="mb-8 flex items-center space-x-4">
          <Link
            href="/miniapps"
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
          >
            <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Register Mini App</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-base">Deploy a new service to the Super App gateway</p>
          </div>
        </div>

        {/* Wizard Step Progress */}
        <RegistrationWizardSteps currentStep={step} />

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 6) handleSubmit(e);
          }}
        >
          {step === 1 && (
            <Card>
              <CardHeader
                title="General Information"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
              <BasicInfoForm formData={formData} handleChange={handleChange} allErrors={allErrors} />
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader
                title="Team & Support"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                }
              />
              <TeamForm formData={formData} setFormData={setFormData} handleChange={handleChange} allErrors={allErrors} />
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader
                title="Technical Integration"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
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
              />
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader
                title="Native Permissions"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                    />
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
              />
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader
                title="Security Validation Profile"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                }
              />
              <SecurityForm
                formData={formData}
                setFormData={setFormData}
                allErrors={allErrors}
              />
            </Card>
          )}

          {step === 6 && (
            <Card>
              <CardHeader
                title="Review Registration"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
              <ReviewSummaryStep formData={formData} onEditStep={setStep} />
            </Card>
          )}

          <div className="flex justify-between space-x-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <Button type="button" variant="outline" className="h-11 px-6 text-base font-medium" onClick={step === 1 ? () => router.push('/miniapps') : prevStep}>
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 6 ? (
              <div className="flex space-x-3">
                <Button type="button" variant="outline" className="h-11 px-5 text-base font-medium" onClick={handleSaveDraft} disabled={isSubmitting}>
                  Save as Draft
                </Button>
                <Button type="button" className="h-11 px-6 text-base font-semibold" onClick={nextStep} disabled={isSubmitting}>
                  Next Step
                </Button>
              </div>
            ) : (
              <Button type="submit" className="h-11 px-6 text-base font-semibold" disabled={isSubmitting}>
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
          version={(formData.integrationConfigFlutter as any)?.packageVersion || formData.integrationConfigFlutter?.versionConstraint || 'v1.0.0'}
          category={formData.category}
          appId={formData.appId}
          status={(formData as any).status || 'DRAFT'}
          isFlutter={formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE}
        />
      </div>

      <UnsupportedPermissionsModal
        isOpen={showUnsupportedModal}
        unsupportedPermissions={(formData.permissions || []).filter(
          (p: any) => !WHITELISTED_HOST_CAPABILITIES.includes((p.type || '').toLowerCase())
        )}
        onConfirm={() => {
          setShowUnsupportedModal(false);
          setStep(5);
        }}
        onCancel={() => setShowUnsupportedModal(false)}
      />

      <SubmissionModal
        state={modalState}
        mode="register"
        securityChecks={formData.securityChecks}
        integrationMethod={formData.integrationMethod}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onFixLater={async () => {
          setModalState((prev) => ({ ...prev, status: 'loading' }));
          const payload = { ...formData };
          if (payload.integrationMethod !== 'WEBVIEW') delete payload.integrationConfigWebView;
          if (payload.integrationMethod !== 'FLUTTER_PACKAGE') delete payload.integrationConfigFlutter;

          try {
            await miniappsApi.createDraft(payload);
            setModalState({ isOpen: false, status: 'success' });
            router.push('/miniapps');
          } catch (e: any) {
            setModalState((prev) => ({ ...prev, status: 'error', message: e?.message || 'Failed to save draft' }));
          }
        }}
        onRunInBackground={() => {
          setModalState({ ...modalState, isOpen: false });
          router.push('/miniapps');
        }}
        onSuccessContinue={() => {}}
      />
    </>
  );
}
