'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input, Button } from '@/components/ui/inputs';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';
import { Pagination, PaginationProps } from '@/components/ui/Pagination';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
}

export interface DataTableFilter {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: CleanDropdownOption[];
  onChange: (value: string) => void;
  dropdownWidth?: string;
  align?: 'left' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  loadingMessage?: string;
  // Search
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  // Filters
  filters?: DataTableFilter[];
  onResetFilters?: () => void;
  isFiltered?: boolean;
  totalItemsCount?: number;
  // Empty State
  emptyMessage?: string;
  emptySubMessage?: string;
  emptyAction?: React.ReactNode;
  // Pagination
  paginationProps?: PaginationProps;
  // Custom toolbar actions (e.g. Create button)
  actions?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  onRowClick?: (item: T, index: number) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  loadingMessage = 'Loading records...',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  onResetFilters,
  isFiltered = false,
  totalItemsCount,
  emptyMessage = 'No records match your criteria',
  emptySubMessage = 'Try adjusting your search query or active filters',
  emptyAction,
  paginationProps,
  actions,
  className = '',
  tableClassName = '',
  rowClassName = '',
  onRowClick,
}: DataTableProps<T>) {
  const showToolbar = onSearchChange !== undefined || filters.length > 0 || actions !== undefined;
  const totalCount = totalItemsCount ?? data.length;
  const filteredCount = paginationProps?.totalItems ?? data.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Universal Clean Filter & Search Toolbar */}
      {showToolbar && (
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Search Input */}
          {onSearchChange && (
            <div className="relative w-full lg:w-80">
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-8 h-10 text-sm w-full"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Filters, Counter & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Clean Dropdown Filters */}
            {filters.map((filter) => (
              <CleanDropdown
                key={filter.id}
                label={filter.label}
                icon={filter.icon}
                value={filter.value}
                options={filter.options}
                onChange={filter.onChange}
                align={filter.align || 'left'}
                dropdownWidth={filter.dropdownWidth || 'w-64'}
              />
            ))}

            {/* Reset Filters Button */}
            {isFiltered && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-200/60 dark:border-rose-900/40 cursor-pointer"
                title="Reset all filters"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset</span>
              </button>
            )}

            {/* Results Count Badge */}
            {isFiltered && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                ({filteredCount} of {totalCount})
              </span>
            )}

            {/* Custom Action buttons (e.g., Create button) */}
            {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}

      {/* 2. Structured Data Table Surface */}
      <Card className="!p-0 overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <div className="overflow-x-auto min-h-[320px]">
          <table className={`w-full text-left border-collapse ${tableClassName}`}>
            {/* Header */}
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-4 ${col.width ? col.width : ''} ${col.headerClassName || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                // Shimmer Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    {columns.map((col, cIdx) => (
                      <td key={`col-${cIdx}`} className="px-6 py-4">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Clean Empty State
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 shadow-2xs">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{emptyMessage}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{emptySubMessage}</span>
                      {isFiltered && onResetFilters && (
                        <Button
                          variant="secondary"
                          onClick={onResetFilters}
                          className="mt-2 text-xs"
                        >
                          Clear all filters
                        </Button>
                      )}
                      {emptyAction && <div className="mt-2">{emptyAction}</div>}
                    </div>
                  </td>
                </tr>
              ) : (
                // Real Data Rows
                data.map((item, index) => {
                  const key = keyExtractor(item, index);
                  const dynamicRowClass =
                    typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;

                  return (
                    <tr
                      key={key}
                      onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${onRowClick ? 'cursor-pointer ' : ''}${dynamicRowClass}`}
                    >
                      {columns.map((col) => (
                        <td key={`${key}-${col.key}`} className={`px-6 py-4 ${col.className || ''}`}>
                          {col.cell(item, index)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Integrated Pagination Footer */}
        {paginationProps && !loading && data.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Pagination {...paginationProps} />
          </div>
        )}
      </Card>
    </div>
  );
}

export default DataTable;
