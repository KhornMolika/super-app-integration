'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Image as ImageIcon,
  Plus,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useToast } from '@/components/ui/Toast';
import { bannersApi, unwrapData } from '@/api';
import type { SuperAppBanner, BannerAudience } from '@/types/banner.types';
import { BannerCard } from '@/components/banners/BannerCard';
import { BannerTable } from '@/components/banners/BannerTable';
import { BannerModal } from '@/components/banners/BannerModal';
import { BannerPreviewModal } from '@/components/banners/BannerPreviewModal';
import { Pagination } from '@/components/ui/Pagination';

export default function BannersPage() {
  const { toast } = useToast();

  const [banners, setBanners] = useState<SuperAppBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SuperAppBanner | null>(null);

  // Preview State
  const [previewBanner, setPreviewBanner] = useState<SuperAppBanner | null>(null);

  // Delete Confirmation State
  const [deletingBanner, setDeletingBanner] = useState<SuperAppBanner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Restore preferred view mode from localStorage on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('superapp_banner_view_mode');
      if (saved === 'grid' || saved === 'table') {
        setViewMode(saved);
        if (saved === 'table') {
          setPageSize(10);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('superapp_banner_view_mode', mode);
    } catch {
      // ignore localStorage errors
    }
  };

  const fetchBanners = useCallback(async () => {
    try {
      const data = await bannersApi.getAll({
        search: searchTerm.trim() || undefined,
        isActive:
          statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        targetAudience:
          audienceFilter === 'ALL'
            ? undefined
            : (audienceFilter as BannerAudience),
      });
      const items = Array.isArray(data)
        ? data
        : unwrapData<SuperAppBanner>(data);
      setBanners(items || []);
    } catch (err: any) {
      toast.error(
        err?.message || 'Could not connect to backend service.',
        'Failed to load banners',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, audienceFilter, statusFilter, toast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, audienceFilter, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBanners();
  };

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: SuperAppBanner) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (banner: SuperAppBanner) => {
    try {
      const formData = new FormData();
      formData.append('isActive', String(!banner.isActive));
      await bannersApi.update(banner.id, formData);
      toast.success(
        `"${banner.title}" status changed.`,
        banner.isActive ? 'Banner Deactivated' : 'Banner Activated',
      );
      fetchBanners();
    } catch (err: any) {
      toast.error(err?.message, 'Error updating banner');
    }
  };

  const handleMoveUp = async (banner: SuperAppBanner) => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    if (currentIndex <= 0) return;

    const prevBanner = banners[currentIndex - 1];
    const newItems = [
      { id: banner.id, displayOrder: prevBanner.displayOrder },
      { id: prevBanner.id, displayOrder: banner.displayOrder },
    ];

    try {
      await bannersApi.reorder(newItems);
      fetchBanners();
    } catch (err: any) {
      toast.error(err?.message, 'Reorder Failed');
    }
  };

  const handleMoveDown = async (banner: SuperAppBanner) => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    if (currentIndex < 0 || currentIndex >= banners.length - 1) return;

    const nextBanner = banners[currentIndex + 1];
    const newItems = [
      { id: banner.id, displayOrder: nextBanner.displayOrder },
      { id: nextBanner.id, displayOrder: banner.displayOrder },
    ];

    try {
      await bannersApi.reorder(newItems);
      fetchBanners();
    } catch (err: any) {
      toast.error(err?.message, 'Reorder Failed');
    }
  };

  const confirmDelete = async () => {
    if (!deletingBanner) return;
    setIsDeleting(true);
    try {
      await bannersApi.delete(deletingBanner.id);
      toast.success(
        `Banner "${deletingBanner.title}" has been removed.`,
        'Banner Deleted',
      );
      setDeletingBanner(null);
      fetchBanners();
    } catch (err: any) {
      toast.error(err?.message, 'Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // Pagination Slice
  const paginatedBanners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return banners.slice(start, start + pageSize);
  }, [banners, currentPage, pageSize]);

  return (
    <ProtectedRoute permission="miniapp:read">
      <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl border border-brand-100 dark:border-brand-500/20 shadow-xs">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                SuperApp Banners
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage promotional hero banners, campaign announcements, and interactive launch shortcuts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Banners"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Banner</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search banners by title or description..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Audience Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Audiences</option>
              <option value="PUBLIC">Public</option>
              <option value="ALL_FSA_STAFF">FSA Staff Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700" />
          )
        ) : banners.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                No SuperApp Banners Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {searchTerm || audienceFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No banners match your active filters. Try clearing your search query.'
                  : 'Start promoting mini-apps, external services, or announcements by creating your first banner.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Banner</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginatedBanners.map((banner) => {
                  const overallIndex = banners.findIndex((b) => b.id === banner.id);
                  return (
                    <BannerCard
                      key={banner.id}
                      banner={banner}
                      isFirst={overallIndex === 0}
                      isLast={overallIndex === banners.length - 1}
                      onPreview={setPreviewBanner}
                      onEdit={handleOpenEdit}
                      onDelete={(b) => setDeletingBanner(b)}
                      onToggleActive={handleToggleActive}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  );
                })}
              </div>
            ) : (
              <BannerTable
                banners={paginatedBanners}
                allBanners={banners}
                onPreview={setPreviewBanner}
                onEdit={handleOpenEdit}
                onDelete={(b) => setDeletingBanner(b)}
                onToggleActive={handleToggleActive}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            )}

            {/* Pagination Controls */}
            {banners.length > 0 && (
              <div className="pt-2 flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalItems={banners.length}
                  pageSize={pageSize}
                  pageSizeOptions={viewMode === 'grid' ? [8, 12, 24, 48] : [10, 20, 50]}
                  showPageSizeSelector
                  showTotal
                  onPageChange={(page) => setCurrentPage(page)}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Create / Edit Modal */}
        <BannerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingBanner={editingBanner}
          onSuccess={fetchBanners}
        />

        {/* Banner Preview Modal */}
        <BannerPreviewModal
          isOpen={!!previewBanner}
          onClose={() => setPreviewBanner(null)}
          banner={previewBanner}
          allBanners={banners}
          onSelectBanner={(b) => setPreviewBanner(b)}
          onEdit={(b) => handleOpenEdit(b)}
        />

        {/* Delete Confirmation Modal */}
        {mounted && deletingBanner && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                setDeletingBanner(null);
              }
            }}
          >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-500/20 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Delete Banner?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete banner &ldquo;
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                  {deletingBanner.title}
                </strong>
                &rdquo;? Its hero image file and campaign configurations will also be removed.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingBanner(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Delete Banner</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProtectedRoute>
  );
}
