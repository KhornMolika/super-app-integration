import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/inputs';

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
};

type SubmissionModalProps = {
  state: SubmissionModalState;
  onClose: () => void;
  onRunInBackground: () => void;
  onSuccessContinue: () => void;
  onFixLater?: () => void;
  mode: 'register' | 'manage';
};

const ORDERED_STAGES: Array<{ id: string; name: string; defaultDetails: string }> = [
  { id: 'ssrf', name: '1. Pre-Flight & SSRF Defense', defaultDetails: 'Verifying DNS resolution & private IP routes...' },
  { id: 'tls', name: '2. TLS & HTTPS Security', defaultDetails: 'Awaiting cipher suite & protocol audit' },
  { id: 'zap', name: '3. OWASP ZAP DAST Scan', defaultDetails: 'Awaiting baseline spider, XSS & CSP header audit' },
  { id: 'nuclei', name: '4. Exposure & Vulnerability Audit', defaultDetails: 'Awaiting CVE, .env, and secret exposure audit' },
];

export default function SubmissionModal({ state, onClose, onRunInBackground, onSuccessContinue, mode }: SubmissionModalProps) {
  const router = useRouter();
  if (!state.isOpen) return null;

  const stageList: Array<{ id: string; name: string; status: string; details?: string; icon?: string; tool?: string; order?: number }> = React.useMemo(() => {
    if (state.stages && Object.keys(state.stages).length > 0) {
      const list = Object.values(state.stages).map((s: any) => {
        const numMatch = typeof s.name === 'string' ? s.name.match(/^(\d+)\./) : null;
        const parsedOrder = s.order !== undefined ? Number(s.order) : (numMatch ? parseInt(numMatch[1], 10) : 999);
        return {
          id: s.id || s.name,
          name: s.name || s.id,
          status: s.status || 'PENDING',
          details: s.details,
          icon: s.icon,
          tool: s.tool,
          order: parsedOrder,
        };
      });

      return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }
    return ORDERED_STAGES.map((item, idx) => {
      return {
        id: item.id,
        name: item.name,
        status: item.id === 'ssrf' ? 'RUNNING' : 'PENDING',
        details: item.defaultDetails,
        order: idx + 1,
      };
    });
  }, [state.stages]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-2xl relative flex flex-col items-center">
        <button
          type="button"
          onClick={() => {
            if (state.status === 'success' && onSuccessContinue) {
              onSuccessContinue();
            } else {
              onClose();
            }
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {state.status === 'loading' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-3">
              <svg className="animate-spin w-8 h-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Automated Security Validation</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center text-base mb-6 leading-relaxed">
              Jenkins automated pipeline is auditing your Mini App endpoint in real time.
            </p>

            {/* Real-time Stage Progression Stepper */}
            <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3 mb-6">
              {stageList.map((stage, idx) => {
                const isCompleted = stage.status === 'COMPLETED';
                const isRunning = stage.status === 'RUNNING';
                const isFailed = stage.status === 'FAILED';

                return (
                  <div
                    key={stage.id || idx}
                    className={`flex items-start space-x-3 p-3.5 rounded-lg border transition-all duration-300 ${
                      isRunning
                        ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
                        : isFailed
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40'
                        : 'bg-white/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/40 opacity-75'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isCompleted && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
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
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      {!isCompleted && !isRunning && !isFailed && (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-base font-semibold truncate ${
                          isRunning
                            ? 'text-brand-700 dark:text-brand-300'
                            : isCompleted
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : isFailed
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {stage.name}
                        </p>
                        <span className={`text-xs sm:text-sm px-2.5 py-0.5 rounded font-mono font-semibold ${
                          isRunning
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : isFailed
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {stage.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {stage.details || (isCompleted ? 'Verification passed' : isRunning ? 'In progress...' : 'Pending execution')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={onRunInBackground} className="h-11 px-6 text-base font-semibold">
              Close & Run in Background
            </Button>
          </div>
        )}
        
        {state.status === 'success' && (
          <>
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Success!</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center text-base mb-6 leading-relaxed">
              {state.message || (mode === 'register' ? 'Your mini app has been registered successfully.' : 'Your changes have been saved successfully.')}
            </p>
            {mode === 'register' ? (
              <p className="text-brand-600 text-base font-semibold animate-pulse">Redirecting to management page...</p>
            ) : (
              <Button onClick={onSuccessContinue || onClose} className="h-11 px-6 text-base font-semibold">Continue Managing</Button>
            )}
          </>
        )}

        {state.status === 'error' && (() => {
          const hasErrorEntries = !!(state.errors && Object.keys(state.errors).length > 0);
          return (
            <>
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {hasErrorEntries ? 'Validation Issues Found' : (mode === 'register' ? 'Registration Failed' : 'Update Failed')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-center text-base mb-4 leading-relaxed">
                {hasErrorEntries 
                  ? (mode === 'register' ? 'Please fix the following validation issues:' : 'Your changes were saved, but have the following issues:')
                  : (state.message || 'We could not save your changes due to a validation failure.')}
              </p>
              
              {hasErrorEntries && (
                <div className="w-full bg-rose-50 dark:bg-rose-900/20 p-5 rounded-xl border border-rose-200 dark:border-rose-800/50 mb-6 max-h-72 overflow-y-auto">
                  <ul className="space-y-3 text-base text-rose-800 dark:text-rose-200">
                    {Object.entries(state.errors!).map(([field, err]) => {
                      const cleanErr = typeof err === 'string' ? err.replace(/^[a-zA-Z0-9_.]+:\s*/, '') : String(err);
                      return (
                        <li key={field} className="flex items-start space-x-2.5">
                          <span className="text-rose-500 font-bold mt-0.5">•</span>
                          <div className="flex-1">
                            <span className="text-rose-800 dark:text-rose-200 font-medium leading-relaxed">{cleanErr}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3 w-full">
                <Button variant="outline" className="flex-1 h-11 text-base font-semibold" onClick={onClose}>
                  {hasErrorEntries ? 'Review Fields' : 'Close'}
                </Button>
                {state.createdId && (
                  <Button className="flex-1 h-11 text-base font-semibold" onClick={() => router.push(`/miniapps/${state.createdId}`)}>
                    View Full Report
                  </Button>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
