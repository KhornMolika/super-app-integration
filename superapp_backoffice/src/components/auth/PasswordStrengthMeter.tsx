'use client';

import React from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  hasLength: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasLength) score++;
  if (hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial || password.length >= 12) score++;

  let label = 'Very Weak';
  if (score === 1) label = 'Weak';
  else if (score === 2) label = 'Fair';
  else if (score === 3) label = 'Good';
  else if (score === 4) label = 'Strong';

  return { score, label, hasLength, hasUpper, hasNumber, hasSpecial };
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, hasLength, hasUpper, hasNumber } = getPasswordStrength(password);

  const getBarColor = (index: number) => {
    if (index >= score) return 'bg-slate-800';
    if (score === 1) return 'bg-rose-500';
    if (score === 2) return 'bg-accent-500';
    if (score === 3) return 'bg-brand-400';
    return 'bg-brand-500';
  };

  const getLabelColor = () => {
    if (score === 1) return 'text-rose-400';
    if (score === 2) return 'text-accent-400';
    if (score === 3) return 'text-brand-300';
    return 'text-brand-400';
  };

  return (
    <div className="mt-2 space-y-2 animate-in fade-in duration-200">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Password strength</span>
        <span className={`font-semibold ${getLabelColor()}`}>{label}</span>
      </div>

      {/* 4-segment strength bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`h-full rounded-full transition-all duration-300 ${getBarColor(idx)}`}
          />
        ))}
      </div>

      {/* Live Requirement Checklist Pills */}
      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
        <span
          className={`flex items-center gap-1 transition-colors ${
            hasLength ? 'text-brand-400 font-medium' : 'text-slate-500'
          }`}
        >
          {hasLength ? '✓' : '•'} 8+ characters
        </span>
        <span
          className={`flex items-center gap-1 transition-colors ${
            hasNumber ? 'text-brand-400 font-medium' : 'text-slate-500'
          }`}
        >
          {hasNumber ? '✓' : '•'} At least 1 number
        </span>
        <span
          className={`flex items-center gap-1 transition-colors ${
            hasUpper ? 'text-brand-400 font-medium' : 'text-slate-500'
          }`}
        >
          {hasUpper ? '✓' : '•'} At least 1 uppercase
        </span>
      </div>
    </div>
  );
}
