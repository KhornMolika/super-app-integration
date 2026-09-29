'use client';

import React, { useState } from 'react';

export interface AppLogoAvatarProps {
  logo?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imgClassName?: string;
}

export function AppLogoAvatar({
  logo,
  name,
  size = 'md',
  className = '',
  imgClassName = '',
}: AppLogoAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const initial = (name?.trim()?.charAt(0) || 'A').toUpperCase();

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-md',
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-12 h-12 text-base rounded-xl',
    xl: 'w-16 h-16 text-xl rounded-2xl',
  }[size];

  if (logo && !hasError) {
    return (
      <div
        className={`relative ${sizeClasses} overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src={logo}
          alt={name ? `${name} logo` : 'App logo'}
          className={`w-full h-full object-cover ${imgClassName}`}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClasses} bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
}

export default AppLogoAvatar;
