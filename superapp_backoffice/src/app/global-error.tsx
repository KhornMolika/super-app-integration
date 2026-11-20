'use client';

import React, { useEffect, useState } from 'react';
import { copyText } from '@/lib/clipboard';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error('Root layout critical failure:', error);
  }, [error]);

  const handleCopy = () => {
    const details = {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    copyText(JSON.stringify(details, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <html lang="en">
      <head>
        <title>Application Error | SuperApp Backoffice</title>
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100 shadow-xs">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-800">
              500 • ROOT_LAYOUT_CRITICAL
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Fatal System Error
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              The root application shell encountered an unhandled exception. Reloading the application will usually resolve this.
            </p>
          </div>

          {error.digest && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
              <span className="truncate max-w-[200px]">ID: {error.digest}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
