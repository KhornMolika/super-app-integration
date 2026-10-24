'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { Button, Input, Label, Select } from '@/components/ui/inputs';
import { BuildingIcon, ShieldCheckIcon, DocumentTextIcon, CheckIcon, XIcon } from '@/components/ui/Icons';

export interface OrganizationFormData {
  name: string;
  code: string;
  parentAuthority: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface OrganizationModalProps {
  isOpen: boolean;
  editingOrg: Organization | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (formData: OrganizationFormData) => Promise<void>;
}

export function OrganizationModal({
  isOpen,
  editingOrg,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: OrganizationModalProps) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    code: '',
    parentAuthority: 'Non-Bank Financial Services Authority',
    description: '',
    status: 'ACTIVE',
  });

  const isRoot = isRootOrganization(editingOrg);

  useEffect(() => {
    if (editingOrg) {
      setFormData({
        name: editingOrg.name || '',
        code: editingOrg.code || '',
        parentAuthority: editingOrg.parentAuthority || 'Non-Bank Financial Services Authority',
        description: editingOrg.description || '',
        status: editingOrg.status || 'ACTIVE',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        parentAuthority: 'Non-Bank Financial Services Authority',
        description: '',
        status: 'ACTIVE',
      });
    }
  }, [editingOrg, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl my-auto z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingOrg ? 'Edit Organization' : 'Register Subordinate Entity'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Non-Bank Financial Services Authority (FSA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Organization Name */}
          <div>
            <Label htmlFor="org-name" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
              Organization Name *
            </Label>
            <Input
              id="org-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Insurance Regulator of Cambodia"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Short Code */}
            <div>
              <Label htmlFor="org-code" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <BuildingIcon className="w-3.5 h-3.5 text-sky-500" />
                Short Code / Acronym
              </Label>
              <Input
                id="org-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. IRC, SERC, FTC"
                className="font-mono"
              />
            </div>

            {/* Parent Authority */}
            <div>
              <Label htmlFor="org-parent" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400" />
                Parent Authority
              </Label>
              <Input
                id="org-parent"
                value={formData.parentAuthority}
                onChange={(e) => setFormData({ ...formData, parentAuthority: e.target.value })}
                placeholder="Non-Bank Financial Services Authority"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="org-desc" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
              Description
            </Label>
            <textarea
              id="org-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Regulatory mandate and supervisory scope under the FSA..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="org-status" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <CheckIcon className="w-3.5 h-3.5 text-slate-400" />
              Status
            </Label>
            <Select
              id="org-status"
              value={formData.status}
              disabled={isRoot}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as 'ACTIVE' | 'INACTIVE',
                })
              }
              className={`w-full text-sm ${isRoot ? 'opacity-70 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : ''}`}
            >
              <option value="ACTIVE">ACTIVE</option>
              {!isRoot && <option value="INACTIVE">INACTIVE</option>}
            </Select>
            {isRoot && (
              <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Regulatory system anchor organization must remain ACTIVE.</span>
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <XIcon className="w-4 h-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>{editingOrg ? 'Save Changes' : 'Register Organization'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
