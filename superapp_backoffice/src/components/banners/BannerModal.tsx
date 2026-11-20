'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Package,
  Compass,
  Eye,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { bannersApi, miniappsApi, MiniApp, unwrapData } from '@/api';
import type {
  SuperAppBanner,
  BannerActionType,
  BannerAudience,
} from '@/types/banner.types';

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBanner: SuperAppBanner | null;
  onSuccess: () => void;
}

export function BannerModal({
  isOpen,
  onClose,
  editingBanner,
  onSuccess,
}: BannerModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MiniApps for action selector
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<BannerActionType>('NONE');
  const [actionValue, setActionValue] = useState('');
  const [targetAudience, setTargetAudience] =
    useState<BannerAudience>('PUBLIC');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Image State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch mini apps when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    setLoadingApps(true);
    miniappsApi
      .getAll({ limit: 100 })
      .then((res) => {
        if (!isSubscribed) return;
        const apps = unwrapData<MiniApp>(res);
        setMiniApps(apps);
      })
      .catch((err) => {
        console.error('Failed to load mini apps for banner selector', err);
      })
      .finally(() => {
        if (isSubscribed) setLoadingApps(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  // Sync form data with editing banner
  useEffect(() => {
    if (!isOpen) return;

    if (editingBanner) {
      setTitle(editingBanner.title);
      setDescription(editingBanner.description || '');
      setActionType(editingBanner.actionType || 'NONE');
      setActionValue(editingBanner.actionValue || '');
      setTargetAudience(editingBanner.targetAudience || 'PUBLIC');
      setIsActive(editingBanner.isActive);
      setStartDate(
        editingBanner.startDate
          ? new Date(editingBanner.startDate).toISOString().slice(0, 16)
          : '',
      );
      setEndDate(
        editingBanner.endDate
          ? new Date(editingBanner.endDate).toISOString().slice(0, 16)
          : '',
      );
      setPreviewUrl(editingBanner.imageUrl || null);
      setSelectedFile(null);
    } else {
      setTitle('');
      setDescription('');
      setActionType('NONE');
      setActionValue('');
      setTargetAudience('PUBLIC');
      setIsActive(true);
      setStartDate('');
      setEndDate('');
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [isOpen, editingBanner]);

  if (!isOpen || !mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP).', 'Invalid File');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file size must be less than 5 MB.', 'File Too Large');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Banner title is required.', 'Validation Error');
      return;
    }

    if (!editingBanner && !selectedFile && !previewUrl) {
      toast.error('A banner image is required.', 'Validation Error');
      return;
    }

    if (actionType === 'EXTERNAL_URL' && actionValue) {
      try {
        new URL(actionValue);
      } catch {
        toast.error('Please enter a valid URL (including https://).', 'Validation Error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('actionType', actionType);
      formData.append('actionValue', actionValue.trim());
      formData.append('targetAudience', targetAudience);
      formData.append('isActive', String(isActive));

      if (startDate) {
        formData.append('startDate', new Date(startDate).toISOString());
      }
      if (endDate) {
        formData.append('endDate', new Date(endDate).toISOString());
      }

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingBanner) {
        await bannersApi.update(editingBanner.id, formData);
        toast.success(`Banner "${title}" has been successfully updated.`, 'Banner Updated');
      } else {
        await bannersApi.create(formData);
        toast.success(`Banner "${title}" has been successfully created.`, 'Banner Created');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'An unexpected error occurred.', 'Error Saving Banner');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingBanner ? 'Edit Banner' : 'Create SuperApp Banner'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure hero carousel banners displayed on mobile SuperApp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Banner Image (Recommended: 2.5:1 ratio, e.g. 1000x400)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-[21/9] sm:aspect-[2.5/1] w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-900 group"
            >
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Click to change image</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      Click to upload
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {' '}
                      or drag and drop
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    PNG, JPG or WEBP (Max 5MB)
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pay Taxes Fast with Cambodia Tax"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Description / Subtitle
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional promotional details or subtitle..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Action Destination Config */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Tap Action Destination
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionType('NONE');
                  setActionValue('');
                }}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  actionType === 'NONE'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>None (Display)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('MINI_APP')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  actionType === 'MINI_APP'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-400 dark:text-cyan-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>MiniApp</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('EXTERNAL_URL')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  actionType === 'EXTERNAL_URL'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:border-purple-400 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>External URL</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('IN_APP_ROUTE')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  actionType === 'IN_APP_ROUTE'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-400 dark:text-amber-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>App Route</span>
              </button>
            </div>

            {/* Dynamic Value Input */}
            {actionType === 'MINI_APP' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Select MiniApp to Launch
                </label>
                {loadingApps ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading mini apps...</span>
                  </div>
                ) : (
                  <select
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Select MiniApp --</option>
                    {miniApps.map((app) => (
                      <option key={app.id} value={app.appId}>
                        {app.name} ({app.appId})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {actionType === 'EXTERNAL_URL' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  External Web Link (HTTPS)
                </label>
                <input
                  type="url"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="https://example.com/promo"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {actionType === 'IN_APP_ROUTE' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  In-App Route Path
                </label>
                <div className="flex gap-2">
                  <select
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Choose Route --</option>
                    <option value="/cards">Cards & Wallets (/cards)</option>
                    <option value="/notifications">
                      Notifications (/notifications)
                    </option>
                    <option value="/account">Account Profile (/account)</option>
                    <option value="/settings">Settings (/settings)</option>
                    <option value="/scan">QR Scanner (/scan)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Audience & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) =>
                  setTargetAudience(e.target.value as BannerAudience)
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUBLIC">Public (All Users)</option>
                <option value="ALL_FSA_STAFF">FSA Staff Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Active Status
              </label>
              <div className="flex items-center h-10">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isActive ? 'Active (Visible)' : 'Disabled (Hidden)'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Schedule Date Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Start Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                End Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingBanner ? 'Save Changes' : 'Create Banner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
