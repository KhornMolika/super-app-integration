'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Button } from './inputs';

type ConfirmationOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
};

type ConfirmationContextType = {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
};

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context.confirm;
};

export const ConfirmationProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>();

  const confirm = (opts: ConfirmationOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (resolvePromise) resolvePromise(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) resolvePromise(false);
    setIsOpen(false);
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleCancel}></div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-6 pb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{options.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">{options.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-3 border-t border-slate-100 dark:border-slate-700">
              <Button type="button" onClick={handleCancel} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm">
                {options.cancelText || 'Cancel'}
              </Button>
              <Button 
                type="button" 
                onClick={handleConfirm} 
                className={
                  options.confirmVariant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' :
                  options.confirmVariant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' :
                  'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
                }
              >
                {options.confirmText || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};
