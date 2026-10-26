'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/api/auth.api';
import { organizationsApi, Organization } from '@/api/organizations.api';
import { unwrapData } from '@/api';
import { toast } from '@/components/ui/Toast';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { PasswordStrengthMeter, getPasswordStrength } from '@/components/auth/PasswordStrengthMeter';

const DEFAULT_FSA_ORGANIZATIONS: Partial<Organization>[] = [
  { id: 'fsa-ftc', name: 'Financial Technology Center', code: 'FTC', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-serc', name: 'Securities and Exchange Regulator of Cambodia', code: 'SERC', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-irc', name: 'Insurance Regulator of Cambodia', code: 'IRC', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-tr', name: 'Trust Regulator', code: 'TR', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-ssr', name: 'Social Security Regulator', code: 'SSR', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-rpr', name: 'Real Estate Business and Pawnshop Regulator', code: 'RPR', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-acar', name: 'Accounting and Auditing Regulator', code: 'ACAR', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-gad', name: 'General Affairs Department', code: 'GAD', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-pd', name: 'Policy Department', code: 'PD', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-iau', name: 'Internal Audit Unit', code: 'IAU', parentAuthority: 'Non-Bank Financial Services Authority' },
  { id: 'fsa-tlad', name: 'Technical and Legal Affairs Department', code: 'TLAD', parentAuthority: 'Non-Bank Financial Services Authority' },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [dbOrganizations, setDbOrganizations] = useState<Partial<Organization>[]>(DEFAULT_FSA_ORGANIZATIONS);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    setLoadingOrgs(true);
    organizationsApi.getAll({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        const orgs = unwrapData<Organization>(res);
        if (mounted && Array.isArray(orgs) && orgs.length > 0) {
          const sorted = [...orgs].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setDbOrganizations(sorted);
        }
      })
      .catch((err) => {
        console.warn('Could not query live organizations, using fallback list', err);
      })
      .finally(() => {
        if (mounted) setLoadingOrgs(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email format.';
    }

    if (!organization.trim()) {
      newErrors.organization = 'Organization name is required.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else {
      const strength = getPasswordStrength(password);
      if (!strength.hasLength) {
        newErrors.password = 'Password must be at least 8 characters long.';
      } else if (!strength.hasNumber) {
        newErrors.password = 'Password must contain at least 1 number.';
      } else if (!strength.hasUpper) {
        newErrors.password = 'Password must contain at least 1 uppercase letter.';
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please resolve the highlighted form errors.', 'Validation Error');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        organization: organization.trim(),
      });

      if (res?.success) {
        toast.success(
          'Registration submitted! Please verify your email with the 6-digit code.',
          'Account Created'
        );
        // Transition to OTP verification step
        router.push(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        toast.error(
          res?.message || 'Registration could not be completed. Please try again.',
          'Registration Failed'
        );
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Email may already be in use.';
      toast.error(msg, 'Registration Error');
      if (msg.toLowerCase().includes('already exists')) {
        setErrors((prev) => ({ ...prev, email: 'An account with this email already exists.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Create your account"
      subtitle="Register as an authorized developer to build and publish mini-apps on the FSA platform."
      activeTab="signup"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 animate-in fade-in duration-300">
        {/* 1. Full Name */}
        <div>
          <label
            htmlFor="name"
            className={`block text-xs font-semibold mb-1.5 transition-colors ${errors.name ? 'text-rose-400' : 'text-slate-300'
              }`}
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g., Sokha Chan"
            disabled={loading}
            className={`w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${errors.name
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
              } disabled:opacity-50`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <span>•</span> {errors.name}
            </p>
          )}
        </div>

        {/* 2. Email */}
        <div>
          <label
            htmlFor="email"
            className={`block text-xs font-semibold mb-1.5 transition-colors ${errors.email ? 'text-rose-400' : 'text-slate-300'
              }`}
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="e.g., developer@fintech.com.kh"
            disabled={loading}
            className={`w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${errors.email
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
              } disabled:opacity-50`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <span>•</span> {errors.email}
            </p>
          )}
        </div>

        {/* 3. Organization Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="organization"
              className={`block text-xs font-semibold transition-colors ${errors.organization ? 'text-rose-400' : 'text-slate-300'
                }`}
            >
              Organization
            </label>
            {loadingOrgs && (
              <span className="text-[11px] text-slate-400 animate-pulse">Loading organizations...</span>
            )}
          </div>
          <div className="relative">
            <select
              id="organization"
              value={organization}
              onChange={(e) => {
                setOrganization(e.target.value);
                if (errors.organization) setErrors((prev) => ({ ...prev, organization: '' }));
              }}
              disabled={loading}
              className={`w-full px-4 py-2.5 rounded-xl text-sm appearance-none bg-slate-900/80 border transition-all duration-200 outline-none pr-10 cursor-pointer ${
                organization ? 'text-white' : 'text-slate-400'
              } ${
                errors.organization
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                  : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="" disabled className="text-slate-500 bg-slate-900">
                {loadingOrgs ? 'Loading organizations...' : 'Select regulator or organization'}
              </option>
              {dbOrganizations.map((org) => (
                <option key={org.id || org.name} value={org.name} className="text-white bg-slate-900 py-1.5">
                  {org.code ? `${org.code} — ` : ''}{org.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.organization && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <span>•</span> {errors.organization}
            </p>
          )}
        </div>

        {/* 4. Password with Live Strength Indicator */}
        <div>
          <label
            htmlFor="password"
            className={`block text-xs font-semibold mb-1.5 transition-colors ${errors.password ? 'text-rose-400' : 'text-slate-300'
              }`}
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="Create a strong password"
              disabled={loading}
              className={`w-full pl-4 pr-11 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${errors.password
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

          {/* Live Strength Meter */}
          <PasswordStrengthMeter password={password} />

          {errors.password && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <span>•</span> {errors.password}
            </p>
          )}
        </div>

        {/* 5. Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className={`block text-xs font-semibold mb-1.5 transition-colors ${errors.confirmPassword ? 'text-rose-400' : 'text-slate-300'
              }`}
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              placeholder="Re-enter your password"
              disabled={loading}
              className={`w-full pl-4 pr-11 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-slate-900/80 border transition-all duration-200 outline-none ${errors.confirmPassword
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-100'
                  : confirmPassword && password === confirmPassword
                    ? 'border-brand-500/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
                    : 'border-slate-800 hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15'
                } disabled:opacity-50`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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

          {/* Match indicator */}
          {confirmPassword && (
            <p
              className={`mt-1 text-xs flex items-center gap-1 ${password === confirmPassword ? 'text-brand-400 font-medium' : 'text-rose-400'
                }`}
            >
              {password === confirmPassword ? '✓ Passwords match' : '• Passwords do not match'}
            </p>
          )}

          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <span>•</span> {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* 6. Submit Button: Continue to Email Verification */}
        <div className="pt-3">
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <span className="text-accent-300 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </>
            )}
          </button>
        </div>

        {/* Login Redirect */}
        <div className="pt-3 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-brand-400 hover:text-brand-300 hover:underline transition-colors"
            >
              Login
            </Link>
          </p>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
