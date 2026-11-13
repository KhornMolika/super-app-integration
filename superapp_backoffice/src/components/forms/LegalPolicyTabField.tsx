'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/inputs';
import { ValidatedUrlInput } from '@/components/ui/ValidatedUrlInput';
import { CheckIcon, EyeIcon } from '@/components/ui/Icons';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
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

1. **Acceptance of Terms**: By accessing or using this mini application within the SuperApp container, you agree to be bound by these Terms of Service.
2. **Authorized Use**: This service is provided for legitimate personal or business financial operations authorized under regulatory guidelines.
3. **Data Security**: All transactions are authenticated using end-to-end cryptographic signatures and biometric authorization.
4. **Modifications & Termination**: The provider reserves the right to modify features or suspend access in accordance with regulatory compliance directives.`;

const DEFAULT_PRIVACY_TEMPLATE = `# Privacy Policy

1. **Information Collection**: We only collect necessary operational information required to provide mini-app services (such as account verification and transaction records).
2. **Device Capabilities**: Hardware access (e.g., Biometrics, Camera) is only requested with explicit user consent and processed locally.
3. **Data Protection**: Personal and financial data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never sell user data to third parties.
4. **User Rights**: You may review, export, or request deletion of your session history through the SuperApp privacy center.`;

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

  const tabClass = (active: boolean) =>
    `px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
      active
        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
    }`;
  const isPrivacy = title.toLowerCase().includes('privacy');

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {title}
          {isConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
              <CheckIcon className="w-3 h-3" />
              Added
            </span>
          ) : (
            <span className="text-xs font-normal text-slate-400">Optional</span>
          )}
        </h3>
        <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === 'url'} onClick={() => setActiveTab('url')} className={tabClass(activeTab === 'url')}>
            Link
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'document'} onClick={() => setActiveTab('document')} className={tabClass(activeTab === 'document')}>
            Text
          </button>
        </div>
      </div>

      {activeTab === 'url' ? (
        <ValidatedUrlInput
          name={urlFieldName}
          label={`${title} link`}
          value={urlValue}
          onChange={(e) => onChangeUrl(e.target.value)}
          placeholder={isPrivacy ? 'https://example.com/privacy' : 'https://example.com/terms'}
          optional={true}
          externalError={urlError}
        />
      ) : (
        <div className="space-y-2">
          <Textarea
            rows={6}
            disabled={!isEditable}
            value={descValue}
            onChange={(e) => onChangeDesc(e.target.value)}
            aria-label={`${title} text`}
            placeholder={`Paste the ${title.toLowerCase()} here. Markdown works.`}
            className={`font-mono text-xs sm:text-sm ${descError ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
          />
          {descError && <p className="text-xs text-rose-600 dark:text-rose-400">{descError}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {isEditable && (
              <>
                <input ref={fileInputRef} type="file" accept=".md,.txt,.pdf" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                  Import file
                </button>
                <button type="button" onClick={handleInsertTemplate} className="font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                  Use a template
                </button>
              </>
            )}
            {descValue && descValue.length > 20 && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="ml-auto inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                {showPreview ? 'Hide preview' : 'Preview'}
              </button>
            )}
          </div>

          {showPreview && descValue && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 max-h-56 overflow-y-auto">
              <MarkdownRenderer content={descValue} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
