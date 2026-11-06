'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { OrganizationAvatar } from './OrganizationAvatar';
import { SearchIcon, XIcon, CheckIcon, ShieldCheckIcon, BuildingIcon } from '@/components/ui/Icons';

export interface OrganizationSelectProps {
  organizations: Organization[];
  value?: string | null;
  onChange: (orgId: string | null, org?: Organization | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  name?: string;
  className?: string;
  excludeOrgId?: string;
  ariaLabel?: string;
}

export function OrganizationSelect({
  organizations = [],
  value,
  onChange,
  placeholder = 'Select an organization...',
  allowClear = true,
  clearLabel = 'None (Independent / No Parent)',
  disabled = false,
  error,
  id = 'organization-select',
  name,
  className = '',
  excludeOrgId,
  ariaLabel = 'Select organization',
}: OrganizationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find currently selected organization
  const selectedOrg = useMemo(() => {
    if (!value) return null;
    return organizations.find((org) => org.id === value) || null;
  }, [organizations, value]);

  // Filter organizations by search and excludeOrgId
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      if (excludeOrgId && org.id === excludeOrgId) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = org.name.toLowerCase().includes(q);
      const matchCode = org.code?.toLowerCase().includes(q);
      const matchParent =
        org.parent?.name?.toLowerCase().includes(q) ||
        org.parentAuthority?.toLowerCase().includes(q);

      return matchName || matchCode || matchParent;
    });
  }, [organizations, excludeOrgId, searchQuery]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalItems = allowClear ? filteredOrgs.length + 1 : filteredOrgs.length;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
        break;

      case 'Enter':
        e.preventDefault();
        if (allowClear && highlightedIndex === 0) {
          handleSelectNone();
        } else {
          const orgIndex = allowClear ? highlightedIndex - 1 : highlightedIndex;
          if (orgIndex >= 0 && orgIndex < filteredOrgs.length) {
            handleSelectOrg(filteredOrgs[orgIndex]);
          }
        }
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelectOrg = (org: Organization) => {
    onChange(org.id, org);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelectNone = () => {
    onChange(null, null);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {name && <input type="hidden" name={name} value={value || ''} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium text-left flex items-center justify-between gap-2.5 transition-all shadow-2xs ${
          error
            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
            : isOpen
            ? 'border-brand-500 dark:border-brand-400 bg-white dark:bg-slate-800 ring-2 ring-brand-500/20 text-slate-900 dark:text-slate-100'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-slate-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedOrg ? (
            <>
              <OrganizationAvatar
                name={selectedOrg.name}
                code={selectedOrg.code}
                logo={selectedOrg.logo}
                isRoot={isRootOrganization(selectedOrg)}
                size="xs"
              />
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {selectedOrg.name}
              </span>
              {selectedOrg.code && (
                <span className="shrink-0 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600">
                  {selectedOrg.code}
                </span>
              )}
              {isRootOrganization(selectedOrg) && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Root
                </span>
              )}
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 text-slate-400">
                <BuildingIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-400 dark:text-slate-400 font-normal truncate">
                {placeholder}
              </span>
            </>
          )}
        </div>

        {/* Action icons on right */}
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedOrg && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear selection"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </span>
          )}

          <div
            className={`transition-transform duration-200 text-slate-400 ${
              isOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-[9999] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Box Header */}
          <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, acronym, or code..."
                className="w-full h-9 pl-8.5 pr-7 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto px-1.5 py-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
          >
            {/* Clear / None Option */}
            {allowClear && !searchQuery.trim() && (
              <div
                role="option"
                aria-selected={!value}
                onClick={handleSelectNone}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  !value
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{clearLabel}</span>
                </div>
                {!value && <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 ml-2" />}
              </div>
            )}

            {/* Organization Options */}
            {filteredOrgs.length > 0 ? (
              filteredOrgs.map((org) => {
                const isSelected = value === org.id;
                const isRoot = isRootOrganization(org);
                const parentName = org.parent?.name || org.parentAuthority;

                return (
                  <div
                    key={org.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOrg(org)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <OrganizationAvatar
                        name={org.name}
                        code={org.code}
                        logo={org.logo}
                        isRoot={isRoot}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{org.name}</span>
                          {isRoot && (
                            <span className="shrink-0 px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Root
                            </span>
                          )}
                        </div>
                        {parentName && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate">
                            Under: {parentName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {org.code && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          {org.code}
                        </span>
                      )}
                      {isSelected && (
                        <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                <p className="font-semibold text-slate-600 dark:text-slate-400">No organizations found</p>
                <p className="text-[11px]">No results match "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
