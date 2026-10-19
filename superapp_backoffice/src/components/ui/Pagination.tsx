'use client';

import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from 'lucide-react';

export interface PaginationProps {
  /** The current active page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages?: number;
  /** Total number of items (used for calculating total pages and showing "Showing x-y of z") */
  totalItems?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback fired when page changes */
  onPageChange: (page: number) => void;
  /** Callback fired when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Show the page size selector dropdown */
  showPageSizeSelector?: boolean;
  /** Show the item counter text (e.g. "Showing 1-10 of 45") */
  showTotal?: boolean;
  /** Number of sibling pages to show on each side of the active page (default: 1) */
  siblingCount?: number;
  /** Additional custom class names */
  className?: string;
  /** Disable all pagination controls */
  disabled?: boolean;
  /** Compact mode (Previous / Page X of Y / Next) */
  compact?: boolean;
}

export function Pagination({
  currentPage,
  totalPages: customTotalPages,
  totalItems,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = false,
  showTotal = true,
  siblingCount = 1,
  className = '',
  disabled = false,
  compact = false,
}: PaginationProps) {
  // Compute total pages if not explicitly provided
  const computedTotalPages = useMemo(() => {
    if (customTotalPages !== undefined) return Math.max(1, customTotalPages);
    if (totalItems !== undefined && pageSize > 0) {
      return Math.max(1, Math.ceil(totalItems / pageSize));
    }
    return 1;
  }, [customTotalPages, totalItems, pageSize]);

  const totalPages = computedTotalPages;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Compute item range for "Showing x-y of z"
  const itemRange = useMemo(() => {
    if (totalItems === undefined) return null;
    if (totalItems === 0) return { start: 0, end: 0, total: 0 };
    const start = (safeCurrentPage - 1) * pageSize + 1;
    const end = Math.min(safeCurrentPage * pageSize, totalItems);
    return { start, end, total: totalItems };
  }, [totalItems, safeCurrentPage, pageSize]);

  // Generate page numbers array with ellipses
  const pageNumbers = useMemo(() => {
    if (compact) return [];

    const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
    const totalBlocks = totalNumbers + 2; // + 2 ellipses

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(safeCurrentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(safeCurrentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1,
      );
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i,
      );
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages, safeCurrentPage, siblingCount, compact]);

  const canGoPrevious = safeCurrentPage > 1 && !disabled;
  const canGoNext = safeCurrentPage < totalPages && !disabled;

  const handleSelectPage = (page: number) => {
    if (disabled || page === safeCurrentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 select-none py-2 ${className}`}
    >
      {/* Left: Total Items Summary & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        {showTotal && itemRange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Showing</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-semibold font-mono text-[11px] border border-slate-200/60 dark:border-slate-700/60">
              {itemRange.start}–{itemRange.end}
            </span>
            <span>of</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {itemRange.total}
            </span>
            <span>items</span>
          </div>
        )}

        {/* Subtle Divider */}
        {showTotal && itemRange && showPageSizeSelector && onPageSizeChange && (
          <span className="hidden sm:inline-block h-3.5 w-px bg-slate-200 dark:bg-slate-700/80" />
        )}

        {/* Page Size Selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Rows:</span>
            <div className="relative inline-flex items-center">
              <select
                value={pageSize}
                disabled={disabled}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 rounded-lg pl-2.5 pr-7 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1 self-center sm:self-auto">
        {/* First Page */}
        {!compact && totalPages > 5 && (
          <button
            type="button"
            onClick={() => handleSelectPage(1)}
            disabled={!canGoPrevious}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handleSelectPage(safeCurrentPage - 1)}
          disabled={!canGoPrevious}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Compact Mode indicator */}
        {compact ? (
          <span className="px-3 py-1 font-medium text-slate-600 dark:text-slate-400">
            Page {safeCurrentPage} of {totalPages}
          </span>
        ) : (
          /* Page Numbers */
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 py-1 text-slate-400 dark:text-slate-600 font-mono"
                  >
                    …
                  </span>
                );
              }

              const pageNum = Number(page);
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handleSelectPage(pageNum)}
                  disabled={disabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-w-[28px] h-7 px-2 rounded-lg font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handleSelectPage(safeCurrentPage + 1)}
          disabled={!canGoNext}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        {!compact && totalPages > 5 && (
          <button
            type="button"
            onClick={() => handleSelectPage(totalPages)}
            disabled={!canGoNext}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
}

/**
 * Convenient React Hook for client-side pagination of any array.
 *
 * Example:
 * ```tsx
 * const { paginatedItems, paginationProps } = usePagination(allItems, 10);
 *
 * return (
 *   <div>
 *     {paginatedItems.map(item => <ItemCard key={item.id} item={item} />)}
 *     <Pagination {...paginationProps} />
 *   </div>
 * );
 * ```
 */
export function usePagination<T>(items: T[] = [], initialPageSize: number = 10) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // Total count
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If current page is beyond total pages (e.g. after filter change), reset to 1
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Slice items for current page
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems,
    paginationProps: {
      currentPage,
      totalPages,
      totalItems,
      pageSize,
      onPageChange: setCurrentPage,
      onPageSizeChange: (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
      },
      showPageSizeSelector: true,
      showTotal: true,
    },
  };
}

export default Pagination;
