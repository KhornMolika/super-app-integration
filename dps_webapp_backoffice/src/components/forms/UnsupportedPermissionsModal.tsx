'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import { AlertTriangleIcon, CheckIcon, XIcon, ShieldIcon, ArrowRightIcon } from '@/components/ui/Icons';

export interface UnsupportedPermissionsModalProps {
  isOpen: boolean;
  unsupportedPermissions: { type: string; required?: boolean; purpose?: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnsupportedPermissionsModal({
  isOpen,
  unsupportedPermissions = [],
  onConfirm,
  onCancel,
}: UnsupportedPermissionsModalProps) {
  if (!isOpen || unsupportedPermissions.length === 0) return null;

  const hasRequired = unsupportedPermissions.some((p) => p.required !== false);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Dialog */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 shadow-inner">
                <AlertTriangleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Unsupported Capability Warning
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Host Gatekeeper policy review required
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            The Super App host container does not currently whitelist the following declared capabilities:
          </p>

          {/* List of Unsupported Capabilities */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {unsupportedPermissions.map((perm, idx) => {
              const isReq = perm.required !== false;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 capitalize truncate">
                      {perm.type}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 uppercase tracking-wider ${
                      isReq
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isReq ? '● Required' : '○ Optional'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Policy Alert Notice */}
          {hasRequired ? (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                <span>Automated Gatekeeper Rejection Notice</span>
              </div>
              <p className="leading-relaxed">
                Because unwhitelisted capabilities are marked as <strong>Required</strong>, the automated Gatekeeper CI security scan will flag this as a blocking violation (verdict: <strong>FAILED</strong>) during verification.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <ShieldIcon className="w-4 h-4 shrink-0" />
                <span>Graceful Degradation Required</span>
              </div>
              <p className="leading-relaxed">
                These capabilities are unwhitelisted and will be blocked by the Super App sandbox. Because they are marked as <strong>Optional</strong>, ensure your Mini App gracefully handles missing bridge calls without crashing.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto text-sm font-semibold h-10 px-4"
          >
            Go Back &amp; Review
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto text-sm font-semibold h-10 px-5 shadow-sm inline-flex items-center justify-center gap-1.5 ${
              hasRequired
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
            }`}
          >
            <span>Acknowledge &amp; Proceed</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
