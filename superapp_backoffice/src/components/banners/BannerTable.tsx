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

interface BannerTableProps {
  banners: SuperAppBanner[];
  allBanners: SuperAppBanner[];
  onPreview: (banner: SuperAppBanner) => void;
  onEdit: (banner: SuperAppBanner) => void;
  onDelete: (banner: SuperAppBanner) => void;
  onToggleActive: (banner: SuperAppBanner) => void;
  onMoveUp: (banner: SuperAppBanner) => void;
  onMoveDown: (banner: SuperAppBanner) => void;
}

export function BannerTable({
  banners,
  allBanners,
  onPreview,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}: BannerTableProps) {
  const now = new Date();

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3.5 w-16 text-center">Order</th>
              <th className="px-4 py-3.5 min-w-[280px]">Banner Details</th>
              <th className="px-4 py-3.5 min-w-[180px]">Action Destination</th>
              <th className="px-4 py-3.5 min-w-[140px]">Audience</th>
              <th className="px-4 py-3.5 min-w-[160px]">Schedule</th>
              <th className="px-4 py-3.5 w-28 text-center">Status</th>
              <th className="px-5 py-3.5 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
            {banners.map((banner) => {
              const overallIndex = allBanners.findIndex((b) => b.id === banner.id);
              const isFirst = overallIndex === 0;
              const isLast = overallIndex === allBanners.length - 1;

              const isExpired = banner.endDate ? new Date(banner.endDate) < now : false;
              const isPending = banner.startDate ? new Date(banner.startDate) > now : false;

              return (
                <tr
                  key={banner.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group"
                >
                  {/* Order & Reordering */}
                  <td className="px-5 py-3 text-center align-middle">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => onMoveUp(banner)}
                        title="Move Up"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        #{banner.displayOrder + 1}
                      </span>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => onMoveDown(banner)}
                        title="Move Down"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Thumbnail & Title */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      {/* Clickable Image Thumbnail with Hover Eye Icon */}
                      <button
                        type="button"
                        onClick={() => onPreview(banner)}
                        className="relative w-24 sm:w-28 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 group/thumb cursor-pointer shadow-2xs"
                        title="Click to preview banner"
                      >
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            No Image
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => onPreview(banner)}
                          className="font-semibold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-left line-clamp-1 cursor-pointer"
                        >
                          {banner.title}
                        </button>
                        {banner.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {banner.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Action / Destination */}
                  <td className="px-4 py-3 align-middle">
                    <div className="space-y-1">
                      {banner.actionType === 'MINI_APP' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                          <Package className="w-3 h-3" />
                          <span>MiniApp</span>
                        </span>
                      )}
                      {banner.actionType === 'EXTERNAL_URL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <ExternalLink className="w-3 h-3" />
                          <span>External URL</span>
                        </span>
                      )}
                      {banner.actionType === 'IN_APP_ROUTE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Compass className="w-3 h-3" />
                          <span>In-App Route</span>
                        </span>
                      )}
                      {banner.actionType === 'NONE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Eye className="w-3 h-3" />
                          <span>Visual Display</span>
                        </span>
                      )}

                      {banner.actionValue && banner.actionType !== 'NONE' && (
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={banner.actionValue}>
                          {banner.actionValue}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Target Audience */}
                  <td className="px-4 py-3 align-middle">
                    {banner.targetAudience === 'ALL_FSA_STAFF' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Users className="w-3 h-3" />
                        <span>FSA Staff</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    )}
                  </td>

                  {/* Schedule */}
                  <td className="px-4 py-3 align-middle">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {banner.startDate
                            ? new Date(banner.startDate).toLocaleDateString()
                            : 'Immediate'}
                          {' → '}
                          {banner.endDate
                            ? new Date(banner.endDate).toLocaleDateString()
                            : 'Indefinite'}
                        </span>
                      </div>

                      {/* Timeliness badges */}
                      <div className="flex items-center gap-1">
                        {isExpired && (
                          <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            Expired
                          </span>
                        )}
                        {isPending && (
                          <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td className="px-4 py-3 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => onToggleActive(banner)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        banner.isActive
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                      title="Click to toggle active status"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          banner.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{banner.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>

                  {/* Actions Column */}
                  <td className="px-5 py-3 text-right align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onPreview(banner)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-brand-950/40 transition-colors cursor-pointer"
                        title="Preview Banner"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(banner)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:text-slate-400 dark:hover:text-brand-400 dark:hover:bg-brand-950/40 transition-colors cursor-pointer"
                        title="Edit Banner"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(banner)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
