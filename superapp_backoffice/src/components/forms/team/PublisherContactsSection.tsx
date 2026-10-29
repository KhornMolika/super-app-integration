'use client';

import React from 'react';
import { Input, Label, Button } from '@/components/ui/inputs';
import { BuildingIcon, ZapIcon, LockIcon } from '@/components/ui/Icons';
import { getAvatarColor } from './team.utils';

export interface PublisherContactsSectionProps {
  formData: any;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allErrors?: Record<string, string>;
  isEditable?: boolean;
  agencyName: string;
  telegramStatus: any;
  updateField: (name: string, value: string) => void;
  handleAutofillOwner: () => void;
  handleTestEmail: () => Promise<void>;
  isTestingEmail: boolean;
  isEditingOwner: boolean;
  setIsEditingOwner: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function PublisherContactsSection({
  formData,
  handleChange,
  allErrors = {},
  isEditable = true,
  agencyName,
  telegramStatus,
  updateField,
  handleAutofillOwner,
  handleTestEmail,
  isTestingEmail,
  isEditingOwner,
  setIsEditingOwner,
}: PublisherContactsSectionProps) {
  const ownerName =
    formData.ownerName ||
    formData.owner?.name ||
    telegramStatus?.user?.name ||
    'Administrative Owner';

  const ownerEmail =
    formData.ownerEmail ||
    formData.owner?.email ||
    telegramStatus?.user?.email ||
    '';

  const orgNameDisplay =
    formData.teamName ||
    (typeof formData.organization === 'string'
      ? formData.organization
      : formData.organization?.name) ||
    telegramStatus?.user?.organization?.name ||
    'Financial Technology Center';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center">
          <BuildingIcon className="w-4 h-4 text-brand-500 shrink-0" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Publisher &amp; Support Contacts
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Primary organization contacts responsible for administrative ownership, support, and public listing.
          </p>
        </div>
      </div>

      {/* Administrative Owner & Creator Strip */}
      <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarColor(
              ownerName,
            )}`}
          >
            {ownerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              <span className="truncate">{ownerName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/70 text-brand-800 dark:text-brand-300 font-bold uppercase tracking-wider border border-brand-200 dark:border-brand-900/60">
                Primary Creator
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {ownerEmail || 'No email configured'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {ownerEmail && (
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEmail}
              disabled={isTestingEmail}
              className="text-xs px-2.5 py-1 h-7.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Send a verification test email to owner"
            >
              <svg
                className={`w-3.5 h-3.5 ${isTestingEmail ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>{isTestingEmail ? 'Sending...' : 'Send Test Email'}</span>
            </Button>
          )}
          {isEditable && (
            <button
              type="button"
              onClick={() => setIsEditingOwner(!isEditingOwner)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800/80 bg-brand-50/60 dark:bg-brand-950/40 hover:bg-brand-100/60 transition-colors cursor-pointer"
            >
              {isEditingOwner ? 'Done' : 'Edit Creator'}
            </button>
          )}
        </div>
      </div>

      {/* Edit Creator Details Form (Collapsible) */}
      {(isEditingOwner || !formData.ownerEmail) && (
        <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Update Creator Credentials
            </span>
            {telegramStatus?.user?.name && isEditable && (
              <button
                type="button"
                onClick={handleAutofillOwner}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Fill from Profile ({telegramStatus.user.name})</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Owner Name</Label>
              <Input
                name="ownerName"
                value={formData.ownerName || ''}
                onChange={handleChange}
                placeholder="e.g. Molika Khorn"
                disabled={!isEditable}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">
                Owner Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                required
                name="ownerEmail"
                value={formData.ownerEmail || ''}
                onChange={handleChange}
                type="email"
                placeholder="e.g. molika@org.gov"
                disabled={!isEditable}
                className={`mt-1 ${
                  allErrors.ownerEmail
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/50'
                    : ''
                }`}
              />
              {allErrors.ownerEmail && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {allErrors.ownerEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Organization Name & Public Support Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <BuildingIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>Organization Name</span>
            </Label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
              <LockIcon className="w-3 h-3 text-slate-400" />
              <span>Bound to Organization</span>
            </span>
          </div>
          <div className="relative">
            <Input
              name="teamName"
              value={orgNameDisplay}
              placeholder="e.g. Financial Technology Center"
              disabled={true}
              className="bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed pl-9"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <LockIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Organization is locked to your registered organization ({agencyName}) to prevent cross-organization reassignment.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Public Support Email</Label>
            {formData.ownerEmail && isEditable && (
              <button
                type="button"
                onClick={() => updateField('supportEmail', formData.ownerEmail)}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium cursor-pointer"
              >
                Use Owner Email
              </button>
            )}
          </div>
          <Input
            name="supportEmail"
            value={formData.supportEmail || ''}
            onChange={handleChange}
            type="email"
            placeholder="e.g. support@fintech.gov"
            disabled={!isEditable}
            className={
              allErrors.supportEmail
                ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50'
                : ''
            }
          />
          {allErrors.supportEmail && (
            <p className="mt-1.5 text-sm text-rose-600 font-medium">
              {allErrors.supportEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
