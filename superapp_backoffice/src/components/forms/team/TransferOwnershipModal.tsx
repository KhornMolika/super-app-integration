'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usersApi, User } from '@/api/users.api';
import { miniappsApi } from '@/api';
import { toast } from '@/components/ui/Toast';
import { SearchIcon, XIcon, AlertTriangleIcon, CheckIcon } from '@/components/ui/Icons';
import { getAvatarColor } from './team.utils';

/**
 * Hands a MiniApp to another member of its organization.
 * Eligible: active MA_DEVELOPER or ADMIN of the app's organization (the API
 * checks the same). The previous owner stays on as Maintainer by default.
 */

export interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  organizationId?: string;
  /** Called with the updated app after a successful transfer. */
  onTransferred: (updated: any) => void;
}

const ELIGIBLE_ROLES = ['MA_DEVELOPER', 'ADMIN'];

function roleNameOf(u: User): string {
  const r = u.role?.name || u.roles?.[0]?.name || '';
  return typeof r === 'string' ? r : '';
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  formData,
  organizationId,
  onTransferred,
}: TransferOwnershipModalProps) {
  const [mounted, setMounted] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [keepPrevious, setKeepPrevious] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelected(null);
    setKeepPrevious(true);
    setError(null);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: 100, status: 'ACTIVE' };
        if (organizationId) params.organizationId = organizationId;
        const res = await usersApi.getAll(params);
        const list: User[] = Array.isArray(res) ? res : (res as any)?.data || [];
        if (!cancelled) setMembers(list);
      } catch {
        if (!cancelled) setError('Could not load organization members.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, organizationId]);

  // Escape closes, unless a transfer is in flight
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, submitting, onClose]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((u) => u.id !== formData.ownerId)
      .filter((u) => ELIGIBLE_ROLES.includes(roleNameOf(u)))
      .filter(
        (u) =>
          !q ||
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q),
      );
  }, [members, query, formData.ownerId]);

  if (!mounted || !isOpen) return null;

  const currentOwner = formData.owner?.name || formData.ownerName || 'the current owner';

  const handleTransfer = async () => {
    if (!selected || !formData.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await miniappsApi.transferOwnership(formData.id, selected.id, keepPrevious);
      toast.success(
        `${formData.name || 'MiniApp'} now belongs to ${selected.name || selected.email}.`,
        'Ownership transferred',
      );
      onTransferred(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'The transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-6 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-ownership-title"
    >
      <div className="absolute inset-0" onClick={() => !submitting && onClose()} />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h3
              id="transfer-ownership-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Transfer ownership
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choose a developer or admin of this organization to own{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formData.name || 'this MiniApp'}
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <label className="block">
            <span className="sr-only">Search members</span>
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email"
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </label>

          <div
            role="listbox"
            aria-label="Eligible members"
            className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800"
          >
            {loading ? (
              <p className="p-4 text-center text-xs text-slate-400">Loading members...</p>
            ) : candidates.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {query
                  ? 'No eligible member matches your search.'
                  : 'No other active developer or admin in this organization.'}
              </p>
            ) : (
              candidates.map((u) => {
                const isSelected = selected?.id === u.id;
                const display = u.name || u.email;
                return (
                  <button
                    key={u.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelected(u)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-600/10 dark:bg-brand-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
                        display,
                      )}`}
                    >
                      {display.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {display}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {u.email} · {roleNameOf(u) === 'ADMIN' ? 'Organization admin' : 'Developer'}
                      </div>
                    </div>
                    {isSelected && <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={keepPrevious}
              onChange={(e) => setKeepPrevious(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="block font-semibold text-slate-900 dark:text-slate-100">
                Keep {currentOwner} as a Maintainer
              </span>
              They can still edit, submit and manage the team. Clear this to remove their access.
            </span>
          </label>

          <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AlertTriangleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              The new owner can delete this MiniApp and transfer it again. The organization does not change.
            </span>
          </p>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!selected || submitting}
            className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Transferring...'
              : selected
                ? `Transfer to ${selected.name || selected.email}`
                : 'Transfer ownership'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
