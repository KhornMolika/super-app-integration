'use client';

import React from 'react';
import { CreateMiniAppDto, IntegrationMethod } from '@/types/miniapp.types';

export interface ReviewSummaryStepProps {
  formData: Partial<CreateMiniAppDto>;
}

export default function ReviewSummaryStep({ formData }: ReviewSummaryStepProps) {
  return (
    <div className="space-y-6 p-6 text-base">
      {/* 1. Basic Info */}
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          1. Basic Info
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Mini App Name:</span>
            <br />
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formData.name || '-'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Mini App ID:</span>
            <br />
            <span className="font-mono text-sm text-slate-800 dark:text-slate-200">{formData.appId || '-'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Category:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200 font-medium">{formData.category || '-'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Logo:</span>
            <br />
            {formData.logo ? (
              <span className="text-brand-600 truncate block w-full text-sm font-mono">{formData.logo}</span>
            ) : (
              '-'
            )}
          </div>
          {formData.shortDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Short Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.shortDescription}</span>
            </div>
          )}
          {formData.fullDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Full Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.fullDescription}</span>
            </div>
          )}
          {formData.termsUrl && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Terms of Service URL:</span>
              <br />
              <a
                href={formData.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 dark:text-brand-400 underline break-all text-sm"
              >
                {formData.termsUrl}
              </a>
            </div>
          )}
          {formData.termsDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Terms of Service Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.termsDescription}</span>
            </div>
          )}
          {formData.privacyPolicyUrl && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Privacy Policy URL:</span>
              <br />
              <a
                href={formData.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 dark:text-brand-400 underline break-all text-sm"
              >
                {formData.privacyPolicyUrl}
              </a>
            </div>
          )}
          {formData.privacyPolicyDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Privacy Policy Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.privacyPolicyDescription}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Team */}
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          2. Team
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Team Name:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200 font-medium">{formData.teamName || '-'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Owner Name:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200 font-medium">{formData.ownerName || '-'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Owner Email:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200 font-medium">{formData.ownerEmail || '-'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Support Email:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200 font-medium">{formData.supportEmail || '-'}</span>
          </div>
          {formData.teamTelegramChatId && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Team Telegram Channel:</span>
              <br />
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>{formData.teamTelegramChatId}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Integration */}
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          3. Integration
        </h4>
        <div className="mb-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Method:</span>{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.integrationMethod}</span>
        </div>
        {formData.integrationMethod === IntegrationMethod.WEBVIEW && (
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Production URL:</span>{' '}
            <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
              {formData.integrationConfigWebView?.productionUrl || '-'}
            </span>
          </div>
        )}
        {formData.integrationMethod === IntegrationMethod.DEEP_LINK && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">URL Scheme:</span>
              <br />
              <span className="font-mono text-sm">{formData.integrationConfigDeepLink?.urlScheme || '-'}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Package Name:</span>
              <br />
              <span className="font-mono text-sm">{formData.integrationConfigDeepLink?.packageName || '-'}</span>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Store Fallback URL:</span>
              <br />
              <span className="text-sm break-all">{formData.integrationConfigDeepLink?.appStoreUrl || '-'}</span>
            </div>
          </div>
        )}
        {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Source Type:</span>
              <br />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formData.integrationConfigFlutter?.sourceType}
              </span>
            </div>
            {formData.integrationConfigFlutter?.sourceType === 'ARTIFACT' ? (
              <>
                <div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Package Name:</span>
                  <br />
                  <span className="font-mono text-sm">{formData.integrationConfigFlutter?.packageName || '-'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Version:</span>
                  <br />
                  <span className="font-mono text-sm">
                    {formData.integrationConfigFlutter?.versionConstraint || '-'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Git URL:</span>
                  <br />
                  <span className="font-mono text-sm break-all">
                    {formData.integrationConfigFlutter?.gitUrl || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Branch / Ref:</span>
                  <br />
                  <span className="font-mono text-sm">{formData.integrationConfigFlutter?.gitBranch || '-'}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. Permissions & Security Checks */}
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          4. Permissions & Capabilities
        </h4>
        {formData.permissions && formData.permissions.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {formData.permissions.map((p, i) => (
              <li
                key={i}
                className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <strong className="text-slate-900 dark:text-white text-base">{p.type}</strong>
                <div className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Purpose: {p.purpose || '-'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 mb-4 text-base">No special permissions requested.</p>
        )}

        <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Automated Security Checks Selected:
        </h5>
        {formData.securityChecks && formData.securityChecks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {formData.securityChecks.map((chk, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              >
                <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{chk}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400">Default baseline scans will be applied.</span>
        )}
      </div>

      <div className="bg-brand-50 dark:bg-brand-900/20 p-4.5 rounded-xl border border-brand-100 dark:border-brand-800 text-brand-800 dark:text-brand-300 text-base font-medium">
        Please verify all the details above. Clicking register will create your Mini App and submit it for validation.
      </div>
    </div>
  );
}
