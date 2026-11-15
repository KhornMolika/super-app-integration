'use client';

import React, { useState } from 'react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { authApi } from '@/api/auth.api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

const MIN_LENGTH = 8;

/**
 * Shown after signing in with a password someone else chose (an official
 * seed account, or an account created or reset by an admin). proxy.ts keeps
 * every page here until the user has set their own; it works for a voluntary
 * change too.
 */
export default function ChangePasswordPage() {
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = (): string | null => {
    if (!current) return 'Enter the password you signed in with.';
    if (next.length < MIN_LENGTH) return `Your new password needs at least ${MIN_LENGTH} characters.`;
    if (next === current) return 'Choose a password different from the one you were given.';
    if (next !== confirm) return 'The two new passwords do not match.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const why = problem();
    if (why) {
      setError(why);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.changePassword({ oldPassword: current, newPassword: next });
      toast.success('Your password is set. Welcome!', 'Password updated');
      // Full load: the new session cookies and the cleared flag apply everywhere
      window.location.href = '/miniapps';
    } catch (err: any) {
      setError(err?.message || 'The password could not be changed. Please try again.');
      setLoading(false);
    }
  };

  const inputClass =
    'w-full pl-4 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border border-slate-800 hover:border-slate-700 focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200 outline-none disabled:opacity-50';

  return (
    <AuthSplitLayout
      title="Choose your password"
      subtitle="Your account was set up with a password someone else chose. Set your own to continue."
    >
      <form onSubmit={submit} noValidate className="space-y-5 animate-in fade-in duration-300">
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-100 text-xs leading-relaxed">
          <svg className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p>Only you should know your password. Your other sessions end when you change it.</p>
        </div>

        <div>
          <label htmlFor="current" className="block text-xs font-semibold mb-2 text-slate-300">
            Current password
          </label>
          <div className="relative">
            <input
              id="current"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={loading}
              className={inputClass}
            />
            <EyeToggle
              show={showCurrent}
              onToggle={() => setShowCurrent(!showCurrent)}
              ariaLabel={showCurrent ? 'Hide current password' : 'Show current password'}
            />
          </div>
        </div>

        <div>
          <label htmlFor="next" className="block text-xs font-semibold mb-2 text-slate-300">
            New password
          </label>
          <div className="relative">
            <input
              id="next"
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading}
              placeholder={`At least ${MIN_LENGTH} characters`}
              className={inputClass}
            />
            <EyeToggle
              show={showNext}
              onToggle={() => setShowNext(!showNext)}
              ariaLabel={showNext ? 'Hide new password' : 'Show new password'}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-xs font-semibold mb-2 text-slate-300">
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              className={inputClass}
            />
            <EyeToggle
              show={showConfirm}
              onToggle={() => setShowConfirm(!showConfirm)}
              ariaLabel={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-rose-400 flex items-start gap-1.5 animate-in fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-800 via-brand-700 to-brand-800 hover:from-brand-700 hover:via-brand-600 hover:to-brand-700 border border-brand-500/40 hover:border-brand-400/60 shadow-lg shadow-brand-950/60 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {loading ? 'Saving...' : 'Set my password'}
        </button>

        <button
          type="button"
          onClick={() => logout()}
          disabled={loading}
          className="w-full text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
        >
          Sign out instead
        </button>
      </form>
    </AuthSplitLayout>
  );
}

function EyeToggle({
  show,
  onToggle,
  ariaLabel,
}: {
  show: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
      aria-label={ariaLabel}
    >
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );
}
