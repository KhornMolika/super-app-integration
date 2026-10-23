'use client';

import React from 'react';
import { Button, Input } from '@/components/ui/inputs';

export type OrganizationStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface OrganizationFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: OrganizationStatusFilter;
  onStatusFilterChange: (filter: OrganizationStatusFilter) => void;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  onAddClick: () => void;
}

export function OrganizationFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  activeCount,
  inactiveCount,
  onAddClick,
}: OrganizationFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
      {/* 1. Status Filter Segmented Control */}
      <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-inner max-w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => onStatusFilterChange('ALL')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>All Entities</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              statusFilter === 'ALL'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('ACTIVE')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Active</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange('INACTIVE')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            statusFilter === 'INACTIVE'
              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Inactive</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {inactiveCount}
          </span>
        </button>
      </div>

      {/* 2. Search & Create Button Controls */}
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <div className="relative flex-1 lg:w-72">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search by name, code, or authority..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 text-xs pl-9 pr-8 w-full bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        <Button
          onClick={onAddClick}
          className="h-10 px-4 text-xs font-semibold shrink-0 gap-2 flex items-center rounded-xl shadow-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Organization</span>
        </Button>
      </div>
    </div>
  );
}
