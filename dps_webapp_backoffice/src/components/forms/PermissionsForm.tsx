"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import { useAuth } from '@/lib/auth';

export const PERMISSION_STORE_MAP: Record<string, { iosKey: string; androidPermission: string; defaultAction: string }> = {
  camera: {
    iosKey: 'NSCameraUsageDescription',
    androidPermission: 'android.permission.CAMERA',
    defaultAction: 'photograph accident evidence and upload policy claim documents',
  },
  location: {
    iosKey: 'NSLocationWhenInUseUsageDescription',
    androidPermission: 'android.permission.ACCESS_FINE_LOCATION',
    defaultAction: 'provide location-based services, navigation, and find nearby branches',
  },
  biometrics: {
    iosKey: 'NSFaceIDUsageDescription',
    androidPermission: 'android.permission.USE_BIOMETRIC',
    defaultAction: 'securely authenticate your identity and authorize sensitive transactions',
  },
  microphone: {
    iosKey: 'NSMicrophoneUsageDescription',
    androidPermission: 'android.permission.RECORD_AUDIO',
    defaultAction: 'record audio notes and enable voice-guided features',
  },
  nfc: {
    iosKey: 'NFCReaderUsageDescription',
    androidPermission: 'android.permission.NFC',
    defaultAction: 'scan contactless NFC smart cards and national identity chips',
  },
  bluetooth: {
    iosKey: 'NSBluetoothAlwaysUsageDescription',
    androidPermission: 'android.permission.BLUETOOTH_CONNECT',
    defaultAction: 'connect to and communicate with nearby verified devices',
  },
  contacts: {
    iosKey: 'NSContactsUsageDescription',
    androidPermission: 'android.permission.READ_CONTACTS',
    defaultAction: 'select contacts directly from your address book',
  },
};

export function formatCompliantPurpose(type: string, rawPurpose: string, appName?: string): string {
  const appLabel = appName?.trim() || '$(PRODUCT_NAME)';
  const trimmed = (rawPurpose || '').trim();
  const meta = PERMISSION_STORE_MAP[type.toLowerCase()];
  const fallbackAction = meta?.defaultAction || `access ${type.toLowerCase()} features`;

  if (!trimmed) {
    return `${appLabel} requires access to your ${type.toLowerCase()} to ${fallbackAction}.`;
  }

  if (trimmed.toLowerCase().includes('requires') && (trimmed.toLowerCase().startsWith(appLabel.toLowerCase()) || trimmed.startsWith('$('))) {
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
  const hasRequires = trimmed.toLowerCase().includes('requires access to') || trimmed.toLowerCase().includes('requires');
  const hasSubject = trimmed.startsWith('$(') || (appLabel && trimmed.toLowerCase().startsWith(appLabel.toLowerCase())) || trimmed.toLowerCase().startsWith('this mini app');
  return hasRequires && hasSubject && trimmed.endsWith('.');
}

export default function PermissionsForm({
  formData,
  setFormData,
  handleChange,
  allErrors = {},
  togglePermission,
  handlePermissionFieldChange,
  customPermission,
  setCustomPermission,
}: any) {
  const { hasRole } = useAuth();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedMeta, setDetectedMeta] = useState<{
    count: number;
    sources: Record<string, string>;
  } | null>(null);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);
  const [platformTabs, setPlatformTabs] = useState<Record<string, 'ios' | 'android'>>({});

  const getPermError = (type: string, field: string) => {
    if (allErrors[`permission_${type}_${field}`]) return allErrors[`permission_${type}_${field}`];
    if (allErrors[`permissionRequests.${type}.${field}`]) return allErrors[`permissionRequests.${type}.${field}`];
    
    const idx = (formData.permissions || []).findIndex((p: any) => p.type === type);
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

      const res = await fetch('/api/mini-apps/detect-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionUrl: prodUrl,
          category: formData.category,
          name: formData.name,
          appId: formData.appId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.detected && Array.isArray(data.detected) && data.detected.length > 0) {
          const sourcesMap: Record<string, string> = {};
          const currentPermissions = [...(formData.permissions || [])];

          data.detected.forEach((item: { type: string; purpose: string; source: string }) => {
            sourcesMap[item.type] = item.source;
            const existingIdx = currentPermissions.findIndex(
              p => p.type.toLowerCase() === item.type.toLowerCase()
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
          setDetectionNotice(
            `Auto-detected and ticked ${data.detected.length} required permission(s): ${data.detected
              .map((d: any) => d.type)
              .join(', ')}`
          );
        } else {
          setDetectionNotice('Scan complete: No additional native permissions required.');
        }
      }
    } catch (err) {
      console.error('Failed to auto-detect permissions', err);
      setDetectionNotice('Unable to scan endpoint automatically. You can select permissions manually.');
    } finally {
      setIsDetecting(false);
    }
  }, [formData.integrationConfigWebView?.productionUrl, formData.integrationConfig?.productionUrl, formData.category, formData.name, formData.appId, formData.permissions, setFormData]);

  // Auto-run once on initial visit if permissions list is currently empty
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

  return (
    <div className="space-y-6">
      {/* Smart Discovery Action Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 via-slate-100 to-indigo-50/30 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-700/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Smart Permission Discovery</span>
            </h4>
            {detectedMeta && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                ✓ {detectedMeta.count} Auto-Detected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically scans Mini App endpoint, association file, and category capabilities to auto-tick required native permissions.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAutoDetect}
          disabled={isDetecting}
          className="shrink-0 text-xs px-3.5 py-1.5 flex items-center gap-1.5 border-brand-500/60 hover:bg-brand-50 text-brand-600 dark:text-brand-400 dark:hover:bg-brand-950/30 transition-all shadow-sm"
        >
          {isDetecting ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Scanning Requirements...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Auto-Detect Permissions</span>
            </>
          )}
        </Button>
      </div>

      {detectionNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{detectionNotice}</span>
        </div>
      )}

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 gap-4">
        {allAvailableTypes.map((type) => {
          const activePerm = formData.permissions?.find((p: any) => p.type.toLowerCase() === type.toLowerCase());
          const isActive = !!activePerm;
          const purposeError = getPermError(type, 'purpose');
          const detectedSource = detectedMeta?.sources[type];

          return (
            <div
              key={type}
              className={`relative flex flex-col rounded-xl border p-4 shadow-sm transition-all ${
                isActive
                  ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/50 dark:bg-brand-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md'
              }`}
            >
              <label className="flex items-start cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-1">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => togglePermission(type)}
                      className="w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-600 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{type}</span>

                    {/* Auto-detected badge */}
                    {detectedSource && isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1">
                        <span>⚡ Auto-Detected</span>
                        <span className="opacity-75 font-normal">({detectedSource})</span>
                      </span>
                    )}

                    {!['Camera', 'Location', 'Biometrics', 'Microphone'].includes(type) && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                        Custom Proposal
                      </span>
                    )}
                  </div>
                </div>
              </label>

              {isActive && (
                <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-500/20 space-y-3">
                  <div>
                    {(() => {
                      const storeInfo = PERMISSION_STORE_MAP[type.toLowerCase()];
                      const compliant = isStoreCompliant(activePerm.purpose, formData.name);

                      return (
                        <>
                          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span>Purpose (App Store & Play Store Disclosure)</span>
                              <span className="text-rose-500 font-bold">*</span>
                            </Label>

                            <div className="flex items-center gap-2">
                              {compliant ? (
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                                  ✓ Store Compliant (Info.plist & Play Store)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const formatted = formatCompliantPurpose(type, activePerm.purpose, formData.name);
                                    handlePermissionFieldChange(type, 'purpose', formatted);
                                  }}
                                  className="text-[10px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-100/70 dark:bg-brand-950/60 hover:bg-brand-200 dark:hover:bg-brand-900/60 px-2 py-0.5 rounded border border-brand-300 dark:border-brand-700/60 flex items-center gap-1 transition"
                                  title="Format into compliant App Store & Play Store sentence"
                                >
                                  ✨ Format for Info.plist & Play Store
                                </button>
                              )}
                            </div>
                          </div>

                          <Input
                            required
                            value={activePerm.purpose || ''}
                            name={`permission_${type}_purpose`}
                            onChange={(e) => handlePermissionFieldChange(type, 'purpose', e.target.value)}
                            onBlur={() => {
                              if (activePerm.purpose && !compliant) {
                                const formatted = formatCompliantPurpose(type, activePerm.purpose, formData.name);
                                handlePermissionFieldChange(type, 'purpose', formatted);
                              }
                            }}
                            placeholder={`e.g. ${formData.name || '$(PRODUCT_NAME)'} requires access to your ${type.toLowerCase()} to photograph accident evidence and upload policy claim documents.`}
                            className={`h-9 text-sm ${
                              purposeError ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''
                            }`}
                          />

                          {purposeError && (
                            <p className="mt-1.5 text-xs text-rose-600 font-medium">{purposeError}</p>
                          )}

                          {storeInfo && (() => {
                            const currentPlatform = platformTabs[type.toLowerCase()] || 'ios';
                            const setPlatform = (platform: 'ios' | 'android') => {
                              setPlatformTabs(prev => ({ ...prev, [type.toLowerCase()]: platform }));
                            };

                            return (
                              <div className="mt-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] overflow-hidden shadow-inner">
                                {/* Tabs Header */}
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 flex-wrap gap-2">
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setPlatform('ios')}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
                                        currentPlatform === 'ios'
                                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                      }`}
                                    >
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.93-1 .04-2.22.67-2.93 1.5-.63.73-1.18 1.83-1.03 2.9 1.12.09 2.29-.58 3.02-1.47z"/>
                                      </svg>
                                      <span>iOS (Info.plist)</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPlatform('android')}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 ${
                                        currentPlatform === 'android'
                                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                      }`}
                                    >
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8559 8.082 12 8.082s-3.5902.329-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
                                      </svg>
                                      <span>Android (APK / Manifest)</span>
                                    </button>
                                  </div>

                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {currentPlatform === 'ios' ? (
                                      <span>Key: <strong className="text-indigo-400">{storeInfo.iosKey}</strong></span>
                                    ) : (
                                      <span>Permission: <strong className="text-emerald-400">{storeInfo.androidPermission}</strong></span>
                                    )}
                                  </div>
                                </div>

                                {/* Tab Content */}
                                <div className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto text-slate-300">
                                  {currentPlatform === 'ios' ? (
                                    <div className="space-y-1">
                                      <div className="text-[10px] text-slate-500">// ios/Runner/Info.plist</div>
                                      <div className="text-indigo-300">&lt;key&gt;{storeInfo.iosKey}&lt;/key&gt;</div>
                                      <div className="text-emerald-300">&lt;string&gt;{activePerm.purpose || formatCompliantPurpose(type, '', formData.name)}&lt;/string&gt;</div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <div className="text-[10px] text-slate-500">// android/app/src/main/AndroidManifest.xml (APK)</div>
                                        <div className="text-amber-300">&lt;uses-permission android:name=&quot;{storeInfo.androidPermission}&quot; /&gt;</div>
                                      </div>
                                      <div className="pt-1.5 border-t border-slate-800 space-y-1">
                                        <div className="text-[10px] text-slate-500">// Google Play Store Prominent In-App Disclosure Dialog</div>
                                        <div className="text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800 text-[10px]">
                                          &quot;{activePerm.purpose || formatCompliantPurpose(type, '', formData.name)}&quot;
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Request Custom Permission */}
      <div className="mt-8 border-t border-slate-200 dark:border-slate-700/50 pt-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Request New Capability</h3>
        <p className="text-xs text-slate-500 mb-4">
          If your Mini App requires a capability not listed above, specify it here to generate a Permission Proposal for the Super App review committee.
        </p>
        <div className="flex space-x-3">
          <Input
            value={customPermission}
            onChange={(e) => setCustomPermission(e.target.value)}
            placeholder="e.g. Bluetooth, NFC, Contacts, Storage"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (customPermission && !formData.permissions?.find((p: any) => p.type.toLowerCase() === customPermission.toLowerCase())) {
                  togglePermission(customPermission);
                  setCustomPermission('');
                }
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              if (customPermission && !formData.permissions?.find((p: any) => p.type.toLowerCase() === customPermission.toLowerCase())) {
                togglePermission(customPermission);
                setCustomPermission('');
              }
            }}
          >
            Add Request
          </Button>
        </div>
      </div>
    </div>
  );
}
