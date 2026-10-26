'use client';

import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import BasicInfoForm from '@/components/forms/BasicInfoForm';
import LegalPolicyForm from '@/components/forms/LegalPolicyForm';
import TeamForm from '@/components/forms/TeamForm';
import IntegrationForm from '@/components/forms/IntegrationForm';
import CapabilitiesForm from '@/components/forms/CapabilitiesForm';
import VersionHistoryTab from '@/components/miniapp-detail/VersionHistoryTab';
import ValidationReportTab from '@/components/ui/ValidationReportTab';
import ActivityTab from '@/components/ui/ActivityTab';
import type { MiniAppTabType } from '@/components/miniapp-detail/MiniAppDetailTabs';
import { MiniAppDetailFormData } from './types';
import { NativeSdkConfigDto } from '@/types/miniapp.types';

interface MiniAppSectionContentProps {
  activeTab: MiniAppTabType;
  id: string;
  formData: MiniAppDetailFormData;
  setFormData: React.Dispatch<React.SetStateAction<MiniAppDetailFormData>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  allErrors: Record<string, string>;
  isEditable: boolean;
  handleWebViewChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFlutterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onUpdateFlutterConfig: (updates: Record<string, any>, extraData?: any) => void;
  handleNativeSdkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateNativeSdkConfig: (updates: Partial<NativeSdkConfigDto>, extraData?: any) => void;
  handleDeepLinkChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onDomainVerified: (data: any) => void;
  togglePermission: (type: string) => void;
  handlePermissionFieldChange: (type: string, field: string, value: string) => void;
  customPermission: string;
  setCustomPermission: (val: string) => void;
  onRefreshApp: () => Promise<void>;
}

export function MiniAppSectionContent({
  activeTab,
  id,
  formData,
  setFormData,
  handleChange,
  allErrors,
  isEditable,
  handleWebViewChange,
  handleFlutterChange,
  onUpdateFlutterConfig,
  handleNativeSdkChange,
  onUpdateNativeSdkConfig,
  handleDeepLinkChange,
  onDomainVerified,
  togglePermission,
  handlePermissionFieldChange,
  customPermission,
  setCustomPermission,
  onRefreshApp,
}: MiniAppSectionContentProps) {
  return (
    <div>
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

      {activeTab === 'legal' && (
        <Card>
          <CardHeader
            title="Legal & Compliance Policies"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <LegalPolicyForm
            formData={formData}
            handleChange={handleChange}
            allErrors={allErrors}
            isEditable={isEditable}
          />
        </Card>
      )}

      {activeTab === 'team' && (
        <Card>
          <CardHeader
            title="Team & Collaborators"
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
            onUpdateFlutterConfig={onUpdateFlutterConfig}
            handleNativeSdkChange={handleNativeSdkChange}
            onUpdateNativeSdkConfig={onUpdateNativeSdkConfig}
            handleDeepLinkChange={handleDeepLinkChange}
            onDomainVerified={onDomainVerified}
            isEditable={isEditable}
          />
        </Card>
      )}

      {activeTab === 'permissions' && (
        <Card>
          <CardHeader
            title="Capabilities"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            }
          />
          <CapabilitiesForm
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
          miniAppId={id}
          miniAppName={formData.name || ''}
          appId={formData.appId}
          currentStatus={formData.status}
          teamTelegramChatId={formData.teamTelegramChatId}
          pendingRevision={formData.pendingRevision}
        />
      )}

      {activeTab === 'report' && (
        <ValidationReportTab miniApp={formData} onRefresh={onRefreshApp} />
      )}

      {activeTab === 'activity' && (
        <ActivityTab miniAppId={id} />
      )}
    </div>
  );
}
