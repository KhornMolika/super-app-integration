'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/Toast';

export interface ReasonPromptModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  placeholder?: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  required?: boolean;
  quickSuggestions?: string[];
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ReasonPromptModal({
  isOpen,
  title,
  description,
  placeholder = 'Provide detailed feedback or reasons...',
  confirmText = 'Confirm',
  confirmVariant = 'warning',
  required = true,
  quickSuggestions = [],
  onConfirm,
  onClose,
  isLoading = false,
}: ReasonPromptModalProps) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (required && !reason.trim()) {
      toast.warning('A reason or description is required.', 'Input Required');
      return;
    }
    onConfirm(reason.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleChipClick = (suggestion: string) => {
    setReason((prev) => {
      if (!prev.trim()) return suggestion;
      return `${prev.trim()}\n• ${suggestion}`;
    });
    textareaRef.current?.focus();
  };

  const isDanger = confirmVariant === 'danger';
  const isWarning = confirmVariant === 'warning';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={!isLoading ? onClose : undefined}
      />
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-6 p-8 sm:p-9 animate-in zoom-in-95 duration-150 z-10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDanger
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : isWarning
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
              }`}
            >
              {isDanger ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : isWarning ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Suggestions Chips */}
          {quickSuggestions.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Quick Preset Feedback &amp; Decision Templates:
              </span>
              <div className="flex flex-wrap gap-2.5 max-h-40 overflow-y-auto pr-1">
                {quickSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(s)}
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 transition-colors text-left shadow-sm"
                  >
                    <span className="text-brand-600 dark:text-brand-400 font-bold text-base">+</span>
                    <span className="truncate max-w-[420px]">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-base">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                Detailed Feedback / Decision Notes {required && <span className="text-rose-500">*</span>}
              </label>
              <span className="text-xs text-slate-400 font-medium">{reason.length} characters</span>
            </div>
            <textarea
              ref={textareaRef}
              rows={6}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`w-full px-5 py-4 text-base rounded-2xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all resize-y leading-relaxed ${
                isDanger
                  ? 'border-rose-300 dark:border-rose-800/60 focus:ring-rose-500'
                  : isWarning
                  ? 'border-amber-300 dark:border-amber-800/60 focus:ring-amber-500'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-brand-500'
              }`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Press <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold border border-slate-200 dark:border-slate-700">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold border border-slate-200 dark:border-slate-700">Enter</kbd> to submit</span>
              <span>This feedback will be notified directly to the developer</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 text-base font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isLoading || (required && !reason.trim())}
              className={`px-7 py-3 text-base font-bold rounded-xl text-white shadow-md transition-all flex items-center gap-2.5 disabled:opacity-50 active:scale-[0.98] ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  : isWarning
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/25'
              }`}
            >
              {isDanger ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : isWarning ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span>{isLoading ? 'Submitting...' : confirmText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
