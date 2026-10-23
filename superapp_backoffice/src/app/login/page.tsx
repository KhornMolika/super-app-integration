'use client';

import React, { useState, Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';
  const hasWarnedRef = useRef(false);

  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (isExpired && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast.warning('Your session expired. Please sign in again.', 'Session Expired');

      // Clean query parameter from browser address bar so page refresh won't re-trigger warning
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [isExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setEmailError('');
    setPasswordError('');

    let hasValidationError = false;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      hasValidationError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email format.');
      hasValidationError = true;
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasValidationError = true;
    }

    if (hasValidationError) {
      toast.error('Please enter valid credentials before signing in.', 'Validation Error');
      return;
    }

    setLoading(true);

    const res = await loginWithEmail(trimmedEmail, password);
    setLoading(false);

    if (res.success) {
      toast.success('Signed in successfully! Redirecting...', 'Welcome Back');
      router.push('/miniapps');
    } else {
      if (res.pendingApproval || res.error?.toLowerCase().includes('pending approval')) {
        setEmailError('Account registered but pending Super Administrator approval.');
        toast.warning(
          'Your account is registered but pending Super Administrator approval.',
          'Account Pending'
        );
      } else {
        const failureMessage = res.error || 'Invalid email or password.';
        setEmailError('Invalid email or unverified credentials.');
        setPasswordError('Incorrect password or credentials. Please try again.');
        toast.error(failureMessage, 'Authentication Failed');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 animate-in fade-in duration-300">
      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className={`block text-xs font-semibold mb-2 transition-colors ${
            emailError ? 'text-rose-400' : 'text-slate-300'
          }`}
        >
          Email address
        </label>
        <div className="relative">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (passwordError) setPasswordError('');
            }}
            placeholder="name@company.com"
            disabled={loading}
            className={`w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${
              emailError
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
            } disabled:opacity-50`}
          />
        </div>
        {emailError && (
          <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5 animate-in fade-in">
            <span>•</span> {emailError}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="password"
            className={`block text-xs font-semibold transition-colors ${
              passwordError ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            placeholder="••••••••••"
            disabled={loading}
            className={`w-full pl-4 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${
              passwordError
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
            } disabled:opacity-50`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {passwordError && (
          <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5 animate-in fade-in">
            <span>•</span> {passwordError}
          </p>
        )}
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
          />
          <span>Keep me signed in for 7 days</span>
        </label>
      </div>

      {/* Primary Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 hover:from-brand-500 hover:to-brand-500 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 border border-brand-400/30 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>Sign In to Backoffice</span>
            <span className="text-accent-300 group-hover:translate-x-0.5 transition-transform">→</span>
          </>
        )}
      </button>

      {/* Sign Up Redirect */}
      <div className="pt-4 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthSplitLayout
      title="Welcome back"
      subtitle="Sign in to manage your FSA SuperApp workspace."
      activeTab="login"
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-slate-500">
            Loading authentication portal...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
