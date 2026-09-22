'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

let toastCount = 0;

export const toast = {
  success: (message: string, title?: string, duration = 4000) => {
    emitToast({ id: `toast-${Date.now()}-${++toastCount}`, type: 'success', message, title, duration });
  },
  error: (message: string, title?: string, duration = 5000) => {
    emitToast({ id: `toast-${Date.now()}-${++toastCount}`, type: 'error', message, title, duration });
  },
  warning: (message: string, title?: string, duration = 4500) => {
    emitToast({ id: `toast-${Date.now()}-${++toastCount}`, type: 'warning', message, title, duration });
  },
  info: (message: string, title?: string, duration = 4000) => {
    emitToast({ id: `toast-${Date.now()}-${++toastCount}`, type: 'info', message, title, duration });
  },
};

function emitToast(item: ToastItem) {
  listeners.forEach((listener) => listener(item));
}

interface ToastContextType {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    toasts: ctx?.toasts || [],
    dismiss: ctx?.dismiss || (() => {}),
    toast,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToast: ToastListener = (item) => {
      setToasts((prev) => [...prev.slice(-4), item]); // Keep max 5 toasts

      if (item.duration && item.duration > 0) {
        setTimeout(() => {
          dismiss(item.id);
        }, item.duration);
      }
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, dismiss }}>
      {children}
      {/* Toast Notification Viewport */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 flex items-start justify-between gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md ${
              t.type === 'success'
                ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-rose-500/10'
                : t.type === 'warning'
                ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-amber-500/10'
                : 'bg-indigo-50/95 dark:bg-indigo-950/90 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 shadow-indigo-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                  t.type === 'success'
                    ? 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : t.type === 'error'
                    ? 'bg-rose-200/80 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                    : t.type === 'warning'
                    ? 'bg-amber-200/80 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                    : 'bg-indigo-200/80 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {t.type === 'success' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {t.type === 'error' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {t.type === 'warning' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {t.type === 'info' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="space-y-0.5">
                {t.title && (
                  <div className="font-bold text-sm tracking-tight leading-none">
                    {t.title}
                  </div>
                )}
                <div className="text-xs sm:text-sm font-medium leading-snug break-words">
                  {t.message}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg shrink-0 transition-colors"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
