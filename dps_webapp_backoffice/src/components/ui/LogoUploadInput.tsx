"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Label } from './inputs';

interface LogoUploadInputProps {
  name?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}

export function LogoUploadInput({
  name = 'logo',
  label = 'Logo',
  value = '',
  onChange,
  error,
  disabled = false,
  required = true,
  placeholder = 'Click to upload image or drag & drop...',
  helperText,
}: LogoUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

  const handleFile = (file: File) => {
    setUploadError(null);

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP, GIF).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    // Read locally for client preview; upload to MinIO is deferred to registration submission
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setFileName('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayError = error || uploadError;

  return (
    <div>
      <Label>
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </Label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative w-full h-[46px] px-3 bg-white dark:bg-slate-900/50 border rounded-xl flex items-center justify-between transition-all cursor-pointer select-none ${
          displayError
            ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
            : isDragging
            ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isUploading ? (
          /* Uploading state */
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 min-w-0 flex-1 pr-2">
            <svg className="animate-spin w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-base font-medium animate-pulse">Loading image preview...</span>
          </div>
        ) : value ? (
          /* Has Image State: Clickable Thumbnail + Name */
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(true);
              }}
              title="Click to preview logo"
              className="group/thumb relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Logo preview"
                className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/fsa-logo.png';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </button>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(true);
              }}
              className="text-base font-medium text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 truncate cursor-pointer flex items-center gap-1.5"
              title="Click to preview"
            >
              <span className="truncate">{fileName || (value.startsWith('data:') ? 'Selected Logo' : value)}</span>
              {value.startsWith('data:') ? (
                <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 rounded font-mono shrink-0">
                  Local Preview
                </span>
              ) : (value.includes('mini-app-logos') || value.includes('9000') || value.includes('minio')) ? (
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-mono shrink-0">
                  MinIO
                </span>
              ) : null}
            </span>
          </div>
        ) : (
          /* Empty Placeholder State */
          <div className="flex items-center gap-2 text-slate-400 min-w-0 flex-1 pr-2">
            <svg className="w-5 h-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-base text-slate-400 truncate">
              {placeholder}
            </span>
          </div>
        )}

        {/* Action buttons on right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {value ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                disabled={disabled}
                className="px-2.5 py-1 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg transition-colors flex items-center gap-1"
                title="Preview logo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={disabled}
                className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Remove logo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <span className="px-3 py-1 text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 rounded-lg border border-brand-200 dark:border-brand-800/60">
              Browse
            </span>
          )}
        </div>
      </div>

      {displayError ? (
        <p className="mt-1.5 text-sm text-rose-600 font-medium flex items-center gap-1">
          <span>✕</span> {displayError}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {helperText || 'PNG, JPG, SVG or WebP (square recommended, max 5MB)'}
        </p>
      )}

      {/* Image Preview Lightbox Modal */}
      {mounted && isPreviewOpen && value && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Logo Preview
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    {fileName || 'Mini App Icon Preview'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body: Checkerboard Container */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50">
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:16px_16px] flex items-center justify-center p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Full Logo Preview"
                  className="w-full h-full object-contain drop-shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/fsa-logo.png';
                  }}
                />
              </div>

              {/* Store App Icon Simulation */}
              <div className="mt-5 flex items-center gap-3.5 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full shadow-sm">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 shadow-sm flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value}
                    alt="App icon simulator"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fsa-logo.png';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Home Launcher Icon
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    How users see this Mini App in the Super App store
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {value.startsWith('data:') ? 'Local Preview (Uploaded to MinIO on submit)' : 'MinIO Object Storage Asset'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
