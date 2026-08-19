"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function RegisterMiniAppButton() {
  const { can } = useAuth();
  
  if (!can('miniapp:create')) {
    return null;
  }

  return (
    <Link 
      href="/miniapps/register"
      className="px-6 py-3 rounded-xl transition-all font-semibold flex items-center justify-center disabled:opacity-50 bg-brand-600 text-white shadow-md hover:shadow-lg hover:bg-brand-700 active:bg-brand-800"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
      <span>Register Mini App</span>
    </Link>
  );
}
