'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Trash2, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  name?: string;
  onUpload?: (file: File) => Promise<any>;
  onDelete?: () => Promise<any>;
  // Staged / Pending mode props:
  stagedFile?: File | null;
  previewUrl?: string | null;
  isPendingRemoval?: boolean;
  onFileSelect?: (file: File) => void;
  onRemove?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUpload({
  currentAvatarUrl,
  name = 'User',
  onUpload,
  onDelete,
  stagedFile = null,
  previewUrl = null,
  isPendingRemoval = false,
  onFileSelect,
  onRemove,
  disabled = false,
  size = 'md',
  className = '',
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset imageError when source URL changes
  useEffect(() => {
    setImageError(false);
  }, [previewUrl, currentAvatarUrl, stagedFile]);

  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-2xl',
    lg: 'w-32 h-32 text-3xl',
  }[size];

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed.');
      return false;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image size must be less than 2 MB.');
      return false;
    }
    return true;
  };

  const handleIncomingFile = async (file: File) => {
    if (!validateFile(file)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImageError(false);

    // Staged / Pending mode
    if (onFileSelect) {
      onFileSelect(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Direct upload mode
    if (onUpload) {
      try {
        setUploading(true);
        await onUpload(file);
        setImageError(false);
        toast.success('Profile avatar updated successfully!');
      } catch (err: any) {
        console.error('Avatar upload failed:', err);
        toast.error(err?.response?.data?.message || err?.message || 'Failed to upload avatar.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleIncomingFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || uploading || deleting) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleIncomingFile(file);
    }
  };

  const handleRemove = async () => {
    if (disabled || uploading || deleting) return;

    if (onRemove) {
      setImageError(false);
      onRemove();
      return;
    }

    if (onDelete) {
      try {
        setDeleting(true);
        await onDelete();
        setImageError(false);
        toast.success('Profile avatar removed.');
      } catch (err: any) {
        console.error('Avatar removal failed:', err);
        toast.error(err?.response?.data?.message || err?.message || 'Failed to remove avatar.');
      } finally {
        setDeleting(false);
      }
    }
  };

  // Determine effective display image URL
  const effectiveImageUrl = isPendingRemoval
    ? null
    : (previewUrl || currentAvatarUrl || null);

  const hasAvatar = Boolean(effectiveImageUrl) && !imageError;
  const canRemove = (hasAvatar || Boolean(stagedFile)) && (Boolean(onRemove) || Boolean(onDelete));

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 ${className}`}>
      {/* Avatar Container with Drag & Drop */}
      <div
        className={`relative group rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
          isDragOver
            ? 'border-brand-500 ring-4 ring-brand-500/30 scale-105'
            : stagedFile
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-brand-400'
        } ${sizeClasses}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !uploading && !deleting) {
            fileInputRef.current?.click();
          }
        }}
        title="Click or drag and drop an image to preview"
      >
        {/* Real Avatar Image or Fallback Gradient */}
        {hasAvatar ? (
          <img
            src={effectiveImageUrl!}
            alt={name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 text-white font-extrabold flex items-center justify-center select-none shadow-inner">
            {initials}
          </div>
        )}

        {/* Hover / Uploading Overlay */}
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white transition-opacity ${
            uploading || deleting || isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          ) : deleting ? (
            <Loader2 className="w-6 h-6 animate-spin text-rose-300" />
          ) : isDragOver ? (
            <UploadCloud className="w-6 h-6 animate-bounce text-brand-300" />
          ) : (
            <>
              <Camera className="w-5 h-5 mb-0.5 text-white/90" />
              <span className="text-[10px] font-semibold text-white/90">
                {hasAvatar ? 'Change' : 'Upload'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading || deleting}
      />

      {/* Action Buttons & Guidance Text */}
      <div className="space-y-1.5 text-center sm:text-left min-w-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : stagedFile ? (
              <RefreshCw className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            )}
            <span>
              {uploading
                ? 'Uploading...'
                : stagedFile
                ? 'Choose Different Photo'
                : 'Upload Photo'}
            </span>
          </button>

          {canRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
              title="Remove profile photo"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              )}
              <span>{deleting ? 'Removing...' : 'Remove'}</span>
            </button>
          )}

          {/* Pending State Badges */}
          {stagedFile && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Pending save
            </span>
          )}
          {isPendingRemoval && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Marked for removal
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
          Drag &amp; drop or click to upload. JPG, PNG, or WebP up to <strong>2 MB</strong>.
        </p>
      </div>
    </div>
  );
}
