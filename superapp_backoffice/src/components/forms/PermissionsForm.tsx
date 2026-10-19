"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import { miniappsApi } from '@/api';
import { permissionsApi, Permission, CapabilityItem } from '@/api/permissions.api';
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
import { PlusCircle } from 'lucide-react';

export function normalizeCapabilityKey(raw: string): string {
  const lower = (raw || '').toLowerCase().trim();
  if (lower === 'take_photo' || lower === 'camera' || lower === 'photo' || lower === 'camera & document capture') return 'camera';
  if (lower === 'get_location' || lower === 'location' || lower === 'gps' || lower === 'geolocation services' || lower === 'location services') return 'location';
  if (lower === 'biometric_auth' || lower === 'biometrics' || lower === 'biometric' || lower === 'biometric authentication') return 'biometrics';
  if (lower === 'record' || lower === 'microphone' || lower === 'audio' || lower === 'microphone & audio') return 'microphone';
  if (lower === 'secure_storage' || lower === 'storage' || lower === 'secure vault storage') return 'storage';
  if (lower === 'webview_runtime' || lower === 'webview' || lower === 'internet' || lower === 'sandboxed webview runtime') return 'webview_runtime';
  return lower;
}

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
    description: 'Hardware FaceID, TouchID, and Android BiometricPrompt identity verification.',
  },
  microphone: {
    iosKey: 'NSMicrophoneUsageDescription',
    androidPermission: 'android.permission.RECORD_AUDIO',
    defaultAction: 'record audio notes and enable voice-guided features',
    description: 'Access device microphone to record audio notes or voice features.',
  },
  storage: {
    iosKey: 'Keychain & NSPhotoLibraryUsageDescription',
    androidPermission: 'android.security.keystore & WRITE_EXTERNAL_STORAGE',
    defaultAction: 'securely store encrypted tokens, offline cache, and user vault data',
    description: 'Hardware-backed encrypted key-value storage (Android KeyStore & iOS Keychain).',
  },
  secure_storage: {
    iosKey: 'Keychain & NSPhotoLibraryUsageDescription',
    androidPermission: 'android.security.keystore & WRITE_EXTERNAL_STORAGE',
    defaultAction: 'securely store encrypted tokens, offline cache, and user vault data',
    description: 'Hardware-backed encrypted key-value storage (Android KeyStore & iOS Keychain).',
  },
  webview_runtime: {
    iosKey: 'NSAppTransportSecurity',
    androidPermission: 'android.permission.INTERNET',
    defaultAction: 'host isolated web application runtime and process secure JS bridge communications',
    description: 'Isolated web application host container with security boundary and JS bridge.',
  },
  internet: {
    iosKey: 'NSAppTransportSecurity',
    androidPermission: 'android.permission.INTERNET',
    defaultAction: 'connect to authorized secure API endpoints and process real-time network requests',
    description: 'Network connectivity and outbound API access.',
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

export const WHITELISTED_HOST_CAPABILITIES = [
  'camera',
  'location',
  'biometrics',
  'microphone',
  'storage',
  'secure_storage',
  'webview_runtime',
  'internet',
];

export const CANONICAL_SHELL_CAPABILITIES = [
  'Microphone',
  'Webview_runtime',
  'Camera',
  'Location',
  'Biometrics',
  'Storage',
];

export function formatCompliantPurpose(type: string, rawPurpose: string, appName?: string): string {
  const appLabel = appName?.trim() || '$(PRODUCT_NAME)';
  const trimmed = (rawPurpose || '').trim();
  const canonKey = normalizeCapabilityKey(type);
  const meta = PERMISSION_STORE_MAP[canonKey] || PERMISSION_STORE_MAP[type.toLowerCase()];
  const fallbackAction = meta?.defaultAction || `access ${type.toLowerCase()} features`;

  if (!trimmed) {
    return `${appLabel} requires access to your ${canonKey} to ${fallbackAction}.`;
  }

  // Extract the underlying action/reason from any existing "requires" sentence
  let reason = trimmed;
  if (/requires/i.test(trimmed)) {
    const match = trimmed.match(
      /(?:.*requires\s+.*?access\s+(?:to|for)\s+|.*requires\s+.*?\s+(?:to|for)\s+|.*requires\s+(?:to|for)\s+)(.+)$/i
    );
    if (match && match[1]) {
      reason = match[1].trim();
    } else {
      reason = trimmed.replace(/^.*?requires\s+/i, '').trim();
    }
  }

  // Clean leading "to " or "for "
  reason = reason.replace(/^(to|for)\s+/i, '').trim();

  // Clean trailing punctuation
  reason = reason.replace(/\.+$/, '').trim();

  if (!reason) {
    reason = fallbackAction;
  }

  // Lowercase the first letter of the reason
  reason = reason.charAt(0).toLowerCase() + reason.slice(1);

  return `${appLabel} requires access to your ${canonKey} to ${reason}.`;
}

export function isStoreCompliant(purpose: string, appName?: string): boolean {
  const trimmed = (purpose || '').trim();
  const appLabel = appName?.trim() || '';
  if (!trimmed || trimmed.length < 15) return false;

  // Corrupted strings with multiple "requires" are NOT compliant
  const requiresCount = (trimmed.match(/\brequires\b/gi) || []).length;
  if (requiresCount !== 1) return false;

  const hasRequires =
    trimmed.toLowerCase().includes('requires access to') || trimmed.toLowerCase().includes('requires');
  const hasSubject =
    trimmed.startsWith('$(') ||
    (appLabel && trimmed.toLowerCase().startsWith(appLabel.toLowerCase())) ||
    trimmed.toLowerCase().startsWith('this mini app');
  return hasRequires && hasSubject && trimmed.endsWith('.');
}

export function getPermissionVisual(type: string) {
  const key = normalizeCapabilityKey(type);
  switch (key) {
    case 'camera':
      return {
        icon: <CameraIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800/60',
        title: 'Camera & Document Capture',
      };
    case 'location':
      return {
        icon: <GlobeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-800/60',
        title: 'Geolocation Services',
      };
    case 'biometrics':
      return {
        icon: <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800/60',
        title: 'Biometric Authentication',
      };
    case 'microphone':
      return {
        icon: (
          <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ),
        bg: 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 border-accent-200 dark:border-accent-800/60',
        title: 'Microphone',
      };
    case 'storage':
      return {
        icon: (
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
        title: 'Secure Vault Storage',
      };
    case 'webview_runtime':
      return {
        icon: (
          <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
        title: 'Sandboxed WebView Runtime',
      };
    case 'nfc':
      return {
        icon: <ZapIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
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

  // Live capabilities & permissions fetched directly from SuperApp container & backend
  const [hostCapabilities, setHostCapabilities] = useState<CapabilityItem[]>([]);
  const [hostPermissions, setHostPermissions] = useState<Permission[]>([]);
  const [isLoadingHostCapas, setIsLoadingHostCapas] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchRealSuperAppCapabilities = async () => {
      try {
        setIsLoadingHostCapas(true);
        const [capsRes, permsRes] = await Promise.allSettled([
          permissionsApi.getCapabilities(),
          permissionsApi.getAll(),
        ]);

        if (isMounted) {
          if (capsRes.status === 'fulfilled' && Array.isArray(capsRes.value)) {
            setHostCapabilities(capsRes.value);
          }
          if (permsRes.status === 'fulfilled' && Array.isArray(permsRes.value)) {
            setHostPermissions(permsRes.value);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch real SuperApp capabilities from backend:', err);
      } finally {
        if (isMounted) setIsLoadingHostCapas(false);
      }
    };

    fetchRealSuperAppCapabilities();
    return () => {
      isMounted = false;
    };
  }, []);

  const [customKey, setCustomKey] = useState(customPermission || '');
  const [customRequired, setCustomRequired] = useState(true);
  const [customPurpose, setCustomPurpose] = useState('');

  const handleAddCustomCapability = () => {
    if (!customKey.trim()) return;
    const cleanType = customKey.trim();
    const canon = normalizeCapabilityKey(cleanType);
    const purpose =
      customPurpose.trim() ||
      formatCompliantPurpose(cleanType, '', formData.name);

    const exists = (formData.permissions || []).some(
      (p: any) => normalizeCapabilityKey(p.type) === canon,
    );

    if (!exists) {
      const newPerm = {
        type: cleanType,
        purpose,
        required: customRequired,
        termsUrl: '',
      };
      setFormData((prev: any) => ({
        ...prev,
        permissions: [...(prev.permissions || []), newPerm],
      }));
    }
    setCustomKey('');
    setCustomPurpose('');
    setCustomRequired(true);
    setCustomPermission?.('');
  };

  const getPermError = (type: string, field: string) => {
    const canon = normalizeCapabilityKey(type);
    if (allErrors[`permission_${type}_${field}`]) return allErrors[`permission_${type}_${field}`];
    if (allErrors[`permission_${canon}_${field}`]) return allErrors[`permission_${canon}_${field}`];
    if (allErrors[`permissionRequests.${type}.${field}`]) return allErrors[`permissionRequests.${type}.${field}`];
    if (allErrors[`permissionRequests.${canon}.${field}`]) return allErrors[`permissionRequests.${canon}.${field}`];

    const idx = (formData.permissions || []).findIndex(
      (p: any) => normalizeCapabilityKey(p.type) === canon
    );
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

      const gitUrl =
        formData.integrationConfigFlutter?.gitUrl ||
        formData.integrationConfigFlutter?.repoUrl ||
        formData.integrationConfig?.gitUrl ||
        formData.integrationConfig?.repoUrl ||
        '';

      const gitBranch =
        formData.integrationConfigFlutter?.gitBranch ||
        formData.integrationConfig?.gitBranch ||
        formData.integrationConfigFlutter?.ref ||
        'main';

      const gitPath =
        formData.integrationConfigFlutter?.gitPath ||
        formData.integrationConfigFlutter?.packagePath ||
        formData.integrationConfig?.gitPath ||
        formData.integrationConfig?.packagePath ||
        '';

      const data = await miniappsApi.detectPermissions({
        productionUrl: prodUrl,
        gitUrl,
        gitBranch,
        gitPath,
        category: formData.category,
        name: formData.name,
        appId: formData.appId,
      });

      if (data && data.detected && Array.isArray(data.detected) && data.detected.length > 0) {
        const sourcesMap: Record<string, string> = {};
        const currentPermissions = [...(formData.permissions || [])];

        data.detected.forEach((item: { type: string; purpose: string; source: string }) => {
          sourcesMap[item.type] = item.source;
          const formattedPurpose = formatCompliantPurpose(item.type, item.purpose, formData.name);
          const existingIdx = currentPermissions.findIndex(
            (p) => p.type.toLowerCase() === item.type.toLowerCase()
          );

          if (existingIdx !== -1) {
            // Keep user's existing purpose if valid; if empty or corrupted with duplicate requires, heal it
            const existingP = currentPermissions[existingIdx].purpose;
            if (!existingP || (existingP.match(/\brequires\b/gi) || []).length > 1) {
              currentPermissions[existingIdx].purpose = formattedPurpose;
            }
          } else {
            currentPermissions.push({
              type: item.type,
              purpose: formattedPurpose,
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
        const sourceLabel = gitUrl ? `GitLab (branch: ${gitBranch})` : 'package analysis';
        setDetectionNotice(
          `Auto-detected ${data.detected.length} capability requirement(s) from ${sourceLabel}. Purpose descriptions have been pre-filled from your package and can be customized below.`
        );
      } else {
        setDetectionNotice('Scan complete: No additional native capabilities required.');
      }
    } catch (err) {
      setDetectionNotice('Scan complete: You can select capabilities manually below.');
    } finally {
      setIsDetecting(false);
    }
  }, [
    formData.integrationConfigWebView?.productionUrl,
    formData.integrationConfig?.productionUrl,
    formData.integrationConfigFlutter?.gitUrl,
    formData.integrationConfigFlutter?.repoUrl,
    formData.integrationConfigFlutter?.gitBranch,
    formData.integrationConfigFlutter?.ref,
    formData.integrationConfigFlutter?.gitPath,
    formData.integrationConfigFlutter?.packagePath,
    formData.integrationConfig?.gitUrl,
    formData.integrationConfig?.repoUrl,
    formData.category,
    formData.name,
    formData.appId,
    formData.permissions,
    setFormData,
  ]);

  // Auto-run once on initial visit if empty
  useEffect(() => {
    if (!formData.permissions || formData.permissions.length === 0) {
      handleAutoDetect();
    }
  }, []);

  // Dynamically compute host-supported whitelisted capabilities synced directly with SuperApp container
  const liveWhitelistedSet = useMemo(() => {
    const set = new Set<string>();

    // 1. From real SuperApp capabilities scanner (super-app/pubspec.yaml & AndroidManifest)
    hostCapabilities.forEach((cap) => {
      if (cap.status === 'Active' || cap.status === 'Beta') {
        (cap.requiredPermissions || []).forEach((p) => {
          set.add(p.toLowerCase());
          set.add(normalizeCapabilityKey(p));
        });
        set.add(cap.key.toLowerCase());
        set.add(normalizeCapabilityKey(cap.key));
      }
    });

    // 2. From real database permissions
    hostPermissions.forEach((perm) => {
      if (perm.isActive !== false) {
        if (perm.key) {
          set.add(perm.key.toLowerCase());
          set.add(normalizeCapabilityKey(perm.key));
        }
        set.add(perm.name.toLowerCase());
        set.add(normalizeCapabilityKey(perm.name));
      }
    });

    // 3. Fallback baseline if offline
    WHITELISTED_HOST_CAPABILITIES.forEach((p) => {
      set.add(p.toLowerCase());
      set.add(normalizeCapabilityKey(p));
    });

    return set;
  }, [hostCapabilities, hostPermissions]);

  const allAvailableTypes = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addType = (raw: string) => {
      if (!raw) return;
      const canon = normalizeCapabilityKey(raw);
      if (!seen.has(canon)) {
        seen.add(canon);
        // Canonical display name matching Shell & Capabilities page
        const display = canon.charAt(0).toUpperCase() + canon.slice(1);
        list.push(display);
      }
    };

    // 1. All 6 Core Shell Capabilities (ensures all 6 live in shell capabilities from /capabilities are always present)
    CANONICAL_SHELL_CAPABILITIES.forEach((c) => addType(c));

    // 2. Real SuperApp capabilities detected from shell (from /api/permissions/capabilities)
    hostCapabilities.forEach((c) => {
      addType(c.key);
      (c.requiredPermissions || []).forEach((p) => addType(p));
    });

    // 3. Real permissions defined in database
    hostPermissions.forEach((p) => {
      addType(p.key || p.name || '');
    });

    // 4. Any permission currently requested by the MiniApp
    (formData.permissions || []).forEach((p: any) => addType(p.type));

    return list;
  }, [hostPermissions, hostCapabilities, formData.permissions]);

  const activeCount = formData.permissions?.length || 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Discovery Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Capabilities &amp; Permissions</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 inline-flex items-center gap-1">
              {isLoadingHostCapas ? (
                <>
                  <svg className="animate-spin w-2.5 h-2.5 text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Syncing Shell...</span>
                </>
              ) : (
                <span>{activeCount} Requested</span>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select native device and bridge features needed by your MiniApp.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAutoDetect}
          disabled={isDetecting}
          className="shrink-0 text-xs h-8 px-3 font-semibold inline-flex items-center gap-1.5 border-brand-500/40 hover:bg-brand-50 text-brand-700 dark:text-brand-300 dark:hover:bg-brand-950/40 shadow-xs transition-all self-start sm:self-auto"
        >
          {isDetecting ? (
            <>
              <svg className="animate-spin w-3 h-3 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <ZapIcon className="w-3 h-3 text-amber-500" />
              <span>Auto-Detect</span>
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
      <div className="space-y-2.5">
        {allAvailableTypes.map((type) => {
          const canon = normalizeCapabilityKey(type);
          const activePerm = formData.permissions?.find((p: any) => normalizeCapabilityKey(p.type) === canon);
          const isActive = Boolean(activePerm);
          const isWhitelisted = liveWhitelistedSet.has(canon) || liveWhitelistedSet.has(type.toLowerCase());
          const isRequired = activePerm ? activePerm.required !== false : true;
          const purposeError = getPermError(type, 'purpose');
          const visual = getPermissionVisual(type);
          const meta = PERMISSION_STORE_MAP[canon] || PERMISSION_STORE_MAP[type.toLowerCase()];
          const compliant = activePerm ? isStoreCompliant(activePerm.purpose, formData.name) : false;

          // Resolve dynamic description from real backend definitions
          const backendPermDef = hostPermissions.find(
            (p) => normalizeCapabilityKey(p.key || '') === canon || normalizeCapabilityKey(p.name || '') === canon
          );
          const backendCapDef = hostCapabilities.find(
            (c) =>
              normalizeCapabilityKey(c.key || '') === canon ||
              (c.requiredPermissions || []).some((rp) => normalizeCapabilityKey(rp) === canon)
          );
          const displayDescription =
            backendCapDef?.description ||
            backendPermDef?.description ||
            meta?.description ||
            `Native bridge access for ${type.toLowerCase()} operations.`;

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
                className={`p-3.5 flex items-center justify-between gap-3.5 select-none ${
                  isEditable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${visual.bg}`}>
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
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <SparklesIcon className="w-2.5 h-2.5 text-indigo-500" />
                          <span>Proposal Requested</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {displayDescription}
                    </p>
                  </div>
                </div>

                {/* Right controls: Required/Optional segmented pill + Switch */}
                <div className="shrink-0 flex items-center gap-2.5">
                  {isActive && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <button
                        type="button"
                        disabled={!isEditable}
                        onClick={() => handlePermissionFieldChange(type, 'required', true)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                          isRequired
                            ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                      >
                        Required
                      </button>
                      <button
                        type="button"
                        disabled={!isEditable}
                        onClick={() => handlePermissionFieldChange(type, 'required', false)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                          !isRequired
                            ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                      >
                        Optional
                      </button>
                    </div>
                  )}

                  <div
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ease-in-out duration-200 ${
                      isActive ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Active Purpose Drawer */}
              {isActive && (
                <div className="px-3.5 pb-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                  {!isWhitelisted && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                      <SparklesIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Host Extension Request:</strong> This capability is not yet in the host shell. Submitting this MiniApp will automatically log a Capability Proposal for SuperApp administrators to review and inject support.
                      </span>
                    </div>
                  )}

                  {(!activePerm.purpose || !activePerm.purpose.trim()) && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                      <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>
                        <strong>Action Required:</strong> Please enter the specific reason why {formData.name || 'your MiniApp'} requires {visual.title || type} access.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>Purpose Description</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </Label>
                    {compliant ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckIcon className="w-2.5 h-2.5" />
                        <span>Compliant</span>
                      </span>
                    ) : isEditable && activePerm.purpose ? (
                      <button
                        type="button"
                        title="Auto-format for store compliance"
                        onClick={() => {
                          const formatted = formatCompliantPurpose(type, activePerm.purpose, formData.name);
                          handlePermissionFieldChange(type, 'purpose', formatted);
                        }}
                        className="text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                      >
                        <SparklesIcon className="w-3 h-3 text-brand-500" />
                        <span>Auto-Format</span>
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
                    placeholder={`e.g. ${formData.name || 'This MiniApp'} requires ${type.toLowerCase()} access to ${meta?.defaultAction || 'provide core application features'}.`}
                    className={`h-8 text-xs ${
                      purposeError ? 'border-rose-500 bg-rose-50/50' : 'bg-white dark:bg-slate-900'
                    }`}
                  />
                  {purposeError && (
                    <p className="text-[11px] text-rose-600 font-medium">{purposeError}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Request Custom Capability Section (Clean, Compact, Minimal) */}
      {isEditable && (
        <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <PackageIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Request Custom Capability</span>
            </h4>
            <span className="text-[11px] text-slate-400">Propose an unlisted device feature</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Capability Name <span className="text-rose-500 font-bold">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <Input
                  value={customKey}
                  onChange={(e) => {
                    setCustomKey(e.target.value);
                    setCustomPermission?.(e.target.value);
                  }}
                  placeholder="e.g. NFC, Bluetooth, HealthKit"
                  className="h-8 text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex rounded-lg p-0.5 bg-slate-200/70 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomRequired(true)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition ${
                    customRequired
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Required
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRequired(false)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition ${
                    !customRequired
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Optional
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Purpose Description <span className="text-rose-500 font-bold">*</span>
              </Label>
              {customKey && (
                <button
                  type="button"
                  title="Auto-format disclosure"
                  onClick={() => {
                    const formatted = formatCompliantPurpose(customKey, customPurpose, formData.name);
                    setCustomPurpose(formatted);
                  }}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                >
                  <SparklesIcon className="w-3 h-3 text-brand-500" />
                  <span>Auto-Format</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="e.g. Tap contactless smart cards to verify identity tokens."
                className="h-8 text-xs bg-white dark:bg-slate-900 flex-1"
              />

              <Button
                type="button"
                disabled={!customKey.trim()}
                onClick={handleAddCustomCapability}
                size="sm"
                className="h-8 px-3 text-xs shrink-0 inline-flex items-center gap-1 font-semibold"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Add</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
