import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/inputs';
import { STAGE_CATALOG } from '@/components/ui/ValidationReportTab';
import { getRecommendedChecksForMethod } from '@/components/forms/SecurityValidationSelector';
import {
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  PackageIcon,
  GlobeIcon,
  KeyIcon,
  ShieldIcon,
  ShieldCheckIcon,
  ClipboardCheckIcon,
  LockIcon,
  ZapIcon,
  VirusIcon,
  DocumentTextIcon,
} from '@/components/ui/Icons';

export type ValidationStageItem = {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  details?: string;
  updatedAt?: string;
};

export type SubmissionModalState = {
  isOpen: boolean;
  status: 'loading' | 'success' | 'error';
  message?: string;
  errors?: Record<string, string>;
  createdId?: string;
  stages?: Record<string, ValidationStageItem>;
  securityChecks?: string[];
  integrationMethod?: string;
};

type SubmissionModalProps = {
  state: SubmissionModalState;
  onClose: () => void;
  onRunInBackground: () => void;
  onSuccessContinue: () => void;
  onFixLater?: () => void;
  mode: 'register' | 'manage';
  securityChecks?: string[];
  integrationMethod?: string;
};

function renderStageIcon(id: string, className = "w-4 h-4") {
  switch (id) {
    case 'ingest':
    case 'dependency_scan':
      return <PackageIcon className={className} />;
    case 'ssrf':
    case 'domain_tls_audit':
      return <GlobeIcon className={className} />;
    case 'secret_scan':
      return <KeyIcon className={className} />;
    case 'sast':
      return <ShieldCheckIcon className={className} />;
    case 'csp_headers_audit':
      return <ShieldIcon className={className} />;
    case 'sbom':
      return <ClipboardCheckIcon className={className} />;
    case 'license_compliance':
      return <DocumentTextIcon className={className} />;
    case 'dast_zap':
      return <ZapIcon className={className} />;
    case 'malware_scan':
      return <VirusIcon className={className} />;
    case 'capability_gate':
      return <LockIcon className={className} />;
    default:
      return <ShieldIcon className={className} />;
  }
}

export default function SubmissionModal({
  state,
  onClose,
  onRunInBackground,
  onSuccessContinue,
  mode,
  securityChecks: propSecurityChecks,
  integrationMethod: propIntegrationMethod,
}: SubmissionModalProps) {
  const router = useRouter();
  if (!state.isOpen) return null;

  const stageList = React.useMemo(() => {
    const rawMethod = propIntegrationMethod || state.integrationMethod || 'WEBVIEW';
    const isFlutter = rawMethod === 'FLUTTER_PACKAGE' || rawMethod === 'NATIVE_SDK';
    const activeMethod = rawMethod;

    const rawChecks =
      (propSecurityChecks && propSecurityChecks.length > 0)
        ? propSecurityChecks
        : (state.securityChecks && state.securityChecks.length > 0)
        ? state.securityChecks
        : getRecommendedChecksForMethod(activeMethod);

    // SSRF, TLS, CSP, DAST are strictly web-oriented and do not apply to native package archives
    const WEB_ONLY_CHECKS = new Set(['ssrf', 'domain_tls_audit', 'csp_headers_audit', 'dast_zap']);
    const filteredChecks = isFlutter
      ? rawChecks.filter((k) => !WEB_ONLY_CHECKS.has(k))
      : rawChecks;

    // Flutter baseline is strictly source ingestion & checksum verification; web is SSRF defense
    const baselineKeys = isFlutter ? ['ingest'] : ['ssrf'];
    const allowedKeys = Array.from(new Set([...baselineKeys, ...filteredChecks]));

    const aliasMap: Record<string, string[]> = {
      dast_zap: ['dast_zap', 'zap'],
      domain_tls_audit: ['domain_tls_audit', 'tls'],
      dependency_scan: ['dependency_scan', 'sca'],
      secret_scan: ['secret_scan', 'secrets'],
      sast: ['sast', 'malware_sast'],
      sbom: ['sbom'],
      capability_gate: ['capability_gate'],
      malware_scan: ['malware_scan'],
      license_compliance: ['license_compliance'],
      csp_headers_audit: ['csp_headers_audit'],
      ssrf: ['ssrf'],
      ingest: ['ingest'],
    };

    const stagesMap = state.stages || {};

    return allowedKeys.map((key, idx) => {
      const catalog = STAGE_CATALOG[key];
      const aliases = aliasMap[key] || [key];

      let recorded: any = null;
      for (const a of aliases) {
        if (stagesMap[a]) {
          recorded = stagesMap[a];
          break;
        }
      }

      const defaultName = catalog?.name || key;
      const rawName = recorded?.name
        ? recorded.name.replace(/^\d+\.\s*/, '')
        : defaultName;

      const numPrefix = `${idx + 1}. `;
      const finalName = `${numPrefix}${rawName}`;

      if (recorded) {
        return {
          id: key,
          name: finalName,
          status: recorded.status || 'PENDING',
          details:
            recorded.details ||
            (recorded.status === 'COMPLETED'
              ? 'Verification passed'
              : recorded.status === 'RUNNING'
              ? 'In progress...'
              : `Awaiting ${defaultName}...`),
          icon: catalog?.icon || 'shield',
          tool: catalog?.tool,
          order: idx + 1,
        };
      }

      // Initial state before stages are reported by backend
      return {
        id: key,
        name: finalName,
        status: idx === 0 ? 'RUNNING' : 'PENDING',
        details:
          idx === 0
            ? (key === 'ssrf'
                ? 'Verifying DNS resolution & private IP routes...'
                : key === 'ingest'
                ? 'Unpacking package & verifying cryptographic digest...'
                : 'Initiating security audit...')
            : `Awaiting ${defaultName}...`,
        icon: catalog?.icon || 'shield',
        tool: catalog?.tool,
        order: idx + 1,
      };
    });
  }, [state.stages, state.securityChecks, state.integrationMethod, propSecurityChecks, propIntegrationMethod]);

  const completedCount = stageList.filter((s) => s.status === 'COMPLETED').length;
  const failedCount = stageList.filter((s) => s.status === 'FAILED').length;
  const totalStages = stageList.length;
  const progressPercent = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => {
            if (state.status === 'success' && onSuccessContinue) {
              onSuccessContinue();
            } else {
              onClose();
            }
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 z-10"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* LOADING / AUDIT IN PROGRESS STATE */}
        {state.status === 'loading' && (
          <>
            {/* Header with spinner and progress */}
            <div className="p-6 sm:p-7 pb-4 flex flex-col items-center border-b border-slate-100 dark:border-slate-700/60 shrink-0">
              <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-2.5">
                <svg className="animate-spin w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Automated Security Validation
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mt-0.5 max-w-md">
                Jenkins automated pipeline is auditing your Mini App package in real time.
              </p>

              {/* Progress Bar & Status Pill */}
              <div className="w-full mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>
                      {completedCount} of {totalStages} Stages Verified
                      {failedCount > 0 && ` (${failedCount} failed)`}
                    </span>
                  </span>
                  <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      failedCount > 0 ? 'bg-rose-500' : 'bg-brand-600 dark:bg-brand-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable Stage Stepper Container */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-2.5 max-h-[360px]">
              {stageList.map((stage, idx) => {
                const isCompleted = stage.status === 'COMPLETED';
                const isRunning = stage.status === 'RUNNING';
                const isFailed = stage.status === 'FAILED';

                return (
                  <div
                    key={stage.id || idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      isRunning
                        ? 'bg-brand-50/90 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700 shadow-sm ring-1 ring-brand-200 dark:ring-brand-800/60'
                        : isCompleted
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        : isFailed
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                        : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-700/50 opacity-75'
                    }`}
                  >
                    {/* Status Avatar */}
                    <div className="mt-0.5 shrink-0">
                      {isCompleted && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CheckIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {isRunning && (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <svg className="animate-spin w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <AlertTriangleIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {!isCompleted && !isRunning && !isFailed && (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>
                      )}
                    </div>

                    {/* Stage Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-slate-500 dark:text-slate-400 shrink-0 ${isRunning ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                            {renderStageIcon(stage.id, "w-4 h-4")}
                          </span>
                          <p className={`text-sm font-bold truncate ${
                            isRunning
                              ? 'text-brand-900 dark:text-brand-200'
                              : isCompleted
                              ? 'text-emerald-900 dark:text-emerald-200'
                              : isFailed
                              ? 'text-rose-900 dark:text-rose-200'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {stage.name}
                          </p>
                        </div>

                        <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold shrink-0 ${
                          isRunning
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : isFailed
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {stage.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {stage.details || (isCompleted ? 'Verification passed' : isRunning ? 'In progress...' : 'Pending execution')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-center shrink-0">
              <Button
                variant="outline"
                onClick={onRunInBackground}
                className="h-10 px-5 text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
              >
                <ClockIcon className="w-4 h-4 text-slate-500" />
                <span>Close & Run in Background</span>
              </Button>
            </div>
          </>
        )}

        {/* SUCCESS STATE */}
        {state.status === 'success' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-3.5 text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Validation Succeeded!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
              {state.message || (mode === 'register' ? 'Your mini app has been registered and verified successfully.' : 'Your changes have been saved and verified successfully.')}
            </p>
            {mode === 'register' ? (
              <p className="text-brand-600 text-sm font-semibold animate-pulse flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4" />
                <span>Redirecting to management console...</span>
              </p>
            ) : (
              <Button
                onClick={onSuccessContinue || onClose}
                className="h-10 px-6 text-sm font-semibold inline-flex items-center gap-2"
              >
                <span>Continue Managing</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* ERROR STATE */}
        {state.status === 'error' && (() => {
          const hasErrorEntries = !!(state.errors && Object.keys(state.errors).length > 0);
          return (
            <div className="p-7 flex flex-col items-center">
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center mb-3 text-rose-600 dark:text-rose-400">
                <AlertTriangleIcon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
                {hasErrorEntries ? 'Validation Issues Found' : (mode === 'register' ? 'Registration Failed' : 'Update Failed')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-center text-sm mb-5 max-w-md leading-relaxed">
                {hasErrorEntries 
                  ? (mode === 'register' ? 'Please address the following validation findings before deployment:' : 'Your changes were saved, but require attention:')
                  : (state.message || 'We could not save your changes due to a security validation failure.')}
              </p>
              
              {hasErrorEntries && (
                <div className="w-full bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 mb-5 max-h-56 overflow-y-auto">
                  <ul className="space-y-2.5 text-sm text-rose-800 dark:text-rose-200">
                    {Object.entries(state.errors!).map(([field, err]) => {
                      const cleanErr = typeof err === 'string' ? err.replace(/^[a-zA-Z0-9_.]+:\s*/, '') : String(err);
                      return (
                        <li key={field} className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold mt-0.5">•</span>
                          <div className="flex-1">
                            <span className="font-semibold text-rose-900 dark:text-rose-100">{field}: </span>
                            <span className="font-medium leading-relaxed">{cleanErr}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 h-10 text-sm font-semibold inline-flex items-center justify-center gap-2"
                  onClick={onClose}
                >
                  <XIcon className="w-4 h-4" />
                  <span>{hasErrorEntries ? 'Review Fields' : 'Close'}</span>
                </Button>
                {state.createdId && (
                  <Button
                    className="flex-1 h-10 text-sm font-semibold inline-flex items-center justify-center gap-2"
                    onClick={() => router.push(`/miniapps/${state.createdId}`)}
                  >
                    <ClipboardCheckIcon className="w-4 h-4" />
                    <span>View Full Report</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
