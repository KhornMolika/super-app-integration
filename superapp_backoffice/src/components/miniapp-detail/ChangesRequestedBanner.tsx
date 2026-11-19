'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  KeyRound,
  FileCode2,
  SlidersHorizontal,
  Scale,
  HelpCircle,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RotateCcw,
  Send,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/inputs';

export interface StructuredChecklistItem {
  id: string;
  description: string;
  resolved: boolean;
  resolutionNote?: string;
}

export interface StructuredFeedbackData {
  category?: string;
  notes?: string;
  checklist?: StructuredChecklistItem[];
  targetFiles?: string[];
  reviewerId?: string;
  createdAt?: string;
}

export interface ChangesRequestedBannerProps {
  miniAppId?: string;
  status: string;
  structuredFeedback?: StructuredFeedbackData | null;
  legacyReason?: string;
  isOwnerOrMaintainer: boolean;
  isSubmitting: boolean;
  onResubmit: (resolutions: Array<{ id: string; resolved: boolean; resolutionNote?: string }>) => Promise<void> | void;
  compact?: boolean;
  isStandalonePage?: boolean;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  SECURITY: {
    label: 'Security & Sandbox Violation',
    icon: ShieldAlert,
    tone: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
  },
  PERMISSIONS: {
    label: 'Capability & Permission Mismatch',
    icon: KeyRound,
    tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
  },
  CODE_QUALITY: {
    label: 'Code Quality & Architecture',
    icon: FileCode2,
    tone: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
  },
  METADATA: {
    label: 'Metadata & Assets',
    icon: SlidersHorizontal,
    tone: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
  },
  LEGAL_COMPLIANCE: {
    label: 'Legal & Privacy Policy',
    icon: Scale,
    tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
  },
  OTHER: {
    label: 'Operational Reason',
    icon: HelpCircle,
    tone: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
  },
};

export default function ChangesRequestedBanner({
  miniAppId,
  status,
  structuredFeedback,
  legacyReason,
  isOwnerOrMaintainer,
  isSubmitting,
  onResubmit,
  compact = false,
  isStandalonePage = false,
}: ChangesRequestedBannerProps) {
  const isRejected = status === 'REJECTED';
  const isReviewOrHistory = status !== 'CHANGES_REQUESTED' && status !== 'REJECTED';
  const rawList = structuredFeedback?.checklist || [];

  const [checklistState, setChecklistState] = useState<StructuredChecklistItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact || isStandalonePage);

  useEffect(() => {
    if (rawList.length > 0) {
      setChecklistState(
        rawList.map((item) => ({
          id: item.id || String(Math.random()),
          description: item.description,
          resolved: Boolean(item.resolved),
          resolutionNote: item.resolutionNote || '',
        }))
      );
    } else {
      // If no structured checklist exists (legacy rejection), create a single default action
      setChecklistState([
        {
          id: 'legacy-action',
          description: legacyReason || 'Review requested changes and verify resolution.',
          resolved: false,
          resolutionNote: '',
        },
      ]);
    }
  }, [structuredFeedback, legacyReason]);

  const toggleResolved = (id: string) => {
    setChecklistState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, resolved: !item.resolved } : item))
    );
  };

  const updateResolutionNote = (id: string, note: string) => {
    setChecklistState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, resolutionNote: note } : item))
    );
  };

  // An item is addressed if marked resolved OR has an explanatory resolution note
  const isAddressed = (item: StructuredChecklistItem) =>
    item.resolved || Boolean(item.resolutionNote && item.resolutionNote.trim().length > 0);

  const addressedCount = checklistState.filter(isAddressed).length;
  const totalCount = checklistState.length;
  const allAddressed = totalCount > 0 && addressedCount === totalCount;
  const progressPercent = totalCount > 0 ? Math.round((addressedCount / totalCount) * 100) : 0;

  const categoryInfo =
    CATEGORY_META[structuredFeedback?.category || ''] || CATEGORY_META.SECURITY;
  const CategoryIcon = categoryInfo.icon;

  const handleResubmitClick = () => {
    if (!allAddressed || isSubmitting) return;
    onResubmit(
      checklistState.map((item) => ({
        id: item.id,
        resolved: item.resolved,
        resolutionNote: item.resolutionNote?.trim() || '',
      }))
    );
  };

  if (compact && !isExpanded) {
    return (
      <div
        className={`mb-6 px-4 py-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all ${
          isRejected
            ? 'bg-rose-50/50 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/60'
            : isReviewOrHistory
            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
            : 'bg-amber-50/50 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/60'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isRejected
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : isReviewOrHistory
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            {isRejected ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isReviewOrHistory ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isRejected
                  ? 'Submission Rejected'
                  : isReviewOrHistory
                  ? 'Remediation Review'
                  : 'Changes Requested Before Approval'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${categoryInfo.tone}`}
              >
                {categoryInfo.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({addressedCount}/{totalCount} items addressed)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-xl">
              {structuredFeedback?.notes || legacyReason || 'Review the requested modifications before resubmission.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {miniAppId && (
            <Link
              href={`/miniapps/${miniAppId}/remediation`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                isRejected
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : isReviewOrHistory
                  ? 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <span>Open Remediation Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors"
            title="Expand checklist on this page"
          >
            <span>Details</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-6 rounded-3xl border shadow-md transition-all overflow-hidden ${
        isRejected
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
          : isReviewOrHistory
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
          : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
      }`}
    >
      {/* Banner Top Header */}
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-inherit">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
              isRejected
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : isReviewOrHistory
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
          >
            {isRejected ? (
              <ShieldAlert className="w-6 h-6" />
            ) : isReviewOrHistory ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${categoryInfo.tone}`}
              >
                <CategoryIcon className="w-3.5 h-3.5" />
                <span>{structuredFeedback?.category ? categoryInfo.label : isRejected ? 'Rejected' : isReviewOrHistory ? 'Remediation Review' : 'Changes Requested'}</span>
              </span>

              {structuredFeedback?.createdAt && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Requested: {new Date(structuredFeedback.createdAt).toLocaleDateString()}</span>
                </span>
              )}
              {isReviewOrHistory && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Remediated by Developer
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isRejected
                ? 'Submission Rejected by SuperApp Reviewer'
                : isReviewOrHistory
                ? 'Remediation Checklist & Review History'
                : 'Changes Requested Before Approval'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl whitespace-pre-line font-sans">
              {structuredFeedback?.notes || legacyReason || 'Review the requested modifications below.'}
            </p>

            {/* Target Files chips */}
            {structuredFeedback?.targetFiles && structuredFeedback.targetFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target Files:</span>
                {structuredFeedback.targetFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 shadow-2xs"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{file}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Right Accordion & Full Workspace Actions */}
        <div className="flex items-center gap-2 self-start shrink-0">
          {miniAppId && !isStandalonePage && (
            <Link
              href={`/miniapps/${miniAppId}/remediation`}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Open full dedicated remediation workspace"
            >
              <span>Full Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>{isExpanded ? 'Collapse Checklist' : `Show Checklist (${addressedCount}/${totalCount})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Accordion Body: Checklist & Remediation Input */}
      {isExpanded && (
        <div className="p-5 sm:p-6 bg-white/60 dark:bg-slate-900/60 space-y-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Remediation Checklist
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  allAddressed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {addressedCount} of {totalCount} Addressed ({progressPercent}%)
              </span>
            </div>

            <div className="hidden sm:block w-36 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  allAddressed ? 'bg-emerald-500' : 'bg-brand-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {checklistState.map((item, idx) => {
              const addressed = isAddressed(item);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    addressed
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      disabled={!isOwnerOrMaintainer}
                      onClick={() => toggleResolved(item.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors border ${
                        item.resolved
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-transparent hover:border-brand-500'
                      }`}
                      aria-label="Toggle resolved status"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs font-semibold leading-relaxed ${
                            item.resolved
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {idx + 1}. {item.description}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            item.resolved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.resolutionNote?.trim()
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.resolved ? 'Resolved' : item.resolutionNote?.trim() ? 'Note Added' : 'Pending'}
                        </span>
                      </div>

                      {/* Developer Resolution / Rationale Note */}
                      {isOwnerOrMaintainer && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={item.resolutionNote || ''}
                            onChange={(e) => updateResolutionNote(item.id, e.target.value)}
                            placeholder="Add developer note, commit hash, or justification (e.g. Fixed in commit abc123)..."
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 focus:outline-none transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gated Resubmission Footer / Verification Footer */}
          {isReviewOrHistory ? (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>All {totalCount} requested modifications were addressed by the developer.</span>
              </span>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                SuperAdmin Verification Required
              </span>
            </div>
          ) : isOwnerOrMaintainer ? (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {!allAddressed ? (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Complete all checklist items (check off or supply resolution notes) to unlock resubmission.
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>All remediation items addressed. Ready for SuperApp review!</span>
                  </span>
                )}
              </div>

              <Button
                type="button"
                onClick={handleResubmitClick}
                disabled={!allAddressed || isSubmitting}
                className={`text-xs px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  allAddressed
                    ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer ring-2 ring-brand-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-0'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resubmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Resubmit for Review</span>
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
