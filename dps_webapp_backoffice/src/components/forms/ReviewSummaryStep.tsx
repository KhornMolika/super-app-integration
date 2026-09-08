'use client';

import React from 'react';
import { CreateMiniAppDto, IntegrationMethod } from '@/types/miniapp.types';

export interface ReviewSummaryStepProps {
  formData: Partial<CreateMiniAppDto>;
}

export default function ReviewSummaryStep({ formData }: ReviewSummaryStepProps) {
  return (
    <div className="space-y-6 p-6 text-sm">
      {/* 1. Basic Info */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          1. Basic Info
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-500">Mini App Name:</span>
            <br />
            <span className="font-medium text-slate-900 dark:text-slate-100">{formData.name || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Mini App ID:</span>
            <br />
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{formData.appId || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Category:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200">{formData.category || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Logo:</span>
            <br />
            {formData.logo ? (
              <span className="text-brand-600 truncate block w-full text-xs font-mono">{formData.logo}</span>
            ) : (
              '-'
            )}
          </div>
          {formData.shortDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500">Short Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.shortDescription}</span>
            </div>
          )}
          {formData.fullDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500">Full Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.fullDescription}</span>
            </div>
          )}
          {formData.termsUrl && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Terms of Service URL:</span>
              <br />
              <a
                href={formData.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 dark:text-brand-400 underline break-all"
              >
                {formData.termsUrl}
              </a>
            </div>
          )}
          {formData.termsDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Terms of Service Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.termsDescription}</span>
            </div>
          )}
          {formData.privacyPolicyUrl && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Privacy Policy URL:</span>
              <br />
              <a
                href={formData.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 dark:text-brand-400 underline break-all"
              >
                {formData.privacyPolicyUrl}
              </a>
            </div>
          )}
          {formData.privacyPolicyDescription && (
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Privacy Policy Description:</span>
              <br />
              <span className="text-slate-700 dark:text-slate-300">{formData.privacyPolicyDescription}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Team */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          2. Team
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-500">Team Name:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200">{formData.teamName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Owner Name:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200">{formData.ownerName || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Owner Email:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200">{formData.ownerEmail || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">Support Email:</span>
            <br />
            <span className="text-slate-800 dark:text-slate-200">{formData.supportEmail || '-'}</span>
          </div>
        </div>
      </div>

      {/* 3. Integration */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          3. Integration
        </h4>
        <div className="mb-2">
          <span className="text-slate-500">Method:</span>{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.integrationMethod}</span>
        </div>
        {formData.integrationMethod === IntegrationMethod.WEBVIEW && (
          <div>
            <span className="text-slate-500">Production URL:</span>{' '}
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
              {formData.integrationConfigWebView?.productionUrl || '-'}
            </span>
          </div>
        )}
        {formData.integrationMethod === IntegrationMethod.DEEP_LINK && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500">URL Scheme:</span>
              <br />
              <span className="font-mono text-xs">{formData.integrationConfigDeepLink?.urlScheme || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500">Package Name:</span>
              <br />
              <span className="font-mono text-xs">{formData.integrationConfigDeepLink?.packageName || '-'}</span>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <span className="text-slate-500">Store Fallback URL:</span>
              <br />
              <span className="text-xs break-all">{formData.integrationConfigDeepLink?.appStoreUrl || '-'}</span>
            </div>
          </div>
        )}
        {formData.integrationMethod === IntegrationMethod.FLUTTER_PACKAGE && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500">Source Type:</span>
              <br />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formData.integrationConfigFlutter?.sourceType}
              </span>
            </div>
            {formData.integrationConfigFlutter?.sourceType === 'ARTIFACT' ? (
              <>
                <div>
                  <span className="text-slate-500">Package Name:</span>
                  <br />
                  <span className="font-mono text-xs">{formData.integrationConfigFlutter?.packageName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Version:</span>
                  <br />
                  <span className="font-mono text-xs">
                    {formData.integrationConfigFlutter?.versionConstraint || '-'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-slate-500">Git URL:</span>
                  <br />
                  <span className="font-mono text-xs break-all">
                    {formData.integrationConfigFlutter?.gitUrl || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Branch / Ref:</span>
                  <br />
                  <span className="font-mono text-xs">{formData.integrationConfigFlutter?.gitBranch || '-'}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. Permissions & Security Checks */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          4. Permissions & Capabilities
        </h4>
        {formData.permissions && formData.permissions.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {formData.permissions.map((p, i) => (
              <li
                key={i}
                className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
              >
                <strong className="text-slate-900 dark:text-white">{p.type}</strong>
                <div className="text-slate-500 mt-1">Purpose: {p.purpose || '-'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 mb-4">No special permissions requested.</p>
        )}

        <h5 className="font-medium text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Automated Security Checks Selected:
        </h5>
        {formData.securityChecks && formData.securityChecks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {formData.securityChecks.map((chk, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              >
                ✓ {chk}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Default baseline scans will be applied.</span>
        )}
      </div>

      <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl border border-brand-100 dark:border-brand-800 text-brand-700 dark:text-brand-300">
        Please verify all the details above. Clicking register will create your Mini App and submit it for validation.
      </div>
    </div>
  );
}
