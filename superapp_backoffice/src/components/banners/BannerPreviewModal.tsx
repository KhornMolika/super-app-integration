'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Smartphone,
  Maximize2,
  ExternalLink,
  Package,
  Compass,
  Eye,
  Calendar,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Pencil,
  Sparkles,
  Layers,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import type { SuperAppBanner } from '@/types/banner.types';

interface BannerPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner: SuperAppBanner | null;
  allBanners?: SuperAppBanner[];
  onSelectBanner?: (banner: SuperAppBanner) => void;
  onEdit?: (banner: SuperAppBanner) => void;
}

export function BannerPreviewModal({
  isOpen,
  onClose,
  banner,
  allBanners = [],
  onSelectBanner,
  onEdit,
}: BannerPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [previewMode, setPreviewMode] = useState<'IN_APP' | 'ORIGINAL'>('IN_APP');
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset zoom on banner change
  useEffect(() => {
    setZoomLevel(1);
    setImageMeta(null);
  }, [banner?.id, previewMode]);

  // Handle keyboard navigation
  const currentIndex = useMemo(() => {
    if (!banner || !allBanners.length) return -1;
    return allBanners.findIndex((b) => b.id === banner.id);
  }, [banner, allBanners]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allBanners.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectBanner) {
      onSelectBanner(allBanners[currentIndex - 1]);
    }
  }, [hasPrev, onSelectBanner, allBanners, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectBanner) {
      onSelectBanner(allBanners[currentIndex + 1]);
    }
  }, [hasNext, onSelectBanner, allBanners, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, handlePrev, handleNext, onClose]);

  if (!mounted || !isOpen || !banner) return null;

  const now = new Date();
  const isExpired = banner.endDate ? new Date(banner.endDate) < now : false;
  const isPending = banner.startDate ? new Date(banner.startDate) > now : false;

  const copyImageUrl = () => {
    if (!banner.imageUrl) return;
    navigator.clipboard.writeText(banner.imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderActionLabel = () => {
    switch (banner.actionType) {
      case 'MINI_APP':
        return `Open MiniApp: ${banner.actionValue || 'Default'}`;
      case 'EXTERNAL_URL':
        return `Visit Link: ${banner.actionValue || ''}`;
      case 'IN_APP_ROUTE':
        return `Go to: ${banner.actionValue || ''}`;
      case 'NONE':
      default:
        return 'Promotional Banner (No Action)';
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Banner Preview
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  #{banner.displayOrder + 1}
                </span>
                {allBanners.length > 1 && (
                  <span className="text-xs text-slate-400">
                    ({currentIndex + 1} of {allBanners.length})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {banner.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: In-App Simulation vs Raw Asset */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewMode('IN_APP')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewMode === 'IN_APP'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile Simulation</span>
                <span className="sm:hidden">App</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('ORIGINAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  previewMode === 'ORIGINAL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Asset View</span>
                <span className="sm:hidden">Asset</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          {/* Left / Center View Area */}
          <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-100/70 dark:bg-slate-950/50 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 relative select-none">
            {/* Quick Carousel Prev/Next Overlay Buttons */}
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrev}
                title="Previous banner (Left Arrow)"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-md hover:bg-white dark:hover:bg-slate-800 hover:scale-110 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={handleNext}
                title="Next banner (Right Arrow)"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 shadow-md hover:bg-white dark:hover:bg-slate-800 hover:scale-110 transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {previewMode === 'IN_APP' ? (
              /* ======================================================== */
              /* MOBILE SUPERAPP DEVICE MOCKUP                            */
              /* ======================================================== */
              <div className="w-full max-w-[340px] sm:max-w-[370px] bg-white dark:bg-slate-900 rounded-[38px] p-3 shadow-2xl border-[5px] border-slate-800 dark:border-slate-700/80 relative overflow-hidden transition-all">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-end px-3">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                </div>

                {/* Simulated In-App Screen */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-[30px] overflow-hidden flex flex-col pt-7 pb-4 px-3.5 space-y-3.5 min-h-[460px]">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-1 pt-1">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span>5G</span>
                      <div className="w-4 h-2 rounded-xs border border-slate-700 dark:border-slate-300 flex items-center p-0.5">
                        <div className="w-2 h-1 bg-slate-700 dark:bg-slate-300 rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* SuperApp App Header */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                        F
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                        FSA SuperApp
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300">
                        🔔
                      </div>
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 flex items-center justify-center text-[10px] font-bold">
                        JD
                      </div>
                    </div>
                  </div>

                  {/* Search bar simulation */}
                  <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-slate-400 text-xs shadow-2xs">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-[11px]">Search mini-apps, services...</span>
                  </div>

                  {/* HERO BANNER CAROUSEL ITEM (The Core Preview) */}
                  <div className="space-y-2">
                    <div className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/80 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
                      {banner.imageUrl ? (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            setImageMeta({ width: target.naturalWidth, height: target.naturalHeight });
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          No Image
                        </div>
                      )}

                      {/* Display Order badge */}
                      <div className="absolute top-2 left-2 bg-slate-900/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        #{banner.displayOrder + 1}
                      </div>

                      {/* Audience badge */}
                      <div className="absolute top-2 right-2">
                        {banner.targetAudience === 'ALL_FSA_STAFF' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                            FSA Staff
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                            Public
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Carousel Dots */}
                    <div className="flex items-center justify-center gap-1 pt-0.5">
                      {allBanners.slice(0, 5).map((b, idx) => (
                        <div
                          key={b.id || idx}
                          className={`h-1.5 rounded-full transition-all ${
                            b.id === banner.id
                              ? 'w-4 bg-brand-600 dark:bg-brand-400'
                              : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Banner Interactive CTA Card */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {banner.title}
                        </span>
                        {banner.actionType !== 'NONE' && (
                          <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-0.5 shrink-0">
                            Launch <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      {banner.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {banner.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Simulated App Shortcuts Below */}
                  <div className="pt-1 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 px-0.5">
                      Ecosystem Services
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {['Tax Vault', 'License', 'Signatures', 'Directory'].map((name, i) => (
                        <div key={name} className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-xs shadow-2xs">
                            {['📑', '🛡️', '✍️', '👥'][i]}
                          </div>
                          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[60px]">
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* ORIGINAL HIGH-RESOLUTION ASSET VIEW                      */
              /* ======================================================== */
              <div className="w-full h-full flex flex-col items-center justify-center">
                {/* Image Zoom Toolbar */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-1.5 text-slate-700 dark:text-slate-300">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-w-full max-h-[460px] overflow-auto p-4 flex items-center justify-center">
                  <div
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
                    className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-700 bg-checkerboard"
                  >
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="max-h-[380px] w-auto object-contain"
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          setImageMeta({ width: target.naturalWidth, height: target.naturalHeight });
                        }}
                      />
                    ) : (
                      <div className="w-64 h-32 flex items-center justify-center text-slate-400 text-xs">
                        No Image Available
                      </div>
                    )}
                  </div>
                </div>

                {imageMeta && (
                  <div className="mt-3 text-xs font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                    Natural Dimensions: {imageMeta.width} × {imageMeta.height} px
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Details Sidebar */}
          <div className="lg:col-span-4 p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900 overflow-y-auto">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Banner Information
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {banner.title}
              </h3>
              {banner.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {banner.description}
                </p>
              )}
            </div>

            {/* Status & Audience Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  banner.isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    banner.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {banner.isActive ? 'Active' : 'Inactive'}
              </span>

              {isExpired && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                  Expired
                </span>
              )}

              {isPending && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                  Scheduled
                </span>
              )}

              {banner.targetAudience === 'ALL_FSA_STAFF' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                  <Users className="w-3.5 h-3.5" />
                  FSA Staff Only
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <Globe className="w-3.5 h-3.5" />
                  Public Audience
                </span>
              )}
            </div>

            {/* Action Details */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Action & Route
              </span>
              <div className="flex items-center gap-2">
                {banner.actionType === 'MINI_APP' && (
                  <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                )}
                {banner.actionType === 'EXTERNAL_URL' && (
                  <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                )}
                {banner.actionType === 'IN_APP_ROUTE' && (
                  <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                {banner.actionType === 'NONE' && (
                  <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {renderActionLabel()}
                </span>
              </div>
              {banner.actionValue && banner.actionType !== 'NONE' && (
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 break-all select-all">
                  {banner.actionValue}
                </div>
              )}
            </div>

            {/* Campaign Schedule */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Campaign Schedule
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {banner.startDate
                    ? new Date(banner.startDate).toLocaleString()
                    : 'Immediately'}
                  {' → '}
                  {banner.endDate
                    ? new Date(banner.endDate).toLocaleString()
                    : 'Indefinite'}
                </span>
              </div>
            </div>

            {/* Technical Metadata */}
            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Display Order:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Position #{banner.displayOrder + 1}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Banner ID:</span>
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                  {banner.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created At:</span>
                <span>{new Date(banner.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={copyImageUrl}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied Image URL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Asset URL</span>
                  </>
                )}
              </button>

              {banner.imageUrl && (
                <a
                  href={banner.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open Full Asset in New Tab</span>
                </a>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(banner);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit This Banner</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Navigator Footer */}
        {allBanners.length > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Banner</span>
            </button>

            <span className="font-medium text-slate-600 dark:text-slate-300">
              Use <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">←</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">→</kbd> keys to browse
            </span>

            <button
              type="button"
              disabled={!hasNext}
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span>Next Banner</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
