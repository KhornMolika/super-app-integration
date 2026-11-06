'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { Button } from '@/components/ui/inputs';
import {
  BuildingIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CheckIcon,
  XIcon,
  CameraIcon,
  HashIcon,
  AlertTriangleIcon,
} from '@/components/ui/Icons';
import { normalizeAssetUrl } from '@/lib/asset-utils';
import { getOrgInitialCode } from './OrganizationAvatar';
import { OrganizationSelect } from './OrganizationSelect';

export interface OrganizationFormData {
  name: string;
  code: string;
  parentId?: string | null;
  parentAuthority?: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  logo?: string | null;
  logoFile?: File | null;
}

interface OrganizationModalProps {
  isOpen: boolean;
  editingOrg: Organization | null;
  availableOrganizations?: Organization[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (formData: OrganizationFormData) => Promise<void>;
}

export function OrganizationModal({
  isOpen,
  editingOrg,
  availableOrganizations = [],
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: OrganizationModalProps) {
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    code: '',
    parentId: null,
    parentAuthority: '',
    description: '',
    status: 'ACTIVE',
    logo: null,
    logoFile: null,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRoot = isRootOrganization(editingOrg);

  const availableParents = useMemo(() => {
    return availableOrganizations.filter(
      (org) => (!editingOrg || org.id !== editingOrg.id) && org.status === 'ACTIVE'
    );
  }, [availableOrganizations, editingOrg]);

  // Sync state when modal opens or editing entity changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingOrg) {
      setFormData({
        name: editingOrg.name || '',
        code: editingOrg.code || '',
        parentId: editingOrg.parentId ?? (editingOrg.parent?.id || null),
        parentAuthority: editingOrg.parent?.name || editingOrg.parentAuthority || '',
        description: editingOrg.description || '',
        status: editingOrg.status || 'ACTIVE',
        logo: editingOrg.logo || null,
        logoFile: null,
      });
      setLogoPreview(editingOrg.logo ? normalizeAssetUrl(editingOrg.logo) || editingOrg.logo : null);
    } else {
      setFormData({
        name: '',
        code: '',
        parentId: null,
        parentAuthority: '',
        description: '',
        status: 'ACTIVE',
        logo: null,
        logoFile: null,
      });
      setLogoPreview(null);
      setLogoError(null);
    }
  }, [editingOrg, isOpen]);

  // Prevent body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    setLogoError(null);

    // 1. MIME Type Validation
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setLogoError('Unsupported format. Please upload a valid PNG, JPG, WebP, or SVG file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Maximum File Size Limit (2MB standard)
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image size exceeds 2MB limit (recommended: 512×512 px square under 1MB).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. For SVG files, accept directly as scalable vector
    if (file.type === 'image/svg+xml') {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setFormData((prev) => ({ ...prev, logoFile: file }));
      setLogoError(null);
      return;
    }

    // 4. Decode raster image to validate dimensions & aspect ratio
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const ratio = width / height;

      // Check 1: 1:1 Aspect Ratio Standard (tolerance 0.80 to 1.25)
      if (ratio < 0.80 || ratio > 1.25) {
        setLogoError(
          `Non-standard aspect ratio (${width}×${height} px). Organization logos must be 1:1 square (512×512 px recommended). Please crop your logo to a square and upload again.`
        );
        URL.revokeObjectURL(objectUrl);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Check 2: Minimum Resolution (128x128 px)
      if (width < 128 || height < 128) {
        setLogoError(
          `Resolution too low (${width}×${height} px). Minimum required logo size is 128×128 px (512×512 px recommended). Please upload a higher resolution image.`
        );
        URL.revokeObjectURL(objectUrl);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Compliant standard organization logo
      setLogoPreview(objectUrl);
      setFormData((prev) => ({ ...prev, logoFile: file }));
      setLogoError(null);
    };

    img.onerror = () => {
      setLogoError('Failed to decode image. Please upload a valid PNG, JPG, or WebP image.');
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    img.src = objectUrl;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoError(null);
    setFormData((prev) => ({ ...prev, logo: null, logoFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  // Live dynamic initial org code for the round avatar badge
  const liveInitials = getOrgInitialCode(formData.name, formData.code);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 max-w-xl w-full p-5 sm:p-7 shadow-2xl my-auto z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Ambient Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/60 dark:from-brand-500/10 dark:to-brand-600/20 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-500/20 flex items-center justify-center shadow-xs shrink-0">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="org-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {editingOrg ? 'Edit Organization' : 'Create Organization'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {editingOrg
                  ? 'Update organizational profile, authority links, and operational status.'
                  : 'Register a new regulatory entity or supervisory authority.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 flex items-center gap-2.5 shadow-2xs">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Logo & Branding (Round Avatar Preview & Validation) */}
          <div className="space-y-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                isDragging
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-500/10 ring-2 ring-brand-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40'
              }`}
            >
              {/* Interactive Round Avatar */}
              <div
                onClick={() => fileInputRef.current?.click()}
                title="Click to select logo"
                className="relative group w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden shrink-0 shadow-md ring-4 ring-white dark:ring-slate-800 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer transition-transform group-hover:scale-105"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div
                    className={`w-full h-full font-mono font-bold flex items-center justify-center text-base sm:text-lg select-none transition-colors ${
                      isRoot
                        ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white'
                        : 'bg-gradient-to-br from-brand-600 to-brand-800 text-white'
                    }`}
                  >
                    {liveInitials}
                  </div>
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    {logoPreview ? 'Change' : 'Upload'}
                  </span>
                </div>
              </div>

              {/* Upload Controls & Metadata */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Organization Logo & Avatar
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                    Round Avatar
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-3 text-xs font-medium rounded-xl gap-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs"
                  >
                    <CameraIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{logoPreview ? 'Change Logo' : 'Select Logo'}</span>
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="h-8 px-2.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl gap-1"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 leading-tight">
                  1:1 Square PNG, JPG, SVG, or WEBP (max 2MB). Falls back to initial code badge.
                </p>
              </div>
            </div>

            {/* Validation Error Feedback */}
            {logoError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangleIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{logoError}</span>
              </div>
            )}
          </div>

          {/* Section 2: Organization Name */}
          <div>
            <label
              htmlFor="org-name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Organization Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Insurance Regulator of Cambodia"
              required
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
            />
          </div>

          {/* Section 3: Two-column grid (Short Code + Parent Authority) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Short Code / Acronym */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="org-code"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <HashIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Short Code / Acronym</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>
              <input
                id="org-code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. IRC, SERC, FTC"
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 font-mono text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">
                Generates avatar badges & navigation prefixes.
              </p>
            </div>

            {/* Parent Authority (Searchable Dropdown) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="org-parent"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Parent Authority</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Hierarchy</span>
              </div>
              {isRoot ? (
                <div className="h-11 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 select-none">
                  <ShieldCheckIcon className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Primary Authority Root</span>
                </div>
              ) : (
                <OrganizationSelect
                  id="org-parent"
                  organizations={availableParents}
                  value={formData.parentId}
                  placeholder="Select Parent Authority (Optional)..."
                  allowClear={true}
                  clearLabel="None (No Parent / Independent)"
                  excludeOrgId={editingOrg?.id}
                  onChange={(selId, matchedOrg) => {
                    setFormData({
                      ...formData,
                      parentId: selId || null,
                      parentAuthority: matchedOrg?.name || '',
                    });
                  }}
                />
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">
                Parent regulatory or ministerial supervisory body.
              </p>
            </div>
          </div>

          {/* Section 4: Mandate & Description */}
          <div>
            <label
              htmlFor="org-desc"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Regulatory Mandate & Scope
            </label>
            <textarea
              id="org-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Regulatory mandate, supervisory purview, and public role under the FSA..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs resize-none"
              rows={3}
            />
          </div>

          {/* Section 5: Modern Segmented Operational Status Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Operational Status
            </label>
            {isRoot ? (
              <div className="p-3.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold">ACTIVE (Protected Root)</span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                  Primary authority must remain ACTIVE
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Active Card */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    formData.status === 'ACTIVE'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>ACTIVE</span>
                      {formData.status === 'ACTIVE' && (
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Operational and active in directory
                    </div>
                  </div>
                </button>

                {/* Inactive Card */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'INACTIVE' })}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    formData.status === 'INACTIVE'
                      ? 'border-slate-400 bg-slate-100/70 dark:bg-slate-800 ring-2 ring-slate-400/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="mt-1 w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>INACTIVE</span>
                      {formData.status === 'INACTIVE' && (
                        <CheckIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Suspended / restricted access
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <XIcon className="w-4 h-4" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 active:from-brand-700 active:to-brand-800 text-white font-semibold text-xs gap-2 shadow-md shadow-brand-700/20 hover:shadow-lg hover:shadow-brand-700/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
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
