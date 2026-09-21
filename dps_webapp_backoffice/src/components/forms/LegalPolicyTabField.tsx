'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Label, Textarea, Button } from '@/components/ui/inputs';
import { ValidatedUrlInput } from '@/components/ui/ValidatedUrlInput';
import {
  GlobeIcon,
  PackageIcon,
  SparklesIcon,
  CheckIcon,
  EyeIcon,
} from '@/components/ui/Icons';
import { IntegrationMethod } from '@/types/miniapp.types';

export interface LegalPolicyTabFieldProps {
  title: string;
  urlFieldName: 'termsUrl' | 'privacyPolicyUrl';
  descFieldName: 'termsDescription' | 'privacyPolicyDescription';
  urlValue?: string;
  descValue?: string;
  onChangeUrl: (val: string) => void;
  onChangeDesc: (val: string) => void;
  integrationMethod?: IntegrationMethod | string;
  urlError?: string;
  descError?: string;
  isEditable?: boolean;
}

const DEFAULT_TERMS_TEMPLATE = `# Terms of Service

1. **Acceptance of Terms**: By accessing or using this mini application within the Super App container, you agree to be bound by these Terms of Service.
2. **Authorized Use**: This service is provided for legitimate personal or business financial operations authorized under regulatory guidelines.
3. **Data Security**: All transactions are authenticated using end-to-end cryptographic signatures and biometric authorization.
4. **Modifications & Termination**: The provider reserves the right to modify features or suspend access in accordance with regulatory compliance directives.`;

const DEFAULT_PRIVACY_TEMPLATE = `# Privacy Policy

1. **Information Collection**: We only collect necessary operational information required to provide mini-app services (such as account verification and transaction records).
2. **Device Capabilities**: Hardware access (e.g., Biometrics, Camera) is only requested with explicit user consent and processed locally.
3. **Data Protection**: Personal and financial data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never sell user data to third parties.
4. **User Rights**: You may review, export, or request deletion of your session history through the Super App privacy center.`;

export default function LegalPolicyTabField({
  title,
  urlFieldName,
  descFieldName,
  urlValue = '',
  descValue = '',
  onChangeUrl,
  onChangeDesc,
  integrationMethod = IntegrationMethod.WEBVIEW,
  urlError,
  descError,
  isEditable = true,
}: LegalPolicyTabFieldProps) {
  const isNativeOrPackage =
    integrationMethod === IntegrationMethod.FLUTTER_PACKAGE ||
    integrationMethod === IntegrationMethod.NATIVE_SDK ||
    integrationMethod === 'FLUTTER_PACKAGE' ||
    integrationMethod === 'NATIVE_SDK';

  const [activeTab, setActiveTab] = useState<'url' | 'document'>(
    isNativeOrPackage && !urlValue && descValue ? 'document' : isNativeOrPackage && !urlValue ? 'document' : 'url'
  );

  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync tab preference when integration method switches and fields are blank
  useEffect(() => {
    if (isNativeOrPackage && !urlValue && (!descValue || descValue.length < 50)) {
      setActiveTab('document');
    } else if (!isNativeOrPackage && !descValue && !urlValue) {
      setActiveTab('url');
    }
  }, [integrationMethod]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onChangeDesc(text);
        }
      };
      reader.readAsText(file);
    } else {
      onChangeDesc(`# ${title} (${file.name})\n\nBundled legal document attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  const handleInsertTemplate = () => {
    const template = title.toLowerCase().includes('privacy')
      ? DEFAULT_PRIVACY_TEMPLATE
      : DEFAULT_TERMS_TEMPLATE;
    onChangeDesc(template);
  };

  const isConfigured = Boolean(
    (activeTab === 'url' && urlValue?.trim()) ||
    (activeTab === 'document' && descValue?.trim())
  );

  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
      {/* Header & Segmented Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h5>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckIcon className="w-2.5 h-2.5" />
                <span>Configured</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Optional</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === 'url'
              ? 'Public web link to policy disclosures.'
              : 'Self-contained offline document or markdown policy text.'}
          </p>
        </div>

        {/* Segmented Pill Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'url'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GlobeIcon className="w-3.5 h-3.5" />
            <span>Live Web URL</span>
            {!isNativeOrPackage && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-medium hidden md:inline">
                Recommended
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'document'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PackageIcon className="w-3.5 h-3.5" />
            <span>Markdown / Document</span>
            {isNativeOrPackage && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium hidden md:inline">
                Offline-Ready
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Live Web URL */}
      {activeTab === 'url' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <ValidatedUrlInput
            name={urlFieldName}
            label={`${title} URL`}
            value={urlValue}
            onChange={(e) => onChangeUrl(e.target.value)}
            placeholder={
              title.toLowerCase().includes('privacy')
                ? 'https://example.com/privacy-policy'
                : 'https://example.com/terms'
            }
            helperText={`Public HTTPS endpoint hosting official ${title.toLowerCase()}.`}
            optional={true}
            externalError={urlError}
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Key Provisions Summary
              </Label>
              <span className="text-[11px] text-slate-400">Optional</span>
            </div>
            <Textarea
              rows={2}
              disabled={!isEditable}
              value={descValue}
              onChange={(e) => onChangeDesc(e.target.value)}
              placeholder={`Brief bullet points or key clauses of the ${title.toLowerCase()}...`}
              className={`text-xs sm:text-sm ${
                descError ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/50' : ''
              }`}
            />
            {descError && <p className="mt-1 text-xs text-rose-600 font-medium">{descError}</p>}
          </div>
        </div>
      )}

      {/* Tab 2: Document / Markdown Text */}
      {activeTab === 'document' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Full {title} Policy Content (Markdown Supported)</span>
            </Label>

            {isEditable && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-2.5 text-xs font-medium inline-flex items-center gap-1 text-slate-600 dark:text-slate-300"
                >
                  <PackageIcon className="w-3.5 h-3.5" />
                  <span>Import .md / .txt File</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInsertTemplate}
                  className="h-8 px-2.5 text-xs font-medium inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/40"
                >
                  <SparklesIcon className="w-3.5 h-3.5 text-brand-500" />
                  <span>Insert Standard Template</span>
                </Button>
              </div>
            )}
          </div>

          <Textarea
            rows={6}
            disabled={!isEditable}
            value={descValue}
            onChange={(e) => onChangeDesc(e.target.value)}
            placeholder={`Enter complete ${title.toLowerCase()} policy clauses, markdown text, or import from a file...`}
            className={`font-mono text-xs sm:text-sm ${
              descError ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/50' : ''
            }`}
          />

          {descError && <p className="mt-1 text-xs text-rose-600 font-medium">{descError}</p>}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{descValue ? `${descValue.length} characters` : 'No text entered'}</span>

            {descValue && descValue.length > 20 && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Hide Preview' : 'Show Rendered Preview'}</span>
              </button>
            )}
          </div>

          {/* Formatted Markdown Preview Drawer */}
          {showPreview && descValue && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed animate-in fade-in duration-150">
              <div className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                <span>Rendered Policy Preview</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Super App Native View</span>
              </div>
              <div>{descValue}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
