'use client';

import React from 'react';
import type { SuperAppBanner } from '@/types/banner.types';
import {
  ExternalLink,
  Package,
  Compass,
  Eye,
  Calendar,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Globe,
  Users,
} from 'lucide-react';

interface BannerCardProps {
  banner: SuperAppBanner;
  isFirst: boolean;
  isLast: boolean;
  onPreview: (banner: SuperAppBanner) => void;
  onEdit: (banner: SuperAppBanner) => void;
  onDelete: (banner: SuperAppBanner) => void;
  onToggleActive: (banner: SuperAppBanner) => void;
  onMoveUp: (banner: SuperAppBanner) => void;
  onMoveDown: (banner: SuperAppBanner) => void;
}

export function BannerCard({
  banner,
  isFirst,
  isLast,
  onPreview,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}: BannerCardProps) {
  const now = new Date();
  const isExpired = banner.endDate ? new Date(banner.endDate) < now : false;
  const isPending = banner.startDate ? new Date(banner.startDate) > now : false;

  const renderActionBadge = () => {
    switch (banner.actionType) {
      case 'MINI_APP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <Package className="w-3.5 h-3.5" />
            <span>MiniApp: {banner.actionValue || 'Default'}</span>
          </span>
        );
      case 'EXTERNAL_URL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate max-w-[150px]">{banner.actionValue}</span>
          </span>
        );
      case 'IN_APP_ROUTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Compass className="w-3.5 h-3.5" />
            <span>Route: {banner.actionValue}</span>
          </span>
        );
      case 'NONE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <Eye className="w-3.5 h-3.5" />
            <span>Visual Display</span>
          </span>
        );
    }
  };

  const renderAudienceBadge = () => {
    if (banner.targetAudience === 'ALL_FSA_STAFF') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Users className="w-3 h-3" />
          <span>FSA Staff Only</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <Globe className="w-3 h-3" />
        <span>Public</span>
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs overflow-hidden hover:shadow-md transition-all flex flex-col">
      {/* Banner Preview Image */}
      <div
        onClick={() => onPreview(banner)}
        className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer group/image"
        title="Click to preview banner"
      >
        {banner.imageUrl ? (
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            No Image Provided
          </div>
        )}

        {/* Hover Eye Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-2xs">
          <Eye className="w-4 h-4" />
          <span>Preview Banner</span>
        </div>

        {/* Display Order Pin */}
        <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-xs font-bold px-2 py-0.5 rounded-md z-10">
          #{banner.displayOrder + 1}
        </div>

        {/* Status Pills Over Image */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {isExpired && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-600 text-white shadow-xs">
              Expired
            </span>
          )}
          {isPending && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500 text-white shadow-xs">
              Scheduled
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold shadow-xs ${
              banner.isActive
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-500 text-white'
            }`}
          >
            {banner.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
              {banner.title}
            </h3>
            {banner.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                {banner.description}
              </p>
            )}
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {renderActionBadge()}
            {renderAudienceBadge()}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {/* Schedule window if configured */}
          {(banner.startDate || banner.endDate) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {banner.startDate
                  ? new Date(banner.startDate).toLocaleDateString()
                  : 'Now'}{' '}
                -{' '}
                {banner.endDate
                  ? new Date(banner.endDate).toLocaleDateString()
                  : 'Indefinite'}
              </span>
            </div>
          )}

          {/* Actions Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            {/* Order Shift Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => onMoveUp(banner)}
                title="Move Up"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => onMoveDown(banner)}
                title="Move Down"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Active Toggle & CRUD */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleActive(banner)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  banner.isActive
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300'
                }`}
              >
                {banner.isActive ? 'Deactivate' : 'Activate'}
              </button>

              <button
                type="button"
                onClick={() => onPreview(banner)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-brand-900/30 transition-colors cursor-pointer"
                title="Preview Banner"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onEdit(banner)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-brand-900/30 transition-colors cursor-pointer"
                title="Edit Banner"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onDelete(banner)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                title="Delete Banner"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
