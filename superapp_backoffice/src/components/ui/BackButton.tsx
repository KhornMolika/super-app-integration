'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface BackButtonProps {
  href: string;
  className?: string;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function BackButton({
  href,
  className = '',
  ariaLabel = 'Go back',
  onClick,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
      return;
    }

    // If internal application navigation occurred in this tab session, prefer router.back()
    // to preserve exact pagination, active filters, search queries, and scroll position
    if (
      typeof window !== 'undefined' &&
      ((window as any).__superapp_nav_count > 1 || window.history.length > 1)
    ) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label={ariaLabel}
      className={`w-10 h-10 flex-shrink-0 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm ${className}`}
    >
      <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </Link>
  );
}
