'use client';

import React, { useState } from 'react';
import { Input, Label } from '@/components/ui/inputs';
import { NativeSdkConfigDto } from '@/types/miniapp.types';
import { sdkArtifactsApi, SdkArtifactUploadResponse } from '@/api';
import {
  ShieldCheckIcon,
  LockIcon,
  PackageIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TagIcon,
  DevicePhoneIcon,
  ZapIcon,
  CheckIcon,
  XCircleIcon,
  SparklesIcon,
} from '@/components/ui/Icons';

export interface NativeSdkIntegrationFormProps {
  formData: any;
  allErrors?: Record<string, string>;
  handleNativeSdkChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onUpdateNativeSdkConfig?: (
    updates: Partial<NativeSdkConfigDto>,
    extraData?: {
      iosFile?: File;
      androidFile?: File;
      detectedPermissions?: any[];
    },
  ) => void;
  isEditable?: boolean;
}

export default function NativeSdkIntegrationForm({
  formData,
  allErrors = {},
  handleNativeSdkChange,
  onUpdateNativeSdkConfig,
  isEditable = true,
}: NativeSdkIntegrationFormProps) {
  const nativeConfig: Partial<NativeSdkConfigDto> =
    formData.integrationConfigNativeSdk || {};

  // Upload States for iOS
  const [isUploadingIos, setIsUploadingIos] = useState(false);
  const [iosUploadSuccess, setIosUploadSuccess] =
    useState<SdkArtifactUploadResponse | null>(null);
  const [iosUploadError, setIosUploadError] = useState<string | null>(null);

  // Upload States for Android
  const [isUploadingAndroid, setIsUploadingAndroid] = useState(false);
  const [androidUploadSuccess, setAndroidUploadSuccess] =
    useState<SdkArtifactUploadResponse | null>(null);
  const [androidUploadError, setAndroidUploadError] = useState<string | null>(
    null,
  );

  const handleFieldChange = (
    field: keyof NativeSdkConfigDto,
    value: string,
  ) => {
    if (!isEditable) return;
    if (onUpdateNativeSdkConfig) {
      onUpdateNativeSdkConfig({ [field]: value });
    } else if (handleNativeSdkChange) {
      handleNativeSdkChange({
        target: { name: field, value },
      } as any);
    }
  };

  const handleIosFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.xcframework.zip')) {
      setIosUploadError(
        'Invalid iOS artifact. Must be a .zip containing .xcframework.',
      );
      setIosUploadSuccess(null);
      e.target.value = '';
      return;
    }

    setIsUploadingIos(true);
    setIosUploadError(null);
    setIosUploadSuccess(null);

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await sdkArtifactsApi.uploadIos(
        formData.appId || 'draft',
        uploadFormData,
      );
      setIosUploadSuccess(res);

      // Auto-derive iOS module name from filename if not already set
      const derivedModuleName =
        nativeConfig.iosModuleName ||
        file.name
          .replace(/\.xcframework\.zip$/i, '')
          .replace(/\.zip$/i, '')
          .replace(/[^A-Za-z0-9_]/g, '_');

      const derivedTypeName =
        nativeConfig.iosTypeName || `${derivedModuleName}View`;

      const updates: Partial<NativeSdkConfigDto> = {
        iosArtifactFilename: res.filename || file.name,
        iosStoragePath: res.artifactUrl,
        iosChecksum: res.sha256,
        iosSize: res.size,
        iosDetectedPermissions: res.detectedPermissions,
        iosModuleName: derivedModuleName,
        iosTypeName: derivedTypeName,
      };

      if (onUpdateNativeSdkConfig) {
        onUpdateNativeSdkConfig(updates, {
          iosFile: file,
          detectedPermissions: res.detectedPermissions.map((p) => ({
            type: p,
            purpose: `Required for native SDK capability: ${p}`,
          })),
        });
      }
    } catch (err: any) {
      setIosUploadError(
        err.message || 'Failed to stage iOS SDK archive in MinIO quarantine.',
      );
    } finally {
      setIsUploadingIos(false);
    }
  };

  const handleAndroidFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.aar')) {
      setAndroidUploadError('Invalid Android artifact. Must be a .aar file.');
      setAndroidUploadSuccess(null);
      e.target.value = '';
      return;
    }

    setIsUploadingAndroid(true);
    setAndroidUploadError(null);
    setAndroidUploadSuccess(null);

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await sdkArtifactsApi.uploadAndroid(
        formData.appId || 'draft',
        uploadFormData,
      );
      setAndroidUploadSuccess(res);

      // Auto-derive Android artifact name from filename if not set
      const baseName = file.name
        .replace(/\.aar$/i, '')
        .replace(/[^A-Za-z0-9_.-]/g, '-');

      const updates: Partial<NativeSdkConfigDto> = {
        androidArtifactFilename: res.filename || file.name,
        androidStoragePath: res.artifactUrl,
        androidChecksum: res.sha256,
        androidSize: res.size,
        androidMinSdkVersion: res.minSdkVersion,
        androidDetectedPermissions: res.detectedPermissions,
        androidMavenGroupId: nativeConfig.androidMavenGroupId || 'com.fsa.sdk',
        androidMavenArtifactId:
          nativeConfig.androidMavenArtifactId || baseName,
        androidMavenVersion: nativeConfig.androidMavenVersion || '1.0.0',
        androidObjectName:
          nativeConfig.androidObjectName ||
          baseName
            .split(/[-_]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(''),
      };

      if (onUpdateNativeSdkConfig) {
        onUpdateNativeSdkConfig(updates, {
          androidFile: file,
          detectedPermissions: res.detectedPermissions.map((p) => ({
            type: p,
            purpose: `Required for native SDK capability: ${p}`,
          })),
        });
      }
    } catch (err: any) {
      setAndroidUploadError(
        err.message || 'Failed to stage Android AAR in MinIO quarantine.',
      );
    } finally {
      setIsUploadingAndroid(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Zero-Bytes Quarantine Security Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-emerald-50/60 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-emerald-950/20 border border-indigo-200/80 dark:border-indigo-800/60 text-slate-800 dark:text-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Zero-Bytes to Nexus Quarantine Pipeline</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                <LockIcon className="w-3 h-3" />
                <span>Isolated MinIO Staging</span>
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Native SDK binaries (.xcframework.zip and .aar) are staged directly in
              isolated MinIO quarantine storage (<code>sdk-submissions/pending/</code>).
              Automated in-memory security scanning inspects capabilities without disk bloat.
              Zero bytes are published to Nexus Maven or CocoaPods repositories until
              security verification passes and Admin approves.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: iOS Framework & Android AAR Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===================== iOS Framework Section ===================== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
                <DevicePhoneIcon className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  iOS Native Framework (.xcframework.zip)
                </h5>
                <p className="text-xs text-slate-500">
                  Swift / Objective-C CocoaPods binary
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
              iOS Target
            </span>
          </div>

          {/* iOS Upload Area */}
          <div className="p-4 rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-800/80 bg-sky-50/30 dark:bg-sky-950/10 hover:border-sky-400 transition-colors">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <PackageIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {nativeConfig.iosArtifactFilename ||
                      'Upload .xcframework.zip'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Max 200MB • Staged in MinIO quarantine
                  </span>
                </div>
              </div>
              <label
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                  isUploadingIos || !isEditable
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                }`}
              >
                {isUploadingIos ? (
                  <>
                    <svg
                      className="animate-spin w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Staging in MinIO...</span>
                  </>
                ) : (
                  <>
                    <ZapIcon className="w-3.5 h-3.5" />
                    <span>
                      {nativeConfig.iosArtifactFilename
                        ? 'Replace ZIP'
                        : 'Choose File'}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".zip,application/zip"
                  onChange={handleIosFileUpload}
                  disabled={isUploadingIos || !isEditable}
                  className="hidden"
                />
              </label>
            </div>

            {iosUploadError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <XCircleIcon className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{iosUploadError}</span>
              </div>
            )}

            {(iosUploadSuccess || nativeConfig.iosStoragePath) && (
              <div className="mt-3 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    <span>Quarantine Staged &amp; Inspected</span>
                  </span>
                  {(iosUploadSuccess?.sha256 || nativeConfig.iosChecksum) && (
                    <span className="font-mono text-[10px] text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      SHA:{' '}
                      {(
                        iosUploadSuccess?.sha256 || nativeConfig.iosChecksum
                      )?.substring(0, 10)}
                      ...
                    </span>
                  )}
                </div>
                {nativeConfig.iosDetectedPermissions &&
                  nativeConfig.iosDetectedPermissions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] font-medium text-slate-500">
                        Detected Capabilities:
                      </span>
                      {nativeConfig.iosDetectedPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 flex items-center gap-1"
                        >
                          <SparklesIcon className="w-3 h-3 text-sky-600" />
                          <span>{perm}</span>
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* iOS Module & Type Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>iOS Module Name *</span>
              </Label>
              <Input
                name="iosModuleName"
                value={nativeConfig.iosModuleName || ''}
                onChange={(e) =>
                  handleFieldChange('iosModuleName', e.target.value)
                }
                placeholder="e.g. SpaBookingSDK"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              <span className="text-[10px] text-slate-400">
                Identifier imported via <code>import &lt;Module&gt;</code>
              </span>
              {allErrors['integrationConfigNativeSdk.iosModuleName'] && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                  {allErrors['integrationConfigNativeSdk.iosModuleName']}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>iOS Type / View Controller *</span>
              </Label>
              <Input
                name="iosTypeName"
                value={nativeConfig.iosTypeName || ''}
                onChange={(e) =>
                  handleFieldChange('iosTypeName', e.target.value)
                }
                placeholder="e.g. SpaBookingSDKView"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              <span className="text-[10px] text-slate-400">
                Class responding to <code>.initialize()</code> &amp;{' '}
                <code>.present()</code>
              </span>
              {allErrors['integrationConfigNativeSdk.iosTypeName'] && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                  {allErrors['integrationConfigNativeSdk.iosTypeName']}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===================== Android AAR Section ===================== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                <PackageIcon className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  Android Native Archive (.aar)
                </h5>
                <p className="text-xs text-slate-500">
                  Kotlin / Java Maven hosted artifact
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              Android Target
            </span>
          </div>

          {/* Android Upload Area */}
          <div className="p-4 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/10 hover:border-emerald-400 transition-colors">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <PackageIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    {nativeConfig.androidArtifactFilename || 'Upload .aar Binary'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Max 200MB • Staged in MinIO quarantine
                  </span>
                </div>
              </div>
              <label
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                  isUploadingAndroid || !isEditable
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isUploadingAndroid ? (
                  <>
                    <svg
                      className="animate-spin w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Staging in MinIO...</span>
                  </>
                ) : (
                  <>
                    <ZapIcon className="w-3.5 h-3.5" />
                    <span>
                      {nativeConfig.androidArtifactFilename
                        ? 'Replace AAR'
                        : 'Choose File'}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".aar"
                  onChange={handleAndroidFileUpload}
                  disabled={isUploadingAndroid || !isEditable}
                  className="hidden"
                />
              </label>
            </div>

            {androidUploadError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <XCircleIcon className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{androidUploadError}</span>
              </div>
            )}

            {(androidUploadSuccess || nativeConfig.androidStoragePath) && (
              <div className="mt-3 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    <span>Quarantine Staged &amp; Inspected</span>
                  </span>
                  {(androidUploadSuccess?.sha256 ||
                    nativeConfig.androidChecksum) && (
                    <span className="font-mono text-[10px] text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      SHA:{' '}
                      {(
                        androidUploadSuccess?.sha256 ||
                        nativeConfig.androidChecksum
                      )?.substring(0, 10)}
                      ...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-300 flex-wrap">
                  {(androidUploadSuccess?.minSdkVersion ||
                    nativeConfig.androidMinSdkVersion) && (
                    <span className="inline-flex items-center gap-1 font-mono font-semibold">
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                      minSdkVersion:{' '}
                      {androidUploadSuccess?.minSdkVersion ||
                        nativeConfig.androidMinSdkVersion}
                    </span>
                  )}
                  {nativeConfig.androidDetectedPermissions &&
                    nativeConfig.androidDetectedPermissions.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {nativeConfig.androidDetectedPermissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1"
                          >
                            <SparklesIcon className="w-3 h-3 text-emerald-600" />
                            <span>{perm}</span>
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Android Maven Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <TagIcon className="w-3 h-3 text-emerald-600" />
                <span>Maven Group ID *</span>
              </Label>
              <Input
                name="androidMavenGroupId"
                value={nativeConfig.androidMavenGroupId || ''}
                onChange={(e) =>
                  handleFieldChange('androidMavenGroupId', e.target.value)
                }
                placeholder="e.g. com.fsa.sdk"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              {allErrors['integrationConfigNativeSdk.androidMavenGroupId'] && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {allErrors['integrationConfigNativeSdk.androidMavenGroupId']}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <TagIcon className="w-3 h-3 text-emerald-600" />
                <span>Maven Artifact ID *</span>
              </Label>
              <Input
                name="androidMavenArtifactId"
                value={nativeConfig.androidMavenArtifactId || ''}
                onChange={(e) =>
                  handleFieldChange('androidMavenArtifactId', e.target.value)
                }
                placeholder="e.g. spa-booking-sdk"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              {allErrors['integrationConfigNativeSdk.androidMavenArtifactId'] && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {allErrors['integrationConfigNativeSdk.androidMavenArtifactId']}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <TagIcon className="w-3 h-3 text-emerald-600" />
                <span>Maven Version *</span>
              </Label>
              <Input
                name="androidMavenVersion"
                value={nativeConfig.androidMavenVersion || ''}
                onChange={(e) =>
                  handleFieldChange('androidMavenVersion', e.target.value)
                }
                placeholder="e.g. 1.0.0"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              {allErrors['integrationConfigNativeSdk.androidMavenVersion'] && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {allErrors['integrationConfigNativeSdk.androidMavenVersion']}
                </p>
              )}
            </div>
          </div>

          {/* Android Package & Entry Object */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Package Name *</span>
              </Label>
              <Input
                name="androidPackageName"
                value={nativeConfig.androidPackageName || ''}
                onChange={(e) =>
                  handleFieldChange('androidPackageName', e.target.value)
                }
                placeholder="e.g. com.example.spabooking"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              <span className="text-[10px] text-slate-400">
                Target dotted package for Kotlin/Java imports
              </span>
              {allErrors['integrationConfigNativeSdk.androidPackageName'] && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {allErrors['integrationConfigNativeSdk.androidPackageName']}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android Object / Class *</span>
              </Label>
              <Input
                name="androidObjectName"
                value={nativeConfig.androidObjectName || ''}
                onChange={(e) =>
                  handleFieldChange('androidObjectName', e.target.value)
                }
                placeholder="e.g. SpaBookingSDK"
                disabled={!isEditable}
                className="font-mono text-xs mt-1"
              />
              <span className="text-[10px] text-slate-400">
                Entry object responding to <code>.initialize()</code> &amp;{' '}
                <code>.present()</code>
              </span>
              {allErrors['integrationConfigNativeSdk.androidObjectName'] && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {allErrors['integrationConfigNativeSdk.androidObjectName']}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
