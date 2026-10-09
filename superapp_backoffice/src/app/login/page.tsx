'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, ROLE_USER_PROFILES, Role } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';

  const { loginWithEmail, setRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(isExpired ? 'Your session expired. Please sign in again.' : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginWithEmail(email.trim(), password);
    setLoading(false);

    if (res.success) {
      router.push('/miniapps');
    } else {
      setError(res.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleQuickLogin = async (roleKey: Role) => {
    setLoading(true);
    setError(null);
    const profile = ROLE_USER_PROFILES[roleKey];
    setEmail(profile.email);
    await setRole(roleKey);
    setLoading(false);
    router.push('/miniapps');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 p-0.5 shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black bg-gradient-to-r from-brand-400 to-emerald-400 bg-clip-text text-transparent">
                SA
              </span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">SuperApp Gateway</h2>
            <p className="text-xs font-medium text-slate-400">Government MiniApp Orchestration Platform</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-black/50 sm:rounded-2xl sm:px-10 border border-slate-800">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Sign In to Backoffice</h3>
            <p className="text-xs text-slate-400 mt-1">Enter your credentials or use Single Sign-On (SSO).</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@superapp.gov.kh"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <span className="text-[11px] text-slate-500">Default: password123</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/20 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Persona Switcher for QA / Local Testing */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              QA Quick Test Switcher:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('SUPER_ADMIN')}
                className="p-2 text-left bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-slate-300 transition-colors"
              >
                <div className="font-semibold text-amber-400">Super Admin</div>
                <div className="text-[10px] text-slate-500 truncate">superadmin@superapp.gov.kh</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2 text-left bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-slate-300 transition-colors"
              >
                <div className="font-semibold text-blue-400">Admin User</div>
                <div className="text-[10px] text-slate-500 truncate">admin@superapp.gov.kh</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('MINI_APP_DEVELOPER')}
                className="p-2 text-left bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-slate-300 transition-colors"
              >
                <div className="font-semibold text-emerald-400">MiniApp Developer</div>
                <div className="text-[10px] text-slate-500 truncate">ma-developer@superapp.gov.kh</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('QA_TESTER')}
                className="p-2 text-left bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-slate-300 transition-colors"
              >
                <div className="font-semibold text-indigo-400">QA Tester</div>
                <div className="text-[10px] text-slate-500 truncate">qa@superapp.gov.kh</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Need a developer account?{' '}
            <Link href="/signup" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Sign up as MiniApp Developer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading SuperApp Gateway...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

