"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Input, Label } from './inputs';

export const validateUrlFormat = (url: string, fieldName: string = 'URL', isOptional: boolean = false) => {
  if (!url || !url.trim()) {
    if (isOptional) return { valid: true, error: null };
    return { valid: false, error: `${fieldName} is required.` };
  }
  const trimmed = url.trim();

  // Whitespace check
  if (/\s/.test(trimmed)) {
    return { valid: false, error: `${fieldName} must not contain whitespace.` };
  }

  // Protocol check
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === 'DEV';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: `${fieldName} must start with http:// or https://` };
  }

  if (!isDev && trimmed.startsWith('http://')) {
    return { valid: false, error: `${fieldName} strictly requires HTTPS in production mode.` };
  }

  // Check for IPv4 out-of-range octets (e.g. 172.20.684.1)
  const hostMatch = trimmed.match(/^https?:\/\/([^/:]+)/);
  if (hostMatch) {
    const hostCandidate = hostMatch[1];
    const octets = hostCandidate.split('.');
    if (octets.length === 4 && octets.every(o => /^\d+$/.test(o))) {
      const invalidOctet = octets.find(o => Number(o) < 0 || Number(o) > 255);
      if (invalidOctet !== undefined) {
        return { valid: false, error: `Invalid IPv4 address: octet "${invalidOctet}" exceeds maximum range (0-255).` };
      }
    }
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.port) {
      const portNum = Number(parsed.port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return { valid: false, error: `Port "${parsed.port}" is invalid (must be between 1 and 65535).` };
      }
    }

    if (!isDev) {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return { valid: false, error: 'Localhost is not allowed in production.' };
      }
      if (!parsed.hostname.includes('.')) {
        return { valid: false, error: `${fieldName} must be a fully qualified domain (e.g. https://example.com).` };
      }
    }

    return { valid: true, error: null };
  } catch {
    return { valid: false, error: `Invalid ${fieldName} syntax. Please enter a valid URL.` };
  }
};

export interface ValidatedUrlInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  externalError?: string;
  disabled?: boolean;
}

export function ValidatedUrlInput({
  name,
  label,
  value = '',
  onChange,
  placeholder,
  helperText,
  required,
  optional,
  externalError,
  disabled = false,
}: ValidatedUrlInputProps) {
  const isRequired = required === true || (required === undefined && optional === false);
  const isOptional = !isRequired;

  const [validation, setValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid' | 'unreachable';
    message: string | null;
  }>({ status: 'idle', message: null });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, { reachable: boolean; timestamp: number }>>(new Map());

  useEffect(() => {
    const trimmed = (value || '').trim();

    if (!trimmed) {
      setValidation({ status: 'idle', message: null });
      return;
    }

    // 1. Immediate synchronous format check (0ms)
    const formatRes = validateUrlFormat(trimmed, label, optional);
    if (!formatRes.valid) {
      setValidation({ status: 'invalid', message: formatRes.error });
      return;
    }

    // Check in-memory cache (< 1ms)
    const cached = cacheRef.current.get(trimmed);
    if (cached && Date.now() - cached.timestamp < 30000) {
      if (cached.reachable) {
        setValidation({ status: 'valid', message: 'URL format valid & server is online' });
      } else {
        setValidation({ status: 'unreachable', message: 'URL format valid, but server is offline or unreachable' });
      }
      return;
    }

    // 2. Debounced asynchronous reachability check (250ms)
    setValidation({ status: 'checking', message: 'Checking server...' });

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const abortCtrl = new AbortController();

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mini-apps/check-url?url=${encodeURIComponent(trimmed)}`, {
          signal: abortCtrl.signal,
        });
        const data = await res.json();
        const isReachable = Boolean(data.reachable);

        cacheRef.current.set(trimmed, { reachable: isReachable, timestamp: Date.now() });

        if (isReachable) {
          setValidation({
            status: 'valid',
            message: 'URL format valid & server is online',
          });
        } else {
          setValidation({
            status: 'unreachable',
            message: 'URL format valid, but server is offline or unreachable',
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setValidation({
          status: 'unreachable',
          message: 'URL format valid, but could not connect to server',
        });
      }
    }, 250);

    return () => {
      abortCtrl.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, label, isOptional]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>
          {label} {isRequired && <span className="text-rose-500 font-bold">*</span>}
        </Label>
        {validation.status !== 'idle' ? (
          <span
            className={`text-[11px] font-medium flex items-center gap-1 ${
              validation.status === 'valid'
                ? 'text-emerald-600 dark:text-emerald-400'
                : validation.status === 'checking'
                ? 'text-sky-600 dark:text-sky-400'
                : validation.status === 'unreachable'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {validation.status === 'checking' && (
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {validation.status === 'valid' && '✓ Reachable'}
            {validation.status === 'unreachable' && '⚠ Unreachable'}
            {validation.status === 'invalid' && '✕ Format Error'}
          </span>
        ) : isOptional ? (
          <span className="text-[11px] text-slate-400 font-medium">Optional</span>
        ) : null}
      </div>

      <div className="relative">
        <Input
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          type="url"
          placeholder={placeholder}
          className={`pr-8 ${
            validation.status === 'invalid' || externalError
              ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
              : validation.status === 'valid'
              ? 'border-emerald-500 ring-1 ring-emerald-500/40 focus:ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
              : validation.status === 'unreachable'
              ? 'border-amber-500 ring-1 ring-amber-500/40 focus:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
              : ''
          }`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {validation.status === 'checking' && (
            <svg className="animate-spin w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {validation.status === 'valid' && (
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {validation.status === 'invalid' && (
            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {validation.status === 'unreachable' && (
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dynamic Real-Time Feedback Messages */}
      {validation.status === 'invalid' && (
        <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
          <span>✕</span> {validation.message}
        </p>
      )}
      {validation.status === 'unreachable' && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
          <span>⚠</span> {validation.message}
        </p>
      )}
      {validation.status === 'valid' && (
        <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <span>✓</span> {validation.message}
        </p>
      )}
      {validation.status === 'idle' && externalError && (
        <p className="mt-1.5 text-xs text-rose-600 font-medium">
          {externalError}
        </p>
      )}
      {helperText && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
