import React from 'react';
import { Button } from '@/components/ui/inputs';

export type SubmissionModalState = {
  isOpen: boolean;
  status: 'loading' | 'success' | 'error';
  message?: string;
  errors?: Record<string, string>;
  createdId?: string;
};

type SubmissionModalProps = {
  state: SubmissionModalState;
  onClose: () => void;
  onRunInBackground: () => void;
  onSuccessContinue: () => void;
  onFixLater?: () => void;
  mode: 'register' | 'manage';
};

export default function SubmissionModal({ state, onClose, onRunInBackground, onSuccessContinue, mode }: SubmissionModalProps) {
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-2xl relative flex flex-col items-center">
        {state.status === 'loading' && (
          <>
            <svg className="animate-spin w-12 h-12 text-brand-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Validating Configuration</h3>
            <p className="text-slate-500 text-center text-sm mb-6">We are verifying your URLs and integration settings. You can wait here, or close this window and check back later.</p>
            <Button variant="outline" onClick={onRunInBackground}>Close & Run in Background</Button>
          </>
        )}
        
        {state.status === 'success' && (
          <>
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Success!</h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              {mode === 'register' ? 'Your mini app has been registered successfully.' : 'Your changes have been saved successfully.'}
            </p>
            {mode === 'register' ? (
              <p className="text-brand-600 text-sm font-medium animate-pulse">Redirecting to management page...</p>
            ) : (
              <Button onClick={onSuccessContinue}>Continue Managing</Button>
            )}
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {state.errors ? 'Validation Issues Found' : (mode === 'register' ? 'Registration Failed' : 'Update Failed')}
            </h3>
            <p className="text-slate-500 text-center text-sm mb-4">
              {state.errors 
                ? (mode === 'register' ? 'Please fix the following validation issues:' : 'Your changes were saved, but have the following issues:')
                : (state.message || 'We could not save your changes due to a system error.')}
            </p>
            
            {state.errors && (
              <div className="w-full bg-rose-50 dark:bg-rose-900/20 p-5 rounded-xl border border-rose-200 dark:border-rose-800/50 mb-6 max-h-72 overflow-y-auto">
                <ul className="space-y-2.5 text-sm text-rose-800 dark:text-rose-200">
                  {Object.entries(state.errors).map(([field, err]) => {
                    // Make raw field keys friendly: e.g. "permissions.0.termsUrl" -> "Biometrics Terms/Policy URL"
                    let friendlyLabel = field;
                    if (field.includes('termsUrl')) friendlyLabel = 'Terms & Policy URL';
                    else if (field.includes('purpose')) friendlyLabel = 'Permission Purpose';
                    else if (field.includes('productionUrl')) friendlyLabel = 'Production URL';
                    else if (field.includes('stagingUrl')) friendlyLabel = 'Staging URL';
                    else if (field.includes('ownerEmail')) friendlyLabel = 'Owner Email';
                    else if (field.includes('supportEmail')) friendlyLabel = 'Support Email';
                    else if (field.includes('logo')) friendlyLabel = 'Logo URL';

                    return (
                      <li key={field} className="flex items-start space-x-2">
                        <span className="text-rose-500 font-bold mt-0.5">•</span>
                        <div className="flex-1">
                          <span className="font-semibold text-rose-900 dark:text-rose-100">{friendlyLabel}: </span>
                          <span className="text-rose-700 dark:text-rose-300">{err}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

                        <div className="flex space-x-3 w-full">
              <Button className="flex-1" onClick={onClose}>
                {state.errors ? 'Review Fields' : 'Close'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
