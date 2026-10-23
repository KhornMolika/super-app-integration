'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInputGroup({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: OtpInputGroupProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index: number, char: string) => {
    // Only accept numeric digits
    const cleaned = char.replace(/[^0-9]/g, '');
    if (!cleaned) return;

    const lastDigit = cleaned.slice(-1);
    const nextValue = [...value];
    nextValue[index] = lastDigit;
    onChange(nextValue);

    // Auto-advance to next input
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    const fullCode = nextValue.join('');
    if (fullCode.length === 6 && onComplete) {
      onComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Move back and delete previous
        const nextValue = [...value];
        nextValue[index - 1] = '';
        onChange(nextValue);
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextValue = [...value];
        nextValue[index] = '';
        onChange(nextValue);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const nextValue = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) {
      nextValue[i] = pasted[i];
    }
    onChange(nextValue);

    // Focus appropriate input
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6 && onComplete) {
      onComplete(pasted);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <React.Fragment key={idx}>
          <input
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[idx] || ''}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            disabled={disabled}
            className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl transition-all duration-200 outline-none select-none ${
              error
                ? 'bg-rose-950/20 border-2 border-rose-500/80 text-rose-200 focus:ring-4 focus:ring-rose-500/20'
                : value[idx]
                ? 'bg-slate-900 border-2 border-brand-500 text-brand-300 shadow-md shadow-brand-500/10'
                : 'bg-slate-950/80 border border-slate-800 text-white hover:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {idx === 2 && (
            <span className="text-slate-600 text-lg font-light select-none">–</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
