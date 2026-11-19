'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useToast } from '@/components/ui/Toast';
import { bannersApi } from '@/api';
import type { SuperAppBanner, BannerAudience } from '@/types/banner.types';
import { BannerCard } from '@/components/banners/BannerCard';
import { BannerModal } from '@/components/banners/BannerModal';

export default function BannersPage() {
  const { toast } = useToast();

  const [banners, setBanners] = useState<SuperAppBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SuperAppBanner | null>(
    null,
  );

  // Delete Confirmation State
  const [deletingBanner, setDeletingBanner] = useState<SuperAppBanner | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

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
      setBanners(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Could not connect to backend service.', 'Failed to load banners');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, audienceFilter, statusFilter, toast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

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

  return (
    <ProtectedRoute permission="miniapp:read">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                SuperApp Banners
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage promotional hero banners, campaign announcements, and
              interactive launch shortcuts for mobile SuperApp users.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
              title="Refresh Banners"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Banner</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search banners by title or description..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Audience Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse border border-gray-200 dark:border-gray-700"
              />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                No SuperApp Banners Found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {searchTerm || audienceFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No banners match your active filters. Try clearing your search query.'
                  : 'Start promoting mini-apps, external services, or announcements by creating your first banner.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Banner</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map((banner, index) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                isFirst={index === 0}
                isLast={index === banners.length - 1}
                onEdit={handleOpenEdit}
                onDelete={(b) => setDeletingBanner(b)}
                onToggleActive={handleToggleActive}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        <BannerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingBanner={editingBanner}
          onSuccess={fetchBanners}
        />

        {/* Delete Confirmation Modal */}
        {deletingBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Delete Banner?
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Are you sure you want to permanently delete banner &ldquo;
                <strong className="text-gray-700 dark:text-gray-200">
                  {deletingBanner.title}
                </strong>
                &rdquo;? Its hero image file will also be deleted from storage.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingBanner(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow transition-colors disabled:opacity-50"
                >
                  {isDeleting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Delete Banner</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
