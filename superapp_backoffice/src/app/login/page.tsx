'use client';

import React, { useState, Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { authApi } from '@/api/auth.api';
import { maskEmail } from '@/lib/mask-email';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';
  const hasWarnedRef = useRef(false);

  const { loginWithEmail } = useAuth();
  // Pre-filled after verifying from /verify-otp ("Sign in" button)
  const [email, setEmail] = useState(searchParams?.get('email') || '');
  // Set when the password was right but the email was never verified
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (isExpired && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      toast.warning('Your session expired. Please Login again.', 'Session Expired');

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
    setUnverifiedEmail(null);

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
      const redirectUrl = searchParams?.get('redirect');
      router.push(redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('/login') ? redirectUrl : '/miniapps');
    } else {
      if (res.emailNotVerified) {
        // Correct password, email never verified: not a credentials error.
        setUnverifiedEmail(trimmedEmail.toLowerCase());
        toast.warning('Please verify your email address to continue.', 'Email Not Verified');
      } else if (res.noBackofficeAccess) {
        // Not a credentials error: STAFF and mobile-only accounts use the Super App
        setEmailError('This account has no Backoffice access.');
        toast.warning(
          res.error || 'This account cannot use the Backoffice. Sign in with the FSA Super App on your phone instead.',
          'Use the Mobile App'
        );
      } else if (res.pendingApproval || res.error?.toLowerCase().includes('pending approval')) {
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

  /** Sends a fresh verification code (the original one is usually expired) and opens the verify page. */
  const handleSendVerificationCode = async () => {
    if (!unverifiedEmail || sendingCode) return;
    setSendingCode(true);
    try {
      const res = await authApi.requestOtp({ email: unverifiedEmail, purpose: 'EMAIL_VERIFICATION' });
      if (res?.alreadyVerified) {
        setUnverifiedEmail(null);
        toast.success('Your email is already verified. Please sign in.', 'Already Verified');
        return;
      }
      toast.success(`A 6-digit code was sent to ${maskEmail(unverifiedEmail)}.`, 'Code Sent');
      router.push(`/verify-otp?email=${encodeURIComponent(unverifiedEmail)}&from=login`);
    } catch (err: any) {
      // e.g. 503 OTP_EMAIL_NOT_SENT: keep the callout so the user can retry
      toast.error(err?.message || 'We could not send the verification code. Please try again.', 'Code Not Sent');
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 animate-in fade-in duration-300">
      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className={`block text-xs font-semibold mb-2 transition-colors ${emailError ? 'text-rose-400' : 'text-slate-300'
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
              if (unverifiedEmail) setUnverifiedEmail(null);
            }}
            placeholder="name@company.com"
            disabled={loading}
            className={`w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${emailError
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/15'
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
            className={`block text-xs font-semibold transition-colors ${passwordError ? 'text-rose-400' : 'text-slate-300'
              }`}
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-400/90 hover:text-brand-300 transition-colors"
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
            className={`w-full pl-4 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${passwordError
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/15'
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

      {/* Unverified email: offer a fresh code instead of a credentials error */}
      {unverifiedEmail && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3 animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="min-w-0">
              <p className="font-semibold text-amber-300">Verify your email to continue</p>
              <p className="text-amber-200/90 mt-0.5 leading-relaxed">
                Your account isn&apos;t verified yet. We&apos;ll send a 6-digit code to{' '}
                <strong className="text-amber-100">{maskEmail(unverifiedEmail)}</strong>.
              </p>
            </div>
          </div>
          <div className="pt-1 border-t border-amber-500/20">
            <button
              type="button"
              onClick={handleSendVerificationCode}
              disabled={sendingCode}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingCode ? 'Sending code...' : 'Send verification code'}
            </button>
          </div>
        </div>
      )}

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500/20 accent-brand-500 cursor-pointer"
          />
          <span>Keep me signed in for 7 days</span>
        </label>
      </div>

      {/* Primary Submit Button (Rich Sovereign Emerald with Gold Accent) */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-800 via-brand-700 to-brand-800 hover:from-brand-700 hover:via-brand-600 hover:to-brand-700 border border-brand-500/40 hover:border-brand-400/60 shadow-lg shadow-brand-950/60 hover:shadow-brand-900/40 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <span>Login</span>
            <span className="text-accent-300 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </>
        )}
      </button>

      {/* Sign Up Redirect */}
      <div className="pt-4 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-brand-400 hover:text-brand-300 hover:underline transition-colors"
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
      subtitle="Login to manage your FSA SuperApp workspace."
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
