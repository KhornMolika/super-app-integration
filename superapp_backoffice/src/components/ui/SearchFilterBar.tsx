'use client';

import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';

export interface SearchFilterItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: CleanDropdownOption[];
  onChange: (value: string) => void;
  dropdownWidth?: string;
  align?: 'left' | 'right';
}

export interface SearchFilterBarProps {
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;
  filters?: SearchFilterItem[];
  isFiltered?: boolean;
  onResetFilters?: () => void;
  filteredCount?: number;
  totalCount?: number;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function SearchFilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  isSearching = false,
  filters = [],
  isFiltered = false,
  onResetFilters,
  filteredCount,
  totalCount,
  rightSlot,
  className = '',
}: SearchFilterBarProps) {
  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs ${className}`}
    >
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px]">
          {isSearching ? (
            <svg
              className="w-4 h-4 text-brand-500 animate-spin absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {(filters.length > 0 || (isFiltered && onResetFilters) || rightSlot) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {filters.map((filter) => (
            <CleanDropdown
              key={filter.id}
              label={filter.label}
              icon={filter.icon}
              value={filter.value}
              options={filter.options}
              onChange={filter.onChange}
              align={filter.align || 'right'}
              dropdownWidth={filter.dropdownWidth || 'w-56'}
            />
          ))}

          {isFiltered && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 h-10 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-200/70 dark:border-rose-900/50 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {isFiltered && filteredCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap px-1">
              ({filteredCount} of {totalCount})
            </span>
          )}

          {rightSlot}
        </div>
      )}
    </div>
  );
}

export default SearchFilterBar;
