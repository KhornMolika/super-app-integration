'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input, Button } from '@/components/ui/inputs';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';
import { Pagination, PaginationProps } from '@/components/ui/Pagination';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
  sortable?: boolean;
  defaultSort?: boolean;
  sortKey?: string;
  sortValue?: (item: T) => string | number | boolean | Date | null | undefined;
  sortComparator?: (a: T, b: T, direction: SortDirection) => number;
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

  // Sorting
  enableSorting?: boolean;
  defaultSortKey?: string | null;
  defaultSortDirection?: SortDirection;
  sortBy?: string;
  sortDirection?: SortDirection;
  onSortChange?: (sortKey: string, direction: SortDirection) => void;
  manualSorting?: boolean;
  allowSortReset?: boolean;
}

function getSortValue<T>(item: T, col: DataTableColumn<T>): any {
  if (!item) return '';

  if (col.sortValue) {
    try {
      return col.sortValue(item);
    } catch {
      return '';
    }
  }

  if (typeof item === 'object') {
    const obj = item as any;
    const lookupKey = col.sortKey || col.key;

    // Direct property lookup
    if (obj[lookupKey] !== undefined && obj[lookupKey] !== null) {
      return obj[lookupKey];
    }

    // Common smart lookups for backoffice models
    if (lookupKey === 'profile') {
      return obj.name || obj.email || '';
    }
    if (lookupKey === 'app' || lookupKey === 'miniApp') {
      return obj.name || obj.title || obj.slug || '';
    }
    if (lookupKey === 'timestamp') {
      return obj.createdAt || obj.timestamp || obj.updatedAt || '';
    }
    if (lookupKey === 'actor') {
      return obj.actorName || obj.actorEmail || '';
    }
    if (lookupKey === 'organization') {
      return obj.organization?.name || obj.orgName || '';
    }
    if (lookupKey === 'roles') {
      if (Array.isArray(obj.roles)) {
        return obj.roles.map((r: any) => r?.name || r).join(', ');
      }
      return obj.role?.name || obj.roleName || '';
    }
    if (lookupKey === 'version') {
      return obj.version || obj.currentReleaseVersion || '';
    }
    if (lookupKey === 'parentAuthority') {
      return obj.parentAuthority || '';
    }
    if (lookupKey === 'capabilities') {
      return Array.isArray(obj.capabilities)
        ? obj.capabilities.length
        : Array.isArray(obj.permissions)
        ? obj.permissions.length
        : 0;
    }
  }

  return '';
}

function compareSortValues(valA: any, valB: any, direction: SortDirection): number {
  if (valA === valB) return 0;
  // Always sort nullish / empty values to the bottom regardless of direction
  if (valA === null || valA === undefined || valA === '') return 1;
  if (valB === null || valB === undefined || valB === '') return -1;

  let result = 0;

  if (typeof valA === 'number' && typeof valB === 'number') {
    result = valA - valB;
  } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
    result = valA === valB ? 0 : valA ? 1 : -1;
  } else if (valA instanceof Date && valB instanceof Date) {
    result = valA.getTime() - valB.getTime();
  } else {
    const strA = String(valA);
    const strB = String(valB);

    // If both look like ISO dates or parseable timestamps
    const dateA = Date.parse(strA);
    const dateB = Date.parse(strB);
    if (!isNaN(dateA) && !isNaN(dateB) && (strA.includes('-') || strA.includes('/'))) {
      result = dateA - dateB;
    } else {
      result = strA.localeCompare(strB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }
  }

  return direction === 'asc' ? result : -result;
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
  enableSorting = true,
  defaultSortKey,
  defaultSortDirection = 'asc',
  sortBy: controlledSortBy,
  sortDirection: controlledSortDirection,
  onSortChange,
  manualSorting = false,
  allowSortReset = true,
}: DataTableProps<T>) {
  const showToolbar = onSearchChange !== undefined || filters.length > 0 || actions !== undefined;
  const totalCount = totalItemsCount ?? data.length;
  const filteredCount = paginationProps?.totalItems ?? data.length;

  // Sorting State: Controlled vs Uncontrolled
  const isControlled = controlledSortBy !== undefined;
  const initialSortKey =
    defaultSortKey !== undefined
      ? defaultSortKey
      : (columns.find((c) => c.defaultSort)?.key ?? null);

  const [internalSortKey, setInternalSortKey] = useState<string | null>(initialSortKey);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(
    defaultSortDirection || 'asc'
  );

  const activeSortKey = isControlled ? controlledSortBy : internalSortKey;
  const activeSortDirection =
    (isControlled ? controlledSortDirection : internalSortDirection) || defaultSortDirection || 'asc';

  const handleSort = (colKey: string) => {
    if (!enableSorting) return;
    const col = columns.find((c) => c.key === colKey);
    if (!col) return;

    const isSortable =
      col.sortable !== undefined
        ? col.sortable
        : col.key !== 'actions' && col.key !== 'action' && col.key !== 'selection';
    if (!isSortable) return;

    let nextKey: string | null = colKey;
    let nextDirection: SortDirection = defaultSortDirection || 'asc';

    if (activeSortKey === colKey) {
      if (activeSortDirection === 'asc') {
        nextDirection = 'desc';
      } else if (activeSortDirection === 'desc') {
        if (allowSortReset) {
          nextKey = null;
          nextDirection = defaultSortDirection || 'asc';
        } else {
          nextDirection = 'asc';
        }
      }
    } else {
      // New column clicked: default is Ascending order!
      nextDirection = defaultSortDirection || 'asc';
      nextKey = colKey;
    }

    if (!isControlled) {
      setInternalSortKey(nextKey);
      setInternalSortDirection(nextDirection);
    }

    if (onSortChange && nextKey) {
      onSortChange(nextKey, nextDirection);
    }
  };

  // Memoized Sorted Data
  const sortedData = useMemo(() => {
    if (!enableSorting || manualSorting || !activeSortKey) {
      return data;
    }

    const activeCol = columns.find((c) => c.key === activeSortKey);
    if (!activeCol) return data;

    const copy = [...data];
    return copy.sort((a, b) => {
      if (activeCol.sortComparator) {
        return activeCol.sortComparator(a, b, activeSortDirection);
      }
      const valA = getSortValue(a, activeCol);
      const valB = getSortValue(b, activeCol);
      return compareSortValues(valA, valB, activeSortDirection);
    });
  }, [data, activeSortKey, activeSortDirection, enableSorting, manualSorting, columns]);

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
                {columns.map((col) => {
                  const isSortable =
                    enableSorting &&
                    (col.sortable !== undefined
                      ? col.sortable
                      : col.key !== 'actions' && col.key !== 'action' && col.key !== 'selection');

                  const isSorted = activeSortKey === col.key;
                  const ariaSort = isSorted
                    ? activeSortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : isSortable
                    ? 'none'
                    : undefined;

                  const sortTooltip = isSortable
                    ? !isSorted
                      ? 'Click to sort in Ascending order'
                      : activeSortDirection === 'asc'
                      ? 'Sorted Ascending. Click to sort Descending'
                      : 'Sorted Descending. Click to clear sort'
                    : undefined;

                  const isRightAligned =
                    col.headerClassName?.includes('text-right') || col.className?.includes('text-right');
                  const isCenterAligned =
                    col.headerClassName?.includes('text-center') || col.className?.includes('text-center');

                  return (
                    <th
                      key={col.key}
                      aria-sort={ariaSort}
                      className={`px-6 py-4 ${col.width ? col.width : ''} ${col.headerClassName || ''}`}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          title={sortTooltip}
                          className={`group/sort inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer select-none -m-1 p-1 rounded-md hover:text-slate-900 dark:hover:text-slate-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                            isRightAligned
                              ? 'w-full justify-end'
                              : isCenterAligned
                              ? 'w-full justify-center'
                              : ''
                          } ${
                            isSorted
                              ? 'text-brand-600 dark:text-brand-400 font-bold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span>{col.header}</span>
                          <span className="inline-flex items-center shrink-0">
                            {isSorted ? (
                              activeSortDirection === 'asc' ? (
                                <svg
                                  className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 transition-transform duration-150"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 transition-transform duration-150"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              )
                            ) : (
                              <svg
                                className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover/sort:text-slate-500 dark:group-hover/sort:text-slate-400 opacity-60 group-hover/sort:opacity-100 transition-all duration-150"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                                />
                              </svg>
                            )}
                          </span>
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
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
              ) : sortedData.length === 0 ? (
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
                sortedData.map((item, index) => {
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
        {paginationProps && !loading && sortedData.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Pagination {...paginationProps} />
          </div>
        )}
      </Card>
    </div>
  );
}

export default DataTable;
