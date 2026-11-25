'use client';

import React from 'react';
import { Button } from '@/components/ui/inputs';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';

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
  isSearching?: boolean;
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
  isSearching = false,
}: OrganizationFilterBarProps) {
  return (
    <SearchFilterBar
      searchValue={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by name, code, or authority..."
      isSearching={isSearching}
      filters={[
        {
          id: 'status',
          label: 'Status',
          value: statusFilter,
          onChange: (val) => onStatusFilterChange(val as OrganizationStatusFilter),
          options: [
            { value: 'ALL', label: `All Entities (${totalCount})` },
            { value: 'ACTIVE', label: `Active (${activeCount})` },
            { value: 'INACTIVE', label: `Inactive (${inactiveCount})` },
          ],
          dropdownWidth: 'w-52',
          align: 'right',
        },
      ]}
      isFiltered={searchQuery.trim() !== '' || statusFilter !== 'ALL'}
      onResetFilters={() => {
        onSearchChange('');
        onStatusFilterChange('ALL');
      }}
      rightSlot={
        <Button
          onClick={onAddClick}
          className="h-10 px-4 text-xs font-semibold shrink-0 gap-2 flex items-center rounded-xl shadow-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Organization</span>
        </Button>
      }
    />
  );
}
