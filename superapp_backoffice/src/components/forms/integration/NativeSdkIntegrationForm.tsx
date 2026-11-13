'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Input, Label } from '@/components/ui/inputs';
import { NativeSdkConfigDto } from '@/types/miniapp.types';
import { sdkArtifactsApi, SdkArtifactUploadResponse } from '@/api';
import { deriveNativeSdkDefaults } from '@/lib/integration-utils';
import { CheckIcon } from '@/components/ui/Icons';

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

interface EntryScan {
  detection: 'contract' | 'guess' | 'none';
  candidates: string[];
}

function toEntryScan(detection?: string, candidates?: string[]): EntryScan | null {
  if (!detection) return null;
  return { detection: detection as EntryScan['detection'], candidates: candidates || [] };
}

/** What the scan found for the entry class, under the class name field. */
function EntryClassHint({
  scan,
  contract,
  current,
  onPick,
  disabled,
}: {
  scan: EntryScan | null;
  contract: string;
  current: string;
  onPick: (value: string) => void;
  disabled?: boolean;
}) {
  if (!scan) return null;
  if (scan.detection === 'contract' && scan.candidates.length > 1) {
    return (
      <div className="mt-1.5 space-y-1">
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {scan.candidates.length} classes implement {contract}. Pick one:
        </span>
        <select
          value={scan.candidates.includes(current) ? current : ''}
          onChange={(e) => e.target.value && onPick(e.target.value)}
          disabled={disabled}
          className="w-full font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
        >
          <option value="">Choose...</option>
          {scan.candidates.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    );
  }
  if (scan.detection === 'contract') {
    const ok = scan.candidates.includes(current);
    return (
      <p className={`text-xs mt-1.5 ${ok ? 'text-slate-500 dark:text-slate-400' : 'text-amber-600 dark:text-amber-400'}`}>
        {ok
          ? `Implements ${contract}.`
          : `The class that implements ${contract} is ${scan.candidates[0]}.`}
      </p>
    );
  }
  return (
    <p className="text-xs mt-1.5 text-amber-600 dark:text-amber-400">
      No class in the file implements {contract}, so this name is a guess. The Super App can only open a class that
      implements it.
    </p>
  );
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

  // Scanned / auto-detected notice
  const [detectedNotice, setDetectedNotice] = useState<string | null>(null);
  // Classes in the uploaded file that implement the FSA host contract
  const [androidEntry, setAndroidEntry] = useState<EntryScan | null>(null);
  const [iosEntry, setIosEntry] = useState<EntryScan | null>(null);
  const [showMaven, setShowMaven] = useState(false);
  const mavenHasError = ['androidMavenGroupId', 'androidMavenArtifactId', 'androidMavenVersion'].some(
    (k) => allErrors[`integrationConfigNativeSdk.${k}`],
  );

  // Compute smart standard defaults based on MiniApp name, appId, organization & organizationCode
  const derivedDefaults = useMemo(() => {
    return deriveNativeSdkDefaults(
      formData.name,
      formData.appId,
      formData.organization || formData.teamName,
      formData.organizationCode,
    );
  }, [
    formData.name,
    formData.appId,
    formData.organization,
    formData.organizationCode,
    formData.teamName,
  ]);

  // Seamless auto-detection and auto-fill on mount / profile updates
  useEffect(() => {
    if (!isEditable) return;
    const current = formData.integrationConfigNativeSdk || {};
    const needsAutoFill =
      !current.iosModuleName ||
      !current.iosTypeName ||
      !current.androidPackageName ||
      !current.androidObjectName;

    if (needsAutoFill && (formData.name || formData.appId)) {
      const updates: Partial<NativeSdkConfigDto> = {
        iosModuleName: current.iosModuleName || derivedDefaults.iosModuleName,
        iosTypeName: current.iosTypeName || derivedDefaults.iosTypeName,
        androidMavenGroupId:
          current.androidMavenGroupId || derivedDefaults.androidMavenGroupId,
        androidMavenArtifactId:
          current.androidMavenArtifactId ||
          derivedDefaults.androidMavenArtifactId,
        androidMavenVersion:
          current.androidMavenVersion || derivedDefaults.androidMavenVersion,
        androidPackageName:
          current.androidPackageName || derivedDefaults.androidPackageName,
        androidObjectName:
          current.androidObjectName || derivedDefaults.androidObjectName,
      };

      if (onUpdateNativeSdkConfig) {
        onUpdateNativeSdkConfig(updates);
      } else if (handleNativeSdkChange) {
        Object.entries(updates).forEach(([name, value]) => {
          handleNativeSdkChange({ target: { name, value } } as any);
        });
      }
    }
  }, [
    formData.name,
    formData.appId,
    formData.organization,
    formData.organizationCode,
    formData.teamName,
    derivedDefaults,
    isEditable,
  ]);

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
        'Choose a .zip that contains the .xcframework.',
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
      // Scanned only: the file is kept here and sent to quarantine on submit
      const res: any = await sdkArtifactsApi.inspectIos(uploadFormData);
      setIosUploadSuccess(res);

      // Auto-derive iOS module name from scanned metadata or filename
      const scannedMod = res.scannedFields?.iosModuleName;
      const iosScan = toEntryScan(res.scannedFields?.iosEntryDetection, res.scannedFields?.iosEntryCandidates);
      setIosEntry(iosScan);
      const scannedType =
        res.scannedFields?.iosTypeName ||
        (iosScan?.detection === 'contract' ? iosScan.candidates[0] : undefined);
      const fallbackMod = file.name
        .replace(/\.xcframework\.zip$/i, '')
        .replace(/\.zip$/i, '')
        .replace(/[^A-Za-z0-9_]/g, '_');

      const derivedModuleName =
        scannedMod ||
        nativeConfig.iosModuleName ||
        fallbackMod ||
        derivedDefaults.iosModuleName;

      const derivedTypeName =
        scannedType ||
        (scannedMod ? `${scannedMod}View` : nativeConfig.iosTypeName) ||
        `${derivedModuleName}View` ||
        derivedDefaults.iosTypeName;

      const detected =
        res.detectedPermissions ||
        res.scannedFields?.detectedPermissions ||
        [];

      const updates: Partial<NativeSdkConfigDto> = {
        iosArtifactFilename: res.filename || file.name,
        iosSha256: res.sha256,
        iosChecksum: res.sha256,
        iosSize: res.size || file.size,
        iosDetectedPermissions: detected,
        iosModuleName: derivedModuleName,
        iosTypeName: derivedTypeName,
      };

      if (onUpdateNativeSdkConfig) {
        onUpdateNativeSdkConfig(updates, {
          iosFile: file,
          detectedPermissions: detected.map((p: string) => ({
            type: p,
            purpose: `Required for native SDK capability: ${p}`,
          })),
        });
      }

      setDetectedNotice(
        `Found module ${derivedModuleName} and class ${derivedTypeName} in the iOS file.`,
      );
      setTimeout(() => setDetectedNotice(null), 4500);
    } catch (err: any) {
      setIosUploadError(
        err.message || 'Could not read the iOS SDK archive.',
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
      setAndroidUploadError('Choose an .aar file.');
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
      // Scanned only: the file is kept here and sent to quarantine on submit
      const res: any = await sdkArtifactsApi.inspectAndroid(uploadFormData);
      setAndroidUploadSuccess(res);

      const scanned = res.scannedFields || {};
      const baseName = file.name
        .replace(/\.aar$/i, '')
        .replace(/[^A-Za-z0-9_.-]/g, '-');

      const detected =
        res.detectedPermissions ||
        scanned.detectedPermissions ||
        [];

      const finalMavenGroupId =
        scanned.androidMavenGroupId ||
        nativeConfig.androidMavenGroupId ||
        derivedDefaults.androidMavenGroupId;

      const finalMavenArtifactId =
        scanned.androidMavenArtifactId ||
        nativeConfig.androidMavenArtifactId ||
        baseName ||
        derivedDefaults.androidMavenArtifactId;

      const finalMavenVersion =
        scanned.androidMavenVersion ||
        nativeConfig.androidMavenVersion ||
        '1.0.0';

      const androidScan = toEntryScan(scanned.androidEntryDetection, scanned.androidEntryCandidates);
      setAndroidEntry(androidScan);
      const firstContract =
        androidScan?.detection === 'contract' ? androidScan.candidates[0] : undefined;
      const firstDot = firstContract ? firstContract.lastIndexOf('.') : -1;

      const finalPackageName =
        (firstContract && firstDot > 0 ? firstContract.slice(0, firstDot) : undefined) ||
        scanned.androidPackageName ||
        nativeConfig.androidPackageName ||
        derivedDefaults.androidPackageName;

      const finalObjectName =
        (firstContract ? firstContract.slice(firstDot + 1) : undefined) ||
        scanned.androidObjectName ||
        nativeConfig.androidObjectName ||
        baseName
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('') ||
        derivedDefaults.androidObjectName;

      const updates: Partial<NativeSdkConfigDto> = {
        androidArtifactFilename: res.filename || file.name,
        androidSha256: res.sha256,
        androidChecksum: res.sha256,
        androidSize: res.size || file.size,
        androidMinSdkVersion:
          res.minSdkVersion || scanned.minSdkVersion,
        androidDetectedPermissions: detected,
        androidMavenGroupId: finalMavenGroupId,
        androidMavenArtifactId: finalMavenArtifactId,
        androidMavenVersion: finalMavenVersion,
        androidPackageName: finalPackageName,
        androidObjectName: finalObjectName,
      };

      if (onUpdateNativeSdkConfig) {
        onUpdateNativeSdkConfig(updates, {
          androidFile: file,
          detectedPermissions: detected.map((p: string) => ({
            type: p,
            purpose: `Required for native SDK capability: ${p}`,
          })),
        });
      }

      setDetectedNotice(
        `Found package ${finalPackageName} and class ${finalObjectName} in the Android file.`,
      );
      setTimeout(() => setDetectedNotice(null), 4500);
    } catch (err: any) {
      setAndroidUploadError(
        err.message || 'Could not read the Android AAR.',
      );
    } finally {
      setIsUploadingAndroid(false);
    }
  };

  const err = (key: string) => allErrors[`integrationConfigNativeSdk.${key}`];

  const field = (
    key: keyof NativeSdkConfigDto,
    label: string,
    placeholder: string,
    hint?: React.ReactNode,
  ) => (
    <div>
      <Label htmlFor={`sdk-${key}`}>{label}</Label>
      <Input
        id={`sdk-${key}`}
        name={key}
        value={(nativeConfig[key] as string) || ''}
        onChange={(e) => handleFieldChange(key, e.target.value)}
        placeholder={placeholder}
        disabled={!isEditable}
        className={`font-mono text-sm ${err(key) ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
      />
      {err(key) ? (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{err(key)}</p>
      ) : (
        hint
      )}
    </div>
  );

  const fileButton = (
    hasFile: boolean,
    busy: boolean,
    accept: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  ) => (
    <label
      className={`h-9 px-4 rounded-xl text-sm font-semibold inline-flex items-center shrink-0 ${
        busy || !isEditable
          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
          : hasFile
            ? 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
            : 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer'
      }`}
    >
      {busy ? 'Checking file...' : hasFile ? 'Replace file' : 'Choose file'}
      <input type="file" accept={accept} onChange={onChange} disabled={busy || !isEditable} className="sr-only" />
    </label>
  );

  const fileSummary = (opts: {
    filename?: string;
    sha?: string;
    extra?: string;
    perms?: string[];
  }) => (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 space-y-1">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 min-w-0">
        <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
        <span className="font-mono truncate">{opts.filename || 'File checked'}</span>
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {[opts.extra, opts.sha ? `SHA-256 ${opts.sha.substring(0, 10)}...` : '', 'uploaded when you submit']
          .filter(Boolean)
          .join(' · ')}
      </p>
      {opts.perms && opts.perms.length > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-400">Uses: {opts.perms.join(', ')}</p>
      )}
    </div>
  );

  const hasAndroid = Boolean(androidUploadSuccess || nativeConfig.androidStoragePath || nativeConfig.androidMinioKey);
  const hasIos = Boolean(iosUploadSuccess || nativeConfig.iosStoragePath || nativeConfig.iosMinioKey);
  const minSdk = androidUploadSuccess?.minSdkVersion || nativeConfig.androidMinSdkVersion;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Add the Android library, the iOS framework, or both. Names fill in from the file.
      </p>

      {detectedNotice && <p className="text-xs text-slate-600 dark:text-slate-300">{detectedNotice}</p>}

      {/* Android */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Android</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">An .aar file, up to 200 MB.</p>
          </div>
          {fileButton(Boolean(nativeConfig.androidArtifactFilename), isUploadingAndroid, '.aar', handleAndroidFileUpload)}
        </div>
        {androidUploadError && <p className="text-sm text-rose-600 dark:text-rose-400">{androidUploadError}</p>}
        {hasAndroid &&
          fileSummary({
            filename: nativeConfig.androidArtifactFilename,
            sha: androidUploadSuccess?.sha256 || nativeConfig.androidChecksum,
            extra: minSdk ? `min SDK ${minSdk}` : '',
            perms: nativeConfig.androidDetectedPermissions,
          })}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          {field('androidPackageName', 'Package', 'com.example.myapp')}
          {field(
            'androidObjectName',
            'Entry class',
            'MyAppSdk',
            <EntryClassHint
              scan={androidEntry}
              contract="FSAMiniAppNativeEntry"
              current={[nativeConfig.androidPackageName, nativeConfig.androidObjectName].filter(Boolean).join('.')}
              onPick={(fq) => {
                if (!isEditable) return;
                const dot = fq.lastIndexOf('.');
                const pick = { androidPackageName: fq.slice(0, dot), androidObjectName: fq.slice(dot + 1) };
                if (onUpdateNativeSdkConfig) onUpdateNativeSdkConfig(pick);
                else {
                  handleFieldChange('androidPackageName', pick.androidPackageName);
                  handleFieldChange('androidObjectName', pick.androidObjectName);
                }
              }}
              disabled={!isEditable}
            />,
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMaven((v) => !v)}
            aria-expanded={showMaven || mavenHasError}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {showMaven || mavenHasError ? 'Hide Maven details' : 'Maven details'}
            <span className="font-mono text-slate-400">
              {' '}
              {[nativeConfig.androidMavenGroupId, nativeConfig.androidMavenArtifactId, nativeConfig.androidMavenVersion]
                .filter(Boolean)
                .join(':')}
            </span>
          </button>
          {(showMaven || mavenHasError) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
              {field('androidMavenGroupId', 'Group ID', 'com.example')}
              {field('androidMavenArtifactId', 'Artifact ID', 'my-app-sdk')}
              {field('androidMavenVersion', 'Version', '1.0.0')}
            </div>
          )}
        </div>
      </section>

      {/* iOS */}
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">iOS</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">An .xcframework in a .zip, up to 200 MB.</p>
          </div>
          {fileButton(Boolean(nativeConfig.iosArtifactFilename), isUploadingIos, '.zip,application/zip', handleIosFileUpload)}
        </div>
        {iosUploadError && <p className="text-sm text-rose-600 dark:text-rose-400">{iosUploadError}</p>}
        {hasIos &&
          fileSummary({
            filename: nativeConfig.iosArtifactFilename,
            sha: iosUploadSuccess?.sha256 || nativeConfig.iosChecksum,
            perms: nativeConfig.iosDetectedPermissions,
          })}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          {field('iosModuleName', 'Module', 'MyAppSDK')}
          {field(
            'iosTypeName',
            'Entry class',
            'MyAppSDKView',
            <EntryClassHint
              scan={iosEntry}
              contract="FSAMiniAppNativeProtocol"
              current={nativeConfig.iosTypeName || ''}
              onPick={(v) => handleFieldChange('iosTypeName', v)}
              disabled={!isEditable}
            />,
          )}
        </div>
      </section>
    </div>
  );
}
