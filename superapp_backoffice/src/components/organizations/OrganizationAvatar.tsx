'use client';

import React, { useState, useEffect } from 'react';
import { normalizeAssetUrl } from '@/lib/asset-utils';

export interface OrganizationAvatarProps {
  name: string;
  code?: string | null;
  logo?: string | null;
  isRoot?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

/**
 * Computes a standardized 2-4 character initial/code badge from org code or name.
 * e.g.:
 * - "Financial Technology Center", "FTC" -> "FTC"
 * - "Internal Audit Unit", null -> "IAU"
 * - "Insurance Regulator of Cambodia", "IRC" -> "IRC"
 * - "Ministry", null -> "MIN"
 */
export function getOrgInitialCode(name: string, code?: string | null): string {
  if (code && code.trim()) {
    return code.trim().slice(0, 4).toUpperCase();
  }
  const cleanName = (name || '').trim();
  if (!cleanName) return 'ORG';
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .map((w) => w[0])
      .slice(0, 3)
      .join('')
      .toUpperCase();
  }
  return cleanName.slice(0, 3).toUpperCase();
}

const SIZE_STYLES: Record<
  NonNullable<OrganizationAvatarProps['size']>,
  {
    container: string;
    text: string;
    logoPadding: string;
  }
> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-[9px]',
    logoPadding: 'p-0.5',
  },
  sm: {
    container: 'w-7 h-7',
    text: 'text-[10px]',
    logoPadding: 'p-0.5',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-xs',
    logoPadding: 'p-1',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-sm',
    logoPadding: 'p-1.5',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-base',
    logoPadding: 'p-2',
  },
};

export function OrganizationAvatar({
  name,
  code,
  logo,
  isRoot = false,
  size = 'md',
  className = '',
  ring = true,
}: OrganizationAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const normalizedLogo = normalizeAssetUrl(logo);

  // Reset error state if logo changes
  useEffect(() => {
    setImageError(false);
  }, [normalizedLogo]);

  const initials = getOrgInitialCode(name, code);
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
  const ringStyle = ring ? 'ring-2 ring-white dark:ring-slate-900 shadow-sm' : '';

  if (normalizedLogo && !imageError) {
    return (
      <div
        className={`${sizeStyle.container} rounded-full overflow-hidden shrink-0 border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 ${sizeStyle.logoPadding} flex items-center justify-center ${ringStyle} ${className}`}
        title={`${name}${code ? ` (${code})` : ''}`}
      >
        <img
          src={normalizedLogo}
          alt={name}
          className="w-full h-full object-contain rounded-full"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback initial badge styled round like user avatar
  const badgeTheme = isRoot
    ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-amber-500/20'
    : 'bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-brand-700/20';

  return (
    <div
      className={`${sizeStyle.container} rounded-full overflow-hidden shrink-0 font-mono font-bold flex items-center justify-center tracking-tight select-none ${badgeTheme} ${sizeStyle.text} ${ringStyle} ${className}`}
      title={`${name}${code ? ` (${code})` : ''}`}
    >
      <span>{initials}</span>
    </div>
  );
}
