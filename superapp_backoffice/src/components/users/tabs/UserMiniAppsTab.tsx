'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MiniApp } from '@/api/miniapps.api';
import { AppLogoAvatar } from '@/components/ui/AppLogoAvatar';
import { ArrowRightIcon } from '@/components/ui/Icons';
import { Pagination } from '@/components/ui/Pagination';

export interface UserMiniAppsTabProps {
  miniApps: MiniApp[];
  loading: boolean;
  userName: string;
}

export function UserMiniAppsTab({
  miniApps,
  loading,
  userName,
}: UserMiniAppsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Filter mini-apps by search term
  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return miniApps;
    return miniApps.filter(
      (app) =>
        app.name?.toLowerCase().includes(q) ||
        app.appId?.toLowerCase().includes(q) ||
        app.tagline?.toLowerCase().includes(q) ||
        app.description?.toLowerCase().includes(q)
    );
  }, [miniApps, searchQuery]);

  // Paginated slice
  const totalItems = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedApps = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredApps.slice(startIndex, startIndex + pageSize);
  }, [filteredApps, safePage, pageSize]);

  // Reset to page 1 on search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/3" />
              </div>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (miniApps.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3.5">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No MiniApps Owned
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
          {userName} currently has no registered mini-applications associated with their account. MiniApps created or assigned to this operator will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Associated Applications</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
              {miniApps.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mini-applications owned, authored, or linked via organization tenancy.
          </p>
        </div>

        {/* Search input if more than 1 app */}
        {miniApps.length > 1 && (
          <div className="relative w-full sm:w-64">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Filter mini-apps..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Mini-Apps */}
      {paginatedApps.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No mini-apps match your search &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-2"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedApps.map((app) => {
            const isLive = app.status === 'ACTIVE' || app.status === 'Published';
            const isInReview =
              app.status === 'IN_REVIEW' ||
              app.status === 'PROCESSING' ||
              app.status === 'SUBMITTED';

            return (
              <div
                key={app.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top: Avatar & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AppLogoAvatar logo={app.logo} name={app.name} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {app.name}
                        </h4>
                        {app.appId && (
                          <span className="font-mono text-[11px] text-slate-400 block truncate">
                            {app.appId}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        isLive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          : isInReview
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {app.status || 'DRAFT'}
                    </span>
                  </div>

                  {/* Description or tagline */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {app.tagline ||
                      app.shortDescription ||
                      app.description ||
                      'No description provided.'}
                  </p>

                  {/* Badges: Version & Integration */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      v{app.version || app.currentReleaseVersion || '0.1.0'}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {app.integrationMethod || 'WEBVIEW'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Link */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {app.updatedAt
                      ? `Updated ${new Date(app.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}`
                      : 'Draft'}
                  </span>
                  <Link
                    href={`/miniapps/${app.id}`}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View App</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            showPageSizeSelector={true}
            pageSizeOptions={[2, 4, 6, 12]}
            showTotal={true}
          />
        </div>
      )}
    </div>
  );
}
