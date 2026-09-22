import Link from 'next/link';
import React from 'react';

interface BackButtonProps {
  href: string;
  className?: string;
}

export function BackButton({ href, className = '' }: BackButtonProps) {
  return (
    <Link 
      href={href} 
      className={`w-10 h-10 flex-shrink-0 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm ${className}`}
    >
      <svg className="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </Link>
  );
}
