'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import { AlertTriangleIcon, CheckIcon, XIcon, ShieldIcon, ArrowRightIcon } from '@/components/ui/Icons';

export interface UnsupportedCapabilitiesModalProps {
  isOpen: boolean;
  unsupportedCapabilities?: { type: string; required?: boolean; purpose?: string }[];
  unsupportedPermissions?: { type: string; required?: boolean; purpose?: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnsupportedCapabilitiesModal({
  isOpen,
  unsupportedCapabilities,
  unsupportedPermissions,
  onConfirm,
  onCancel,
}: UnsupportedCapabilitiesModalProps) {
  const items = unsupportedCapabilities || unsupportedPermissions || [];
  if (!isOpen || items.length === 0) return null;

  const hasRequired = items.some((p) => p.required !== false);

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
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-inner">
                <ShieldIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Capability Extension Request
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  SuperApp Host Container Integration
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
            The following declared capabilities are requested for this MiniApp and require host container runtime support:
          </p>

          {/* List of Unsupported Capabilities */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {items.map((perm, idx) => {
              const isReq = perm.required !== false;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 capitalize truncate">
                      {perm.type}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 uppercase tracking-wider ${
                      isReq
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
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
          <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
              <ShieldIcon className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
              <span>Automated Capability Proposal</span>
            </div>
            <p className="leading-relaxed">
              Clicking <strong>Submit Proposal &amp; Proceed</strong> will automatically submit a Capability Proposal to SuperApp platform administrators. Once approved, the automated code generator will create a branch and Merge Request to inject support into the host shell.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto text-sm font-semibold h-10 px-4"
          >
            Back to Edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto text-sm font-semibold h-10 px-5 shadow-sm inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20"
          >
            <span>Submit Proposal &amp; Proceed</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export { UnsupportedCapabilitiesModal as UnsupportedPermissionsModal };
export type UnsupportedPermissionsModalProps = UnsupportedCapabilitiesModalProps;
