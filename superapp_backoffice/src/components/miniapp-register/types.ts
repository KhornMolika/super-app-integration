import React from 'react';
import {
  CreateMiniAppDto,
  FlutterPackageConfigDto,
  NativeSdkConfigDto,
} from '@/types/miniapp.types';
import { SubmissionModalState } from '@/components/ui/SubmissionModal';

export type RegisterWizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface RegisterWizardHeaderProps {
  step: number;
  stepTitle: string;
  stepDescription: string;
  miniAppName?: string;
}

export interface RegisterWizardBottomBarProps {
  step: number;
  isSubmitting: boolean;
  onCancelOrBack: () => void;
  onSaveDraft: () => void;
  onNextStep: () => void;
}

export interface RegisterWizardStepContentProps {
  step: number;
  formData: Partial<CreateMiniAppDto>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<CreateMiniAppDto>>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  allErrors: Record<string, string>;
  handleWebViewChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFlutterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onUpdateFlutterConfig: (
    updates: Partial<FlutterPackageConfigDto>,
    extraData?: { archiveFile?: File; detectedPermissions?: any[] }
  ) => void;
  handleNativeSdkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateNativeSdkConfig: (
    updates: Partial<NativeSdkConfigDto>,
    extraData?: { iosFile?: File; androidFile?: File; detectedPermissions?: any[] }
  ) => void;
  handleDeepLinkChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onDomainVerified: (data: any) => void;
  togglePermission: (type: string) => void;
  handlePermissionFieldChange: (type: string, field: string, value: string) => void;
  customPermission: string;
  setCustomPermission: React.Dispatch<React.SetStateAction<string>>;
  setStep: (step: number | ((prev: number) => number)) => void;
}

export interface RegisterModalsProps {
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  previewUrl: string;
  formData: Partial<CreateMiniAppDto>;
  showUnsupportedModal: boolean;
  setShowUnsupportedModal: (show: boolean) => void;
  modalState: SubmissionModalState;
  setModalState: React.Dispatch<React.SetStateAction<SubmissionModalState>>;
  onConfirmUnsupported: () => Promise<void>;
  onFixLater: () => Promise<void>;
}
