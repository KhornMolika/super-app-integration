'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Organization } from '@/api/organizations.api';
import { Button } from '@/components/ui/inputs';
import { BuildingIcon, ShieldCheckIcon, DocumentTextIcon, XIcon } from '@/components/ui/Icons';

interface OrganizationViewModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (org: Organization) => void;
}

export function OrganizationViewModal({
  organization,
  isOpen,
  onClose,
  onEdit,
}: OrganizationViewModalProps) {
  if (!isOpen || !organization) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl my-auto z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-500/20">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Organization Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registered non-bank financial regulatory authority
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Details */}
        <div className="py-5 space-y-4">
          {/* Organization Name & Code */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </span>
              {organization.code && (
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                  {organization.code}
                </span>
              )}
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {organization.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Parent Authority */}
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Parent Authority</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {organization.parentAuthority || 'Non-Bank Financial Services Authority'}
              </div>
            </div>

            {/* Status */}
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Operational Status
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                    organization.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      organization.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <span>{organization.status}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Description / Mandate</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {organization.description || (
                <span className="text-slate-400 italic">No description provided.</span>
              )}
            </p>
          </div>

          {/* System Metadata (ID & Timestamps) */}
          <div className="pt-2 text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="text-slate-600 dark:text-slate-300">{organization.id}</span>
            </div>
            {organization.createdAt && (
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              onEdit(organization);
            }}
            className="text-xs"
          >
            Edit Organization
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
