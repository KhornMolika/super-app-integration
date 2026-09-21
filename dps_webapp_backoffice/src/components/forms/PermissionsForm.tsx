"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import { miniappsApi } from '@/api';
import {
  CheckIcon,
  ShieldIcon,
  ShieldCheckIcon,
  ZapIcon,
  AlertTriangleIcon,
  SparklesIcon,
  CameraIcon,
  GlobeIcon,
  PackageIcon,
  XIcon,
} from '@/components/ui/Icons';

export const PERMISSION_STORE_MAP: Record<
  string,
  { iosKey: string; androidPermission: string; defaultAction: string; description: string }
> = {
  camera: {
    iosKey: 'NSCameraUsageDescription',
    androidPermission: 'android.permission.CAMERA',
    defaultAction: 'photograph accident evidence and upload policy claim documents',
    description: 'Capture photos, scan QR codes, and upload identity/claim documents.',
  },
  location: {
    iosKey: 'NSLocationWhenInUseUsageDescription',
    androidPermission: 'android.permission.ACCESS_FINE_LOCATION',
    defaultAction: 'provide location-based services, navigation, and find nearby branches',
    description: 'Access GPS coordinates for local services, branch locator, and fraud prevention.',
  },
  biometrics: {
    iosKey: 'NSFaceIDUsageDescription',
    androidPermission: 'android.permission.USE_BIOMETRIC',
    defaultAction: 'securely authenticate your identity and authorize sensitive transactions',
    description: 'Authenticate transactions and login securely with Fingerprint or Face ID.',
  },
  microphone: {
    iosKey: 'NSMicrophoneUsageDescription',
    androidPermission: 'android.permission.RECORD_AUDIO',
    defaultAction: 'record audio notes and enable voice-guided features',
    description: 'Voice recognition and audio recording capabilities.',
  },
  nfc: {
    iosKey: 'NFCReaderUsageDescription',
    androidPermission: 'android.permission.NFC',
    defaultAction: 'scan contactless NFC smart cards and national identity chips',
    description: 'Read contactless smart cards and national identity e-chips.',
  },
  bluetooth: {
    iosKey: 'NSBluetoothAlwaysUsageDescription',
    androidPermission: 'android.permission.BLUETOOTH_CONNECT',
    defaultAction: 'connect to and communicate with nearby verified devices',
    description: 'Communicate with external peripherals and proximity beacons.',
  },
  contacts: {
    iosKey: 'NSContactsUsageDescription',
    androidPermission: 'android.permission.READ_CONTACTS',
    defaultAction: 'select contacts directly from your address book',
    description: 'Access address book for quick recipient selection.',
  },
};

export const WHITELISTED_HOST_CAPABILITIES = ['camera', 'location', 'biometrics', 'microphone'];

export function formatCompliantPurpose(type: string, rawPurpose: string, appName?: string): string {
  const appLabel = appName?.trim() || '$(PRODUCT_NAME)';
  const trimmed = (rawPurpose || '').trim();
  const meta = PERMISSION_STORE_MAP[type.toLowerCase()];
  const fallbackAction = meta?.defaultAction || `access ${type.toLowerCase()} features`;

  if (!trimmed) {
    return `${appLabel} requires access to your ${type.toLowerCase()} to ${fallbackAction}.`;
  }

  if (
    trimmed.toLowerCase().includes('requires') &&
    (trimmed.toLowerCase().startsWith(appLabel.toLowerCase()) || trimmed.startsWith('$('))
  ) {
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  let cleaned = trimmed;
  if (/^(to|for)\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(to|for)\s+/i, '');
  }
  cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  return `${appLabel} requires access to your ${type.toLowerCase()} to ${cleaned}.`;
}

export function isStoreCompliant(purpose: string, appName?: string): boolean {
  const trimmed = (purpose || '').trim();
  const appLabel = appName?.trim() || '';
  if (!trimmed || trimmed.length < 15) return false;
  const hasRequires =
    trimmed.toLowerCase().includes('requires access to') || trimmed.toLowerCase().includes('requires');
  const hasSubject =
    trimmed.startsWith('$(') ||
    (appLabel && trimmed.toLowerCase().startsWith(appLabel.toLowerCase())) ||
    trimmed.toLowerCase().startsWith('this mini app');
  return hasRequires && hasSubject && trimmed.endsWith('.');
}

export function getPermissionVisual(type: string) {
  const key = type.toLowerCase();
  switch (key) {
    case 'camera':
      return {
        icon: <CameraIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800/60',
        title: 'Camera',
      };
    case 'location':
      return {
        icon: <GlobeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-800/60',
        title: 'Location Services',
      };
    case 'biometrics':
      return {
        icon: <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800/60',
        title: 'Biometrics (FaceID / Fingerprint)',
      };
    case 'microphone':
      return {
        icon: (
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ),
        bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 border-purple-200 dark:border-purple-800/60',
        title: 'Microphone & Audio',
      };
    case 'nfc':
      return {
        icon: <ZapIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
        bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-200 dark:border-indigo-800/60',
        title: 'Near Field Communication (NFC)',
      };
    case 'bluetooth':
      return {
        icon: (
          <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l10 10-5 5V2l5 5L7 17" />
          </svg>
        ),
        bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 border-sky-200 dark:border-sky-800/60',
        title: 'Bluetooth Low Energy',
      };
    case 'contacts':
      return {
        icon: (
          <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 border-teal-200 dark:border-teal-800/60',
        title: 'Contacts & Address Book',
      };
    default:
      return {
        icon: <PackageIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
        bg: 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700',
        title: type,
      };
  }
}

export interface PermissionsFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange?: (e: any) => void;
  allErrors?: Record<string, string>;
  togglePermission: (type: string) => void;
  handlePermissionFieldChange: (type: string, field: string, value: any) => void;
  customPermission?: string;
  setCustomPermission?: (val: string) => void;
  isEditable?: boolean;
}

export default function PermissionsForm({
  formData,
  setFormData,
  allErrors = {},
  togglePermission,
  handlePermissionFieldChange,
  customPermission = '',
  setCustomPermission,
  isEditable = true,
}: PermissionsFormProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedMeta, setDetectedMeta] = useState<{ count: number; sources: Record<string, string> } | null>(null);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const getPermError = (type: string, field: string) => {
    if (allErrors[`permission_${type}_${field}`]) return allErrors[`permission_${type}_${field}`];
    if (allErrors[`permissionRequests.${type}.${field}`]) return allErrors[`permissionRequests.${type}.${field}`];

    const idx = (formData.permissions || []).findIndex((p: any) => p.type.toLowerCase() === type.toLowerCase());
    if (idx !== -1) {
      if (allErrors[`permissions.${idx}.${field}`]) return allErrors[`permissions.${idx}.${field}`];
      if (allErrors[`permissionRequests.${idx}.${field}`]) return allErrors[`permissionRequests.${idx}.${field}`];
    }
    return undefined;
  };

  const handleAutoDetect = useCallback(async () => {
    setIsDetecting(true);
    setDetectionNotice(null);
    try {
      const prodUrl =
        formData.integrationConfigWebView?.productionUrl ||
        formData.integrationConfig?.productionUrl ||
        '';

      const data = await miniappsApi.detectPermissions({
        productionUrl: prodUrl,
        category: formData.category,
        name: formData.name,
        appId: formData.appId,
      });

      if (data && data.detected && Array.isArray(data.detected) && data.detected.length > 0) {
        const sourcesMap: Record<string, string> = {};
        const currentPermissions = [...(formData.permissions || [])];

        data.detected.forEach((item: { type: string; purpose: string; source: string }) => {
          sourcesMap[item.type] = item.source;
          const existingIdx = currentPermissions.findIndex(
            (p) => p.type.toLowerCase() === item.type.toLowerCase()
          );

          if (existingIdx !== -1) {
            if (!currentPermissions[existingIdx].purpose && item.purpose) {
              currentPermissions[existingIdx] = {
                ...currentPermissions[existingIdx],
                purpose: item.purpose,
              };
            }
          } else {
            currentPermissions.push({
              type: item.type,
              purpose: item.purpose,
              termsUrl: '',
            });
          }
        });

        if (setFormData) {
          setFormData((prev: any) => ({
            ...prev,
            permissions: currentPermissions,
          }));
        }

        setDetectedMeta({
          count: data.detected.length,
          sources: sourcesMap,
        });
        setDetectionNotice(`Auto-detected ${data.detected.length} required capability requirement(s).`);
      } else {
        setDetectionNotice('Scan complete: No additional native capabilities required.');
      }
    } catch (err) {
      setDetectionNotice('Scan complete: You can select capabilities manually below.');
    } finally {
      setIsDetecting(false);
    }
  }, [formData.integrationConfigWebView?.productionUrl, formData.integrationConfig?.productionUrl, formData.category, formData.name, formData.appId, formData.permissions, setFormData]);

  // Auto-run once on initial visit if empty
  useEffect(() => {
    if (!formData.permissions || formData.permissions.length === 0) {
      handleAutoDetect();
    }
  }, []);

  const allAvailableTypes = Array.from(
    new Set([
      'Camera',
      'Location',
      'Biometrics',
      'Microphone',
      ...(formData.permissions?.map((p: any) => p.type) || []),
    ])
  );

  const activeCount = formData.permissions?.length || 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Sleek, Minimalist Discovery Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Native Host Bridge Capabilities</span>
            </h4>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              {activeCount} Requested
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Declare hardware &amp; bridge capabilities needed by your Mini App. Disclosures are automatically sanitized for App Store &amp; Play Store compliance.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAutoDetect}
          disabled={isDetecting}
          className="shrink-0 text-xs sm:text-sm h-9 px-3.5 font-semibold inline-flex items-center gap-1.5 border-brand-500/50 hover:bg-brand-50 text-brand-700 dark:text-brand-300 dark:hover:bg-brand-950/40 shadow-xs transition-all self-start sm:self-auto"
        >
          {isDetecting ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Auto-Scanning...</span>
            </>
          ) : (
            <>
              <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Auto-Detect from Code</span>
            </>
          )}
        </Button>
      </div>

      {detectionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{detectionNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setDetectionNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Permissions List */}
      <div className="space-y-3">
        {allAvailableTypes.map((type) => {
          const activePerm = formData.permissions?.find((p: any) => p.type.toLowerCase() === type.toLowerCase());
          const isActive = Boolean(activePerm);
          const isWhitelisted = WHITELISTED_HOST_CAPABILITIES.includes(type.toLowerCase());
          const isRequired = activePerm ? activePerm.required !== false : true;
          const purposeError = getPermError(type, 'purpose');
          const visual = getPermissionVisual(type);
          const meta = PERMISSION_STORE_MAP[type.toLowerCase()];
          const compliant = activePerm ? isStoreCompliant(activePerm.purpose, formData.name) : false;
          const showKeys = Boolean(expandedKeys[type.toLowerCase()]);

          return (
            <div
              key={type}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-brand-500/80 dark:border-brand-500/60 shadow-xs ring-1 ring-brand-500/20'
                  : 'bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header Row: Icon + Title + Status + Switch */}
              <div
                onClick={() => {
                  if (isEditable) togglePermission(type);
                }}
                className={`p-4 flex items-center justify-between gap-3.5 select-none ${
                  isEditable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${visual.bg}`}>
                    {visual.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {visual.title || type}
                      </h4>

                      {isWhitelisted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckIcon className="w-2.5 h-2.5" />
                          <span>Host Supported</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertTriangleIcon className="w-2.5 h-2.5 text-amber-500" />
                          <span>Unwhitelisted Capability</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {meta?.description || `Native bridge access for ${type.toLowerCase()} operations.`}
                    </p>
                  </div>
                </div>

                {/* Minimalist Switch */}
                <div className="shrink-0 flex items-center gap-2">
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors ease-in-out duration-200 ${
                      isActive ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Active Expanded Drawer (Clean & Minimalist) */}
              {isActive && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3 bg-slate-50/50 dark:bg-slate-800/20 animate-in fade-in duration-150">
                  {/* Requirement Level + Unwhitelisted warning */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Requirement Level:</span>
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 text-xs">
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={() => handlePermissionFieldChange(type, 'required', true)}
                          className={`px-2.5 py-1 rounded-md font-semibold transition ${
                            isRequired
                              ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          } ${!isEditable ? 'cursor-not-allowed opacity-75' : ''}`}
                        >
                          ● Required
                        </button>
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={() => handlePermissionFieldChange(type, 'required', false)}
                          className={`px-2.5 py-1 rounded-md font-semibold transition ${
                            !isRequired
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          } ${!isEditable ? 'cursor-not-allowed opacity-75' : ''}`}
                        >
                          ○ Optional
                        </button>
                      </div>
                    </div>

                    {!isWhitelisted && isRequired && (
                      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                        <AlertTriangleIcon className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>May be rejected by Gatekeeper if Required</span>
                      </span>
                    )}
                  </div>

                  {/* Purpose Input & Compliance Action */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>User-Facing Purpose Disclosure</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </Label>

                      {compliant ? (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-1">
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Store Compliant</span>
                        </span>
                      ) : isEditable ? (
                        <button
                          type="button"
                          onClick={() => {
                            const formatted = formatCompliantPurpose(type, activePerm.purpose, formData.name);
                            handlePermissionFieldChange(type, 'purpose', formatted);
                          }}
                          className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800 inline-flex items-center gap-1 transition"
                        >
                          <SparklesIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                          <span>Auto-Format for App Stores</span>
                        </button>
                      ) : null}
                    </div>

                    <Input
                      required
                      disabled={!isEditable}
                      value={activePerm.purpose || ''}
                      name={`permission_${type}_purpose`}
                      onChange={(e) => handlePermissionFieldChange(type, 'purpose', e.target.value)}
                      onBlur={() => {
                        if (activePerm.purpose && !compliant) {
                          const formatted = formatCompliantPurpose(type, activePerm.purpose, formData.name);
                          handlePermissionFieldChange(type, 'purpose', formatted);
                        }
                      }}
                      placeholder={`e.g. ${formData.name || 'This Mini App'} requires access to your ${type.toLowerCase()} to ${meta?.defaultAction || 'provide core services'}.`}
                      className={`h-9 text-xs sm:text-sm ${
                        purposeError ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''
                      }`}
                    />

                    {purposeError && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">{purposeError}</p>
                    )}
                  </div>

                  {/* Optional Collapsible Technical Keys (Info.plist / AndroidManifest) */}
                  {meta && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedKeys((prev) => ({ ...prev, [type.toLowerCase()]: !prev[type.toLowerCase()] }))
                        }
                        className="text-[11px] font-mono text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1 transition"
                      >
                        <span>{showKeys ? '▾ Hide Technical Manifest Keys' : '▸ View Info.plist & Manifest Keys'}</span>
                      </button>

                      {showKeys && (
                        <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900 text-[11px] font-mono text-slate-300 space-y-1 border border-slate-800 animate-in fade-in duration-150">
                          <div>
                            <span className="text-slate-500">iOS (Info.plist): </span>
                            <span className="text-indigo-300 font-semibold">{meta.iosKey}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Android (Manifest): </span>
                            <span className="text-emerald-400 font-semibold">{meta.androidPermission}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Clean Request Custom Capability Section (if editable) */}
      {isEditable && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <PackageIcon className="w-4 h-4 text-slate-500" />
              <span>Request Additional Host Capability</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              If your Mini App needs an unlisted hardware capability, enter its identifier below to create a proposal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={customPermission}
              onChange={(e) => setCustomPermission?.(e.target.value)}
              placeholder="e.g. Sensors, HealthKit, USB, ARKit..."
              className="h-9 text-xs sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (
                    customPermission &&
                    !formData.permissions?.find(
                      (p: any) => p.type.toLowerCase() === customPermission.toLowerCase()
                    )
                  ) {
                    togglePermission(customPermission);
                    setCustomPermission?.('');
                  }
                }
              }}
            />
            <Button
              type="button"
              className="h-9 px-4 text-xs font-semibold shrink-0"
              onClick={() => {
                if (
                  customPermission &&
                  !formData.permissions?.find(
                    (p: any) => p.type.toLowerCase() === customPermission.toLowerCase()
                  )
                ) {
                  togglePermission(customPermission);
                  setCustomPermission?.('');
                }
              }}
            >
              Add Capability
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
