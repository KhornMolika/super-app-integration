'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Organization } from '@/api/organizations.api';
import { BuildingIcon, SearchIcon, CheckIcon, XIcon } from '@/components/ui/Icons';

export interface OrganizationSelectProps {
  value: string;
  onChange: (value: string) => void;
  organizations: Partial<Organization>[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export function OrganizationSelect({
  value,
  onChange,
  organizations,
  loading = false,
  disabled = false,
  error,
  id = 'organization-select',
}: OrganizationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected organization object
  const selectedOrg = useMemo(() => {
    if (!value) return null;
    return (
      organizations.find(
        (o) =>
          (o.name && o.name.toLowerCase() === value.toLowerCase()) ||
          (o.code && o.code.toLowerCase() === value.toLowerCase()) ||
          o.id === value
      ) || { name: value }
    );
  }, [value, organizations]);

  // Filter organizations by search query (matching code, name, or parentAuthority)
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase().trim();
    return organizations.filter((org) => {
      const codeMatch = org.code ? org.code.toLowerCase().includes(q) : false;
      const nameMatch = org.name ? org.name.toLowerCase().includes(q) : false;
      const parentMatch = org.parentAuthority ? org.parentAuthority.toLowerCase().includes(q) : false;
      return codeMatch || nameMatch || parentMatch;
    });
  }, [organizations, searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (org: Partial<Organization>) => {
    if (disabled) return;
    onChange(org.name || org.code || '');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full" id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between gap-2.5 transition-all duration-200 outline-none text-left cursor-pointer ${
          isOpen
            ? 'border-brand-500 ring-4 ring-brand-500/15 bg-slate-900 border'
            : error
            ? 'border-rose-500/80 ring-4 ring-rose-500/10 bg-slate-900/80 border text-rose-100'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80 border text-slate-300'
        } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
            <BuildingIcon className="w-3.5 h-3.5" />
          </div>

          {selectedOrg ? (
            <div className="flex items-center gap-2 min-w-0 truncate">
              {selectedOrg.code && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-300 border border-brand-500/30 shrink-0 uppercase tracking-wide">
                  {selectedOrg.code}
                </span>
              )}
              <span className="text-white font-medium truncate text-sm">
                {selectedOrg.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 truncate text-sm">
              {loading ? 'Loading regulators...' : 'Select regulator or organization'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOrg && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <XIcon className="w-3.5 h-3.5" />
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-brand-400' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Modern Clean Floating Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Search Filter Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <SearchIcon className="w-3.5 h-3.5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by acronym (e.g. FTC, TR) or name..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/70 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Authority Banner */}
          <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase text-slate-400">
            <span>Regulator / Authority</span>
            <span>{filteredOrganizations.length} Available</span>
          </div>

          {/* List of Options */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/40 overscroll-contain">
            {filteredOrganizations.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-slate-400 font-medium">
                  No regulator matches &quot;{searchQuery}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-brand-400 hover:underline font-semibold cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              filteredOrganizations.map((org) => {
                const isSelected =
                  selectedOrg &&
                  (selectedOrg.name === org.name || (org.code && selectedOrg.code === org.code));

                return (
                  <button
                    key={org.id || org.code || org.name}
                    type="button"
                    onClick={() => handleSelect(org)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors group cursor-pointer ${
                      isSelected
                        ? 'bg-brand-500/15 text-white'
                        : 'hover:bg-slate-800/70 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {org.code && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 transition-colors uppercase ${
                            isSelected
                              ? 'bg-brand-500/30 text-brand-200 border-brand-500/50'
                              : 'bg-slate-800/90 text-slate-300 border-slate-700 group-hover:border-slate-600 group-hover:text-white'
                          }`}
                        >
                          {org.code}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-semibold truncate transition-colors ${
                            isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {org.name}
                        </div>
                        {org.parentAuthority && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {org.parentAuthority}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                        <CheckIcon className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
