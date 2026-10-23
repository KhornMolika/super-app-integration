'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { AuthCenteredLayout } from '@/components/auth/AuthCenteredLayout';
import { OtpInputGroup } from '@/components/auth/OtpInputGroup';
import { PasswordStrengthMeter, getPasswordStrength } from '@/components/auth/PasswordStrengthMeter';
import { authApi } from '@/api/auth.api';

type RecoveryStep = 'email' | 'otp' | 'new-password' | 'success';

const CODE_LIFESPAN_SECONDS = 300; // 5 minutes validity
const RESEND_COOLDOWN_SECONDS = 60; // 60s before resend is allowed

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<RecoveryStep>('email');

  // Step 1: Email
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2: 6-Digit OTP & Expiration Timer
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState(false);
  const [expiresIn, setExpiresIn] = useState(CODE_LIFESPAN_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isCodeExpired, setIsCodeExpired] = useState(false);

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [loading, setLoading] = useState(false);

  // Mask email for privacy (e.g. m••••••••n@gmail.com)
  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return str;
    const [user, domain] = str.split('@');
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user[0]}${'•'.repeat(Math.min(user.length - 2, 7))}${user[user.length - 1]}@${domain}`;
  };

  // Timer countdown for OTP step
  useEffect(() => {
    if (step !== 'otp') return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setIsCodeExpired(true);
          return 0;
        }
        return prev - 1;
      });

      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request Code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const res = await authApi.requestRecoveryOtp(trimmed);
      setExpiresIn(res.expiresInSeconds || CODE_LIFESPAN_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setIsCodeExpired(false);
      setOtp(Array(6).fill(''));
      setStep('otp');
      toast.success(
        res.message || `A 6-digit recovery code was dispatched to ${trimmed}.`,
        'Code Dispatched',
      );
    } catch (err: any) {
      const message =
        err?.message || 'Failed to dispatch recovery code. Please check your email and try again.';
      setEmailError(message);
      toast.error(message, 'Request Failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-Digit Code Only (Single-Use Verification)
  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (isCodeExpired) {
      toast.error('This code has expired. Please request a new recovery code.', 'Code Expired');
      return;
    }

    const code = codeToVerify || otp.join('');
    if (code.length < 6) {
      setOtpError(true);
      toast.error('Please enter the full 6-digit recovery code.', 'Incomplete Code');
      return;
    }

    setLoading(true);
    setOtpError(false);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const res = await authApi.verifyRecoveryOtp(trimmedEmail, code);
      setResetToken(res.resetToken);
      toast.success('Recovery code verified! Set your new password.', 'Code Verified');
      setStep('new-password');
    } catch (err: any) {
      setOtpError(true);
      const message =
        err?.message || 'Invalid or expired recovery code. Please request a new code.';
      toast.error(message, 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend Code Action
  const handleResendCode = async () => {
    if (resendCooldown > 0 && !isCodeExpired) return;

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const res = await authApi.requestRecoveryOtp(trimmedEmail);
      setExpiresIn(res.expiresInSeconds || CODE_LIFESPAN_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setIsCodeExpired(false);
      setOtp(Array(6).fill(''));
      setOtpError(false);
      toast.info(
        res.message || `A new 6-digit recovery code was dispatched to ${email}.`,
        'New Code Sent',
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend code.', 'Resend Failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const strength = getPasswordStrength(newPassword);
    if (!strength.hasLength || !strength.hasNumber || !strength.hasUpper) {
      setPasswordError('Password does not satisfy minimum complexity requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (!resetToken) {
      setPasswordError('Your reset session has expired. Please restart password recovery.');
      toast.error('Your reset session has expired. Please restart recovery.', 'Session Expired');
      setStep('email');
      return;
    }

    setLoading(true);
    setPasswordError('');

    try {
      await authApi.resetPassword(resetToken, newPassword);
      setStep('success');
      toast.success('Your password has been changed securely.', 'Password Updated');
    } catch (err: any) {
      const message =
        err?.message || 'Failed to update password. Your reset session may have expired.';
      setPasswordError(message);
      toast.error(message, 'Update Failed');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 4: Success Screen
  // --------------------------------------------------------------------------
  if (step === 'success') {
    return (
      <AuthCenteredLayout
        title="Password Reset Complete"
        subtitle="Your password has been changed successfully."
        badge="Security"
        backHref="/login"
        backLabel="Back to sign in"
      >
        <div className="text-center space-y-6 py-2 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400 shadow-lg shadow-brand-500/10">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">All Sessions Secured</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Your password has been updated. You can now sign in to the FSA SuperApp Platform with your new credentials.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 hover:from-brand-500 hover:to-brand-500 shadow-lg shadow-brand-500/25 border border-brand-400/30 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Sign In to Backoffice</span>
              <span className="text-accent-300">→</span>
            </Link>
          </div>
        </div>
      </AuthCenteredLayout>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 3: Set New Password Form (Only shown after OTP is verified)
  // --------------------------------------------------------------------------
  if (step === 'new-password') {
    return (
      <AuthCenteredLayout
        title="Create new password"
        subtitle="Your identity has been verified. Choose a strong new password for your account."
        badge="Step 3 of 3"
        backHref="/login"
        backLabel="Cancel"
      >
        <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-300">
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter new password"
                disabled={loading}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
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
            <PasswordStrengthMeter password={newPassword} />
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Re-enter new password"
                disabled={loading}
                className="w-full pl-4 pr-11 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showConfirmPassword ? (
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
            {confirmPassword && (
              <p className={`mt-1 text-xs flex items-center gap-1 ${newPassword === confirmPassword ? 'text-brand-400 font-medium' : 'text-rose-400'}`}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '• Passwords do not match'}
              </p>
            )}
          </div>

          {passwordError && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <span>•</span> {passwordError}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 hover:from-brand-500 hover:to-brand-500 shadow-lg shadow-brand-500/25 border border-brand-400/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>
          </div>
        </form>
      </AuthCenteredLayout>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 2: Dedicated 6-Digit OTP Verification Screen (With validity duration)
  // --------------------------------------------------------------------------
  if (step === 'otp') {
    return (
      <AuthCenteredLayout
        title="Enter recovery code"
        subtitle={`We've dispatched a 6-digit code to ${maskEmail(email)}.`}
        badge="Step 2 of 3"
        onBack={() => setStep('email')}
        backLabel="Change email"
      >
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Validity Duration Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
            isCodeExpired
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isCodeExpired ? 'bg-rose-400' : 'bg-brand-400 animate-pulse'}`} />
              <span>{isCodeExpired ? 'Recovery code expired' : 'Code valid duration:'}</span>
            </span>
            <span className={`font-mono font-bold ${isCodeExpired ? 'text-rose-400' : 'text-accent-300'}`}>
              {isCodeExpired ? '00:00' : formatTime(expiresIn)}
            </span>
          </div>

          {/* 6-Digit Input Group */}
          <div>
            <OtpInputGroup
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (otpError) setOtpError(false);
              }}
              onComplete={(code) => handleVerifyOtp(code)}
              disabled={loading || isCodeExpired}
              error={otpError || isCodeExpired}
            />
            {otpError && !isCodeExpired && (
              <p className="mt-2 text-xs text-rose-400 text-center animate-in fade-in">
                Please enter the full 6-digit recovery code.
              </p>
            )}
            {isCodeExpired && (
              <p className="mt-2 text-xs text-rose-400 text-center animate-in fade-in">
                The 5-minute validity window expired. Please request a fresh code below.
              </p>
            )}
          </div>

          {/* Primary Action Button */}
          <div>
            {isCodeExpired ? (
              <button
                type="button"
                onClick={handleResendCode}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 shadow-lg shadow-accent-500/25 border border-accent-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Resend Fresh Code</span>
                <span>↻</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 hover:from-brand-500 hover:to-brand-500 shadow-lg shadow-brand-500/25 border border-brand-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Code & Continue →'}
              </button>
            )}
          </div>

          {/* Secondary Actions: Resend / Cancel */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
            <div>
              {!isCodeExpired && (
                resendCooldown > 0 ? (
                  <span className="text-slate-500">
                    Resend in <span className="font-mono text-slate-400">{resendCooldown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="font-medium text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
                  >
                    Resend code
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp(Array(6).fill(''));
              }}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </AuthCenteredLayout>
    );
  }

  // --------------------------------------------------------------------------
  // STEP 1: Prompt for Email Address
  // --------------------------------------------------------------------------
  return (
    <AuthCenteredLayout
      title="Forgot your password?"
      subtitle="Enter your registered platform email address to receive a 6-digit recovery code."
      badge="Step 1 of 3"
      backHref="/login"
      backLabel="Back to sign in"
    >
      <form onSubmit={handleRequestOtp} noValidate className="space-y-5 animate-in fade-in duration-300">
        <div>
          <label
            htmlFor="email"
            className={`block text-xs font-semibold mb-2 transition-colors ${
              emailError ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="name@company.com"
            disabled={loading}
            className={`w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${
              emailError
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
            } disabled:opacity-50`}
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5 animate-in fade-in">
              <span>•</span> {emailError}
            </p>
          )}
        </div>

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
              <span>Dispatching Code...</span>
            </>
          ) : (
            <>
              <span>Send 6-Digit Recovery Code</span>
              <span className="text-accent-300 group-hover:translate-x-0.5 transition-transform">→</span>
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Remember your password? Sign in
          </Link>
        </div>
      </form>
    </AuthCenteredLayout>
  );
}
