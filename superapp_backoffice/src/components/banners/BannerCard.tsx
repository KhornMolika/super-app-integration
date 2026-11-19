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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Banner Preview Image */}
      <div className="relative aspect-[21/9] sm:aspect-[2.5/1] w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {banner.imageUrl ? (
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image Provided
          </div>
        )}

        {/* Display Order Pin */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-0.5 rounded-md">
          #{banner.displayOrder + 1}
        </div>

        {/* Status Pills Over Image */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {isExpired && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-600 text-white shadow">
              Expired
            </span>
          )}
          {isPending && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500 text-white shadow">
              Scheduled
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold shadow ${
              banner.isActive
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {banner.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {banner.title}
            </h3>
            {banner.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                {banner.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {renderActionBadge()}
          {renderAudienceBadge()}
        </div>

        {/* Schedule window if configured */}
        {(banner.startDate || banner.endDate) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
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
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          {/* Order Shift Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMoveUp(banner)}
              title="Move Up"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMoveDown(banner)}
              title="Move Down"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Active Toggle & CRUD */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleActive(banner)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                banner.isActive
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300'
              }`}
            >
              {banner.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <button
              type="button"
              onClick={() => onEdit(banner)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
              title="Edit Banner"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(banner)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:text-rose-400 dark:hover:bg-rose-900/30 transition-colors"
              title="Delete Banner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
