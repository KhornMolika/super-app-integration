'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  NotificationItem,
} from '@/api';
import {
  NotificationCategory,
  NotificationFiltersState,
  NotificationReadStatus,
  NotificationSeverity,
  NotificationTimeframe,
  CATEGORY_DEFINITIONS,
  matchNotification,
  getNotificationCategory,
  countActiveFilters,
} from './notification-filter.types';

export interface NotificationFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: NotificationFiltersState;
  onApply: (newFilters: NotificationFiltersState) => void;
  notifications: NotificationItem[];
}

export function NotificationFilterModal({
  isOpen,
  onClose,
  filters,
  onApply,
  notifications,
}: NotificationFilterModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<NotificationFiltersState>(filters);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync draft state with incoming filters whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
  }, [isOpen, filters]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute live match preview based on current draft settings
  const previewMatchingCount = useMemo(() => {
    return notifications.filter((n) => matchNotification(n, draft)).length;
  }, [notifications, draft]);

  // Counts by status
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.isRead).length, [notifications]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      SECURITY: 0,
      TESTING: 0,
      REVIEW: 0,
      SYSTEM: 0,
    };
    notifications.forEach((n) => {
      const cat = getNotificationCategory(n);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  if (!mounted || !isOpen) return null;

  const handleToggleCategory = (category: NotificationCategory) => {
    setDraft((prev) => {
      const exists = prev.categories.includes(category);
      let updated: NotificationCategory[];
      if (exists) {
        updated = prev.categories.filter((c) => c !== category);
      } else {
        updated = [...prev.categories, category];
      }
      return { ...prev, categories: updated };
    });
  };

  const handleSelectAllCategories = () => {
    setDraft((prev) => ({
      ...prev,
      categories: ['SECURITY', 'TESTING', 'REVIEW', 'SYSTEM'],
    }));
  };

  const handleClearCategories = () => {
    setDraft((prev) => ({
      ...prev,
      categories: [],
    }));
  };

  const handleReset = () => {
    setDraft({
      readStatus: 'ALL',
      categories: [],
      severity: 'ALL',
      timeframe: 'ALL',
      searchQuery: draft.searchQuery, // keep search query intact
    });
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const isCategorySelected = (cat: NotificationCategory) => {
    return draft.categories.includes(cat);
  };

  const draftActiveCount = countActiveFilters(draft);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 z-10 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="filter-modal-title" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Deep Filter
                </h3>
                {draftActiveCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                    {draftActiveCount} active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-dimensional filter across read status, alert categories, and timeframes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close filter modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1 -mr-1">
          {/* Section 1: Read Status */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Read Status
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Pick one view</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'ALL' as NotificationReadStatus, label: 'All Status', count: notifications.length, sub: 'Read & Unread' },
                { id: 'UNREAD' as NotificationReadStatus, label: 'Unread Only', count: unreadCount, sub: 'Requires action', highlight: unreadCount > 0 },
                { id: 'READ' as NotificationReadStatus, label: 'Read Only', count: readCount, sub: 'Archived history' },
              ].map((opt) => {
                const isSelected = draft.readStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, readStatus: opt.id }))}
                    className={`relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 text-brand-900 dark:text-brand-100 shadow-xs ring-1 ring-brand-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? 'bg-brand-500 text-white'
                            : opt.highlight
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block font-medium">
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Alert Categories (Multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
                {draft.categories.length > 0 && draft.categories.length < 4 && (
                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                    ({draft.categories.length} selected)
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                <button
                  type="button"
                  onClick={handleClearCategories}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_DEFINITIONS.map((cat) => {
                const selected = isCategorySelected(cat.id);
                const count = categoryCounts[cat.id] || 0;

                return (
                  <div
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      selected
                        ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-500 dark:border-brand-500/80 shadow-xs ring-1 ring-brand-500/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        selected
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {cat.label}
                        </span>
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                            selected
                              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {draft.categories.length === 0 && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 italic">
                No specific categories chosen — showing all categories by default.
              </p>
            )}
          </div>

          {/* Section 3: Priority / Severity & Outcome */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Severity & Outcome
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Optional</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'ALL' as NotificationSeverity, label: 'All Severities' },
                { id: 'ALERT' as NotificationSeverity, label: 'Alerts & Errors', dot: 'bg-rose-500' },
                { id: 'SUCCESS' as NotificationSeverity, label: 'Success / Passed', dot: 'bg-emerald-500' },
                { id: 'INFO' as NotificationSeverity, label: 'Info & Pipeline', dot: 'bg-blue-500' },
              ].map((sev) => {
                const isSelected = draft.severity === sev.id;
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, severity: sev.id }))}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {sev.dot && <span className={`w-2 h-2 rounded-full ${sev.dot}`} />}
                    <span>{sev.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Activity Timeframe */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activity Timeframe
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Recency</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'ALL' as NotificationTimeframe, label: 'All Time' },
                { id: 'TODAY' as NotificationTimeframe, label: 'Today (24h)' },
                { id: 'WEEK' as NotificationTimeframe, label: 'Last 7 Days' },
                { id: 'MONTH' as NotificationTimeframe, label: 'Last 30 Days' },
              ].map((tf) => {
                const isSelected = draft.timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, timeframe: tf.id }))}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Match Preview Banner */}
        <div className="px-4 py-2.5 mb-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Filtered preview matches:
            </span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white">
            {previewMatchingCount} of {notifications.length} notifications
          </span>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset to default
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Apply Filters</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">
                {previewMatchingCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
