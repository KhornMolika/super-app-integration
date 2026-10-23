'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { authApi } from '@/api/auth.api';
import { AuthCenteredLayout } from '@/components/auth/AuthCenteredLayout';
import { OtpInputGroup } from '@/components/auth/OtpInputGroup';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawEmail = searchParams?.get('email') || '';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Mask email for privacy: developer@fintech.com.kh -> d•••••••r@fintech.com.kh
  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return 'your email';
    const [user, domain] = str.split('@');
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user[0]}${'•'.repeat(Math.min(user.length - 2, 7))}${user[user.length - 1]}@${domain}`;
  };

  // Resend Countdown Timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length < 6) {
      toast.error('Please enter the complete 6-digit verification code.', 'Incomplete Code');
      setHasError(true);
      return;
    }

    if (!rawEmail) {
      toast.error('No email address provided. Please restart registration.', 'Missing Email');
      router.push('/signup');
      return;
    }

    setLoading(true);
    setHasError(false);

    try {
      const res = await authApi.verifyOtp({
        email: rawEmail,
        code,
        purpose: 'EMAIL_VERIFICATION',
      });

      if (res?.success) {
        setIsVerified(true);
        toast.success(
          'Email verified successfully! Your account is now pending Super Administrator approval.',
          'Identity Verified'
        );
      } else {
        setHasError(true);
        toast.error(
          res?.message || 'Invalid or expired verification code.',
          'Verification Failed'
        );
      }
    } catch (err: any) {
      setHasError(true);
      toast.error(
        err?.message || 'Invalid verification code. Please check your inbox and try again.',
        'Verification Error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    setOtp(Array(6).fill(''));
    setHasError(false);

    try {
      const res = await authApi.requestOtp({
        email: rawEmail,
        purpose: 'EMAIL_VERIFICATION',
      });

      if (res?.success) {
        toast.success(
          `A new 6-digit verification code has been dispatched to ${rawEmail || 'your email'}.`,
          'Code Sent'
        );
      } else {
        toast.error(res?.message || 'Could not resend verification code.', 'Resend Failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch new code.', 'Resend Error');
    }
  };

  // State: Successfully Verified -> Display Super Admin Approval Gate
  if (isVerified) {
    return (
      <div className="text-center space-y-6 py-2 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400 shadow-lg shadow-brand-500/10">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Email Verified Successfully</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your identity for <strong className="text-slate-200">{rawEmail || 'your account'}</strong> has been verified.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-accent-500/10 border border-accent-500/25 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-accent-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Super Administrator Review Required</span>
          </div>
          <p className="text-[11px] text-slate-300/90 leading-relaxed">
            As a regulated sovereign financial infrastructure platform, all new developer accounts require Super Administrator authorization before back-office access is granted.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-brand-500/40 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>Return to Sign In</span>
            <span className="text-brand-400">→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Target Email Badge */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="truncate">
            <div className="text-[11px] text-slate-400">Sent code to</div>
            <div className="text-xs font-semibold text-white truncate">
              {rawEmail ? maskEmail(rawEmail) : 'your email address'}
            </div>
          </div>
        </div>
        <Link
          href="/signup"
          className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors shrink-0 ml-2"
        >
          Change
        </Link>
      </div>

      {/* 6-Digit Code Input Group */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-3 text-center">
          Enter 6-digit verification code
        </label>
        <OtpInputGroup
          value={otp}
          onChange={(newVal) => {
            setOtp(newVal);
            if (hasError) setHasError(false);
          }}
          onComplete={(fullCode) => handleVerify(fullCode)}
          disabled={loading}
          error={hasError}
        />
        {hasError && (
          <p className="mt-2 text-xs text-rose-400 text-center animate-in fade-in">
            Invalid or incomplete verification code.
          </p>
        )}
      </div>

      {/* Primary Submit Button */}
      <button
        type="button"
        onClick={() => handleVerify()}
        disabled={loading || otp.join('').length < 6}
        className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 hover:from-brand-500 hover:to-brand-500 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 border border-brand-400/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Verifying Code...</span>
          </>
        ) : (
          <span>Verify & Activate Account</span>
        )}
      </button>

      {/* Resend Countdown */}
      <div className="text-center pt-2">
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
          >
            Didn&apos;t receive code? Resend email
          </button>
        ) : (
          <p className="text-xs text-slate-500">
            Resend code in{' '}
            <span className="font-mono text-slate-300 font-semibold">
              00:{countdown < 10 ? `0${countdown}` : countdown}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthCenteredLayout
      title="Verify it's you"
      subtitle="Enter the 6-digit confirmation code dispatched to your email."
      badge="Identity Verification"
      backHref="/signup"
      backLabel="Back to registration"
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading verification...</div>}>
        <VerifyOtpContent />
      </Suspense>
    </AuthCenteredLayout>
  );
}
