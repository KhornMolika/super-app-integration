'use client';

import React, { useState, useEffect } from 'react';
import { normalizeAssetUrl } from '@/lib/asset-utils';

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  ring?: boolean | string;
  shadow?: boolean | string;
  gradient?: string;
}

/**
 * Derives robust 1-2 character initials from name or email fallback.
 * Examples:
 * - "Molika Khorn" -> "MK"
 * - "ACAR Admin" -> "AA"
 * - "consumers" -> "C"
 * - "Luna" -> "L"
 * - null, "alexkgm2412@gmail.com" -> "A"
 */
export function getUserInitials(name?: string | null, email?: string | null): string {
  const cleanName = (name || '').trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }

  const cleanEmail = (email || '').trim();
  if (cleanEmail) {
    const emailPrefix = cleanEmail.split('@')[0];
    const parts = emailPrefix.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailPrefix.charAt(0).toUpperCase();
  }

  return 'U';
}

const SIZE_STYLES: Record<
  NonNullable<UserAvatarProps['size']>,
  {
    container: string;
    text: string;
    ring: string;
    shadow: string;
  }
> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    ring: 'ring-1 ring-white dark:ring-slate-900',
    shadow: 'shadow-2xs',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    ring: 'ring-2 ring-white dark:ring-slate-900',
    shadow: 'shadow-xs',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    ring: 'ring-2 ring-white dark:ring-slate-900',
    shadow: 'shadow-sm',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base',
    ring: 'ring-2 ring-white dark:ring-slate-900',
    shadow: 'shadow-sm',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    ring: 'ring-4 ring-slate-100 dark:ring-slate-800',
    shadow: 'shadow-md',
  },
  '2xl': {
    container: 'w-24 h-24',
    text: 'text-3xl',
    ring: 'ring-4 ring-slate-100 dark:ring-slate-800',
    shadow: 'shadow-md',
  },
};

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = 'md',
  className = '',
  imgClassName = '',
  textClassName = '',
  ring,
  shadow,
  gradient = 'bg-gradient-to-br from-brand-500 to-brand-700 text-white',
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const normalizedUrl = normalizeAssetUrl(avatarUrl);

  // Reset image error state whenever avatarUrl changes
  useEffect(() => {
    setImageError(false);
  }, [normalizedUrl]);

  const initials = getUserInitials(name, email);
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  const ringClass =
    ring !== undefined
      ? typeof ring === 'string'
        ? ring
        : ring
        ? sizeStyle.ring
        : ''
      : sizeStyle.ring;

  const shadowClass =
    shadow !== undefined
      ? typeof shadow === 'string'
        ? shadow
        : shadow
        ? sizeStyle.shadow
        : ''
      : sizeStyle.shadow;

  const hasImage = Boolean(normalizedUrl) && !imageError;

  return (
    <div
      className={`relative ${sizeStyle.container} rounded-full overflow-hidden shrink-0 select-none ${ringClass} ${shadowClass} ${className}`}
      title={name || email || undefined}
    >
      {/* Fallback Initials Badge: always rendered in DOM so errors or loading never flash an empty void */}
      <div
        className={`w-full h-full ${gradient} font-bold flex items-center justify-center ${textClassName || sizeStyle.text}`}
      >
        <span>{initials}</span>
      </div>

      {/* Real Avatar Image: placed on top when valid, and removed if loading fails */}
      {hasImage && (
        <img
          src={normalizedUrl}
          alt={name ? `${name} avatar` : 'User avatar'}
          className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
}

export default UserAvatar;
