'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  FileCode2,
  SlidersHorizontal,
  Scale,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Bell,
  CheckSquare,
  FileText,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/inputs';

export type ReviewCategoryType =
  | 'SECURITY'
  | 'PERMISSIONS'
  | 'CODE_QUALITY'
  | 'METADATA'
  | 'LEGAL_COMPLIANCE'
  | 'OTHER';

export interface ReviewChecklistDraftItem {
  id: string;
  description: string;
}

export interface StructuredReviewDecisionPayload {
  category: ReviewCategoryType;
  notes: string;
  checklist: Array<{
    id: string;
    description: string;
    resolved: boolean;
    resolutionNote?: string;
  }>;
  targetFiles?: string[];
  notifyDev?: boolean;
}

export interface StructuredReviewDecisionModalProps {
  isOpen: boolean;
  mode: 'request-changes' | 'reject';
  appName: string;
  appId: string;
  onClose: () => void;
  onSubmit: (payload: StructuredReviewDecisionPayload) => Promise<void> | void;
  isLoading?: boolean;
}

const CATEGORY_DEFINITIONS: Array<{
  id: ReviewCategoryType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'slate';
  templates: Array<{ title: string; note: string; checklistItem: string }>;
}> = [
  {
    id: 'SECURITY',
    label: 'Security & Sandbox Violation',
    shortLabel: 'Security',
    icon: ShieldAlert,
    tone: 'rose',
    templates: [
      {
        title: 'Insecure Network Traffic',
        note: 'Cleartext HTTP traffic detected. All network communication must use encrypted HTTPS endpoints with verified TLS certificates.',
        checklistItem: 'Upgrade all API and asset endpoints from http:// to https:// in source and manifest.',
      },
      {
        title: 'Vulnerable Dependencies',
        note: 'Automated vulnerability scanner identified high-severity CVEs in third-party package dependencies.',
        checklistItem: 'Update vulnerable third-party dependencies in pubspec.yaml to their patched versions.',
      },
      {
        title: 'Bridge / Sandbox Violation',
        note: 'Attempting to invoke un-sandboxed platform channels or reflection APIs outside host platform boundaries.',
        checklistItem: 'Remove unauthorized native bridge invocations and adhere strictly to SuperApp SDK boundaries.',
      },
    ],
  },
  {
    id: 'PERMISSIONS',
    label: 'Capability & Permission Mismatch',
    shortLabel: 'Permissions',
    icon: KeyRound,
    tone: 'amber',
    templates: [
      {
        title: 'Missing Justification',
        note: 'Sensitive device capabilities are requested without adequate functional explanation in the capability declaration.',
        checklistItem: 'Provide clear, user-facing rationale for each requested capability in the Capabilities tab.',
      },
      {
        title: 'Unsupported Host Shell Capability',
        note: 'Requested capability is not whitelisted by the current SuperApp host shell build.',
        checklistItem: 'Remove unsupported host shell capabilities or request platform approval before resubmission.',
      },
      {
        title: 'Over-Privileged Access',
        note: 'MiniApp declares permissions that exceed the minimal privileges required for its core functionality.',
        checklistItem: 'Remove unnecessary capabilities to align with the principle of least privilege.',
      },
    ],
  },
  {
    id: 'CODE_QUALITY',
    label: 'Code Quality & Architecture',
    shortLabel: 'Code Quality',
    icon: FileCode2,
    tone: 'blue',
    templates: [
      {
        title: 'Widget / Entrypoint Error',
        note: 'MiniApp entrypoint failed to initialize or crashed during sandbox preview execution.',
        checklistItem: 'Fix widget tree exception and ensure top-level entrypoint runs cleanly in sandbox preview.',
      },
      {
        title: 'Excessive Bundle Size',
        note: 'Compiled package payload exceeds the maximum allowable bundle size limit.',
        checklistItem: 'Optimize and compress bundled assets, tree-shake unneeded libraries, and verify bundle size.',
      },
      {
        title: 'Missing Error Boundaries',
        note: 'Unhanded network or UI exceptions cause white-screen crashes for users.',
        checklistItem: 'Implement proper Flutter/React error boundary fallbacks for failed remote requests.',
      },
    ],
  },
  {
    id: 'METADATA',
    label: 'Metadata, Icons & Assets',
    shortLabel: 'Metadata',
    icon: SlidersHorizontal,
    tone: 'purple',
    templates: [
      {
        title: 'App Icon Requirements',
        note: 'App icon does not meet visual standards (must be high-res 512x512 PNG with transparent background).',
        checklistItem: 'Upload high-resolution 512x512 PNG icon without borders or rounded corner clipping.',
      },
      {
        title: 'Vague Description',
        note: 'App title, tagline, or short description is vague and does not clearly describe features to end-users.',
        checklistItem: 'Update application summary and detailed description to accurately describe functionality.',
      },
      {
        title: 'Invalid Support Channels',
        note: 'Support contact email or developer website provided is unreachable or returns delivery failure.',
        checklistItem: 'Update support email and website with valid, monitored contact channels.',
      },
    ],
  },
  {
    id: 'LEGAL_COMPLIANCE',
    label: 'Legal & Privacy Policy',
    shortLabel: 'Legal',
    icon: Scale,
    tone: 'emerald',
    templates: [
      {
        title: 'Broken Privacy Policy URL',
        note: 'The submitted privacy policy URL returns HTTP 404 or requires unauthorized login.',
        checklistItem: 'Host public, accessible Privacy Policy document and verify live HTTP status.',
      },
      {
        title: 'Missing User Data Disclosures',
        note: 'MiniApp processes user data or location telemetry without corresponding privacy policy disclosures.',
        checklistItem: 'Include clear data retention and user data collection terms in legal documentation.',
      },
    ],
  },
  {
    id: 'OTHER',
    label: 'Other Operational Reason',
    shortLabel: 'Other',
    icon: HelpCircle,
    tone: 'slate',
    templates: [
      {
        title: 'Domain Verification Failed',
        note: 'Associated web domain could not be verified via DNS TXT or assetlinks.json / apple-app-site-association.',
        checklistItem: 'Complete domain association verification in Technical Integration tab.',
      },
      {
        title: 'Duplicate Submission',
        note: 'This submission duplicates an existing live or pending MiniApp.',
        checklistItem: 'Clarify uniqueness of application or coordinate with the primary application maintainer.',
      },
    ],
  },
];

export default function StructuredReviewDecisionModal({
  isOpen,
  mode,
  appName,
  appId,
  onClose,
  onSubmit,
  isLoading = false,
}: StructuredReviewDecisionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReviewCategoryType>('SECURITY');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<ReviewChecklistDraftItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [targetFileText, setTargetFileText] = useState('');
  const [notifyDev, setNotifyDev] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('SECURITY');
      setNotes('');
      setChecklist([
        {
          id: `item-${Date.now()}-1`,
          description: 'Address all identified root-cause items and verify in sandbox preview.',
        },
      ]);
      setNewItemText('');
      setTargetFileText('');
      setNotifyDev(true);
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isReject = mode === 'reject';
  const categoryDef = CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategory) || CATEGORY_DEFINITIONS[0];

  const handleAddChecklistItem = (text?: string) => {
    const itemText = (text || newItemText).trim();
    if (!itemText) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: itemText,
      },
    ]);
    if (!text) setNewItemText('');
    setValidationError(null);
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateChecklistItem = (id: string, newDescription: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: newDescription } : item))
    );
  };

  const handleApplyTemplate = (tpl: { title: string; note: string; checklistItem: string }) => {
    setNotes((prev) => (prev.trim() ? `${prev.trim()}\n\n${tpl.note}` : tpl.note));
    handleAddChecklistItem(tpl.checklistItem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setValidationError('Please provide detailed notes or instructions for the developer.');
      return;
    }
    if (checklist.length === 0) {
      setValidationError('Please specify at least one required checklist action item.');
      return;
    }

    const targetFiles = targetFileText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setValidationError(null);
    await onSubmit({
      category: selectedCategory,
      notes: notes.trim(),
      checklist: checklist.map((item) => ({
        id: item.id,
        description: item.description.trim(),
        resolved: false,
        resolutionNote: '',
      })),
      targetFiles,
      notifyDev,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="structured-decision-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="fixed inset-0" onClick={!isLoading ? onClose : undefined} />

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 z-10">
        {/* Header */}
        <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                isReject
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}
            >
              {isReject ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isReject
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                  }`}
                >
                  {isReject ? 'Formal Rejection' : 'Action Required'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]">
                  {appId}
                </span>
              </div>
              <h3 id="structured-decision-title" className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {isReject ? `Reject MiniApp: ${appName}` : `Request Changes: ${appName}`}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* Step 1: Categorical Root Cause Pills */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>1. Root-Cause Category</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Helps developers prioritize remediation
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_DEFINITIONS.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{cat.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Template Snippets for Selected Category */}
          {categoryDef.templates.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Quick Suggestion Templates (Click to insert)</span>
                </div>
                {selectedCategory === 'LEGAL_COMPLIANCE' && appId && (
                  <a
                    href={`/miniapps/${appId}/legal`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    title="Open app's legal terms & privacy policy page in a new tab"
                  >
                    <span>View App Legal Documents</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categoryDef.templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-slate-400" />
                    <span>{tpl.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Itemized Actionable Remediation Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>2. Required Remediation Checklist</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Gated: Developer must address every item before resubmission
              </span>
            </div>

            <div className="space-y-2 mb-2.5">
              {checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs group"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                    placeholder="Describe specific required fix..."
                    className="flex-1 bg-transparent border-0 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-0 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-80 group-hover:opacity-100"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new checklist item row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Add another required checklist item..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-brand-500 focus:outline-none transition-colors"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddChecklistItem()}
                disabled={!newItemText.trim()}
                className="text-xs px-3 py-2 rounded-xl flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </Button>
            </div>
          </div>

          {/* Step 3: Detailed Feedback & Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>3. Detailed Reviewer Notes & Explanation</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Visible to developer in detail view & activity log
              </span>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setValidationError(null);
              }}
              placeholder="Provide clear technical rationale, reproduction steps, or compliance guidance..."
              className="w-full px-3.5 py-3 text-xs leading-relaxed rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-sans"
            />
          </div>

          {/* Optional: Affected Files / Modules */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Target Files or Modules (Optional)
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">Comma-separated</span>
            </div>
            <input
              type="text"
              value={targetFileText}
              onChange={(e) => setTargetFileText(e.target.value)}
              placeholder="e.g. pubspec.yaml, lib/main.dart, privacy-policy.html"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Notification Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <input
              id="notify-dev"
              type="checkbox"
              checked={notifyDev}
              onChange={(e) => setNotifyDev(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="notify-dev" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <div className="font-semibold flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Notify Developer Immediately</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dispatches real-time WebSocket alert, Telegram group notification, and email to registered maintainers.
              </p>
            </label>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{validationError}</span>
            </div>
          )}
        </form>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs px-4 py-2.5 rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-white shadow-sm transition-all ${
              isReject
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
            }`}
          >
            {isLoading ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting Decision...</span>
              </>
            ) : isReject ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Send Changes Request</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
