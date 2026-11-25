'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CapabilityItem, permissionsApi } from '@/api/permissions.api';
import { toast } from '@/components/ui/Toast';
import { useCapabilityView } from '@/components/capabilities/capability-view';
import {
  Copy,
  Check,
  Package,
  Smartphone,
  ArrowRight,
  Search,
  X,
  Table as TableIcon,
  LayoutGrid,
  Shield,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { getCapabilityVisual } from '@/lib/capability-visuals';
import { CleanDropdown, CleanDropdownOption } from '@/components/ui/CleanDropdown';
import {
  IntegrationMethodOption,
  getCapabilityMethodSyntax,
} from '@/lib/capability-methods';
import { copyText } from '@/lib/clipboard';

interface CapabilitiesTabProps {
  capabilities: CapabilityItem[];
  loading?: boolean;
  onSyncGitLab?: () => void;
  isSyncingGitLab?: boolean;
  getPermissionIcon?: (key?: string) => React.ReactNode;
}

export function CapabilitiesTab({
  capabilities = [],
  loading = false,
  onSyncGitLab,
  isSyncingGitLab = false,
}: CapabilitiesTabProps) {
  const view = useCapabilityView();
  const canManageAllowlist = view.canEditCatalog;

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialSearch = searchParams?.get('q') || '';
  const initialCategory = searchParams?.get('category') || 'ALL';
  const initialMethod = (searchParams?.get('method') as IntegrationMethodOption) || 'ALL';
  const initialAllowlist = (searchParams?.get('allowlist') as 'ALL' | 'ALLOWED' | 'DISALLOWED') || 'ALL';
  const initialPage = Math.max(1, parseInt(searchParams?.get('page') || '1', 10));
  const initialLimit = Math.max(5, parseInt(searchParams?.get('limit') || '10', 10));
  const initialView = searchParams?.get('view') === 'grid' ? 'grid' : 'table';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedIntegrationMethod, setSelectedIntegrationMethod] =
    useState<IntegrationMethodOption>(initialMethod);
  const [allowlistFilter, setAllowlistFilter] = useState<'ALL' | 'ALLOWED' | 'DISALLOWED'>(initialAllowlist);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(initialView);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  // 300ms debounced search input -> searchQuery
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput);
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, searchQuery]);

  // Synchronize state with browser URL search params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    else params.delete('q');

    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    else params.delete('category');

    if (selectedIntegrationMethod !== 'ALL') params.set('method', selectedIntegrationMethod);
    else params.delete('method');

    if (allowlistFilter !== 'ALL') params.set('allowlist', allowlistFilter);
    else params.delete('allowlist');

    if (currentPage > 1) params.set('page', String(currentPage));
    else params.delete('page');

    if (pageSize !== 10) params.set('limit', String(pageSize));
    else params.delete('limit');

    if (viewMode !== 'table') params.set('view', viewMode);
    else params.delete('view');

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (window.location.pathname + window.location.search !== target && window.history?.replaceState) {
      window.history.replaceState(null, '', target);
    }
  }, [searchQuery, selectedCategory, selectedIntegrationMethod, allowlistFilter, currentPage, pageSize, viewMode, pathname]);

  // Handle popstate on browser Back/Forward
  useEffect(() => {
    const onPop = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || '';
      setSearchInput(q);
      setSearchQuery(q);
      setSelectedCategory(params.get('category') || 'ALL');
      setSelectedIntegrationMethod((params.get('method') as IntegrationMethodOption) || 'ALL');
      setAllowlistFilter((params.get('allowlist') as any) || 'ALL');
      setCurrentPage(Math.max(1, parseInt(params.get('page') || '1', 10)));
      setPageSize(Math.max(5, parseInt(params.get('limit') || '10', 10)));
      setViewMode(params.get('view') === 'grid' ? 'grid' : 'table');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [localCaps, setLocalCaps] = useState<CapabilityItem[]>(capabilities);
  useEffect(() => {
    setLocalCaps(capabilities);
  }, [capabilities]);

  const safeCapabilities = Array.isArray(localCaps) ? localCaps : [];

  const handleToggleAllowed = async (capId: string, currentAllowed: boolean) => {
    const next = !currentAllowed;
    setIsTogglingId(capId);
    setLocalCaps((prev) =>
      prev.map((c) => (c.id === capId ? { ...c, isAllowed: next } : c))
    );
    try {
      await permissionsApi.toggleAllowed(capId, next);
      toast.success(
        next
          ? 'Capability allowed for SuperApp MiniApp integrations.'
          : 'Capability disallowed (quarantined by host policy).'
      );
    } catch (err: any) {
      setLocalCaps((prev) =>
        prev.map((c) => (c.id === capId ? { ...c, isAllowed: currentAllowed } : c))
      );
      toast.error(err?.message || 'Failed to update capability allowlist policy.');
    } finally {
      setIsTogglingId(null);
    }
  };

  const allowedCount = useMemo(
    () => safeCapabilities.filter((c) => c.isAllowed !== false).length,
    [safeCapabilities]
  );
  const disallowedCount = safeCapabilities.length - allowedCount;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    safeCapabilities.forEach((cap) => {
      const visual = getCapabilityVisual(cap.key, cap.name, cap.description);
      if (visual.category) set.add(visual.category);
    });
    return Array.from(set).sort();
  }, [safeCapabilities]);

  const categoryOptions: CleanDropdownOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Categories' },
      ...categories.map((c) => ({ value: c, label: c })),
    ];
  }, [categories]);

  const integrationMethodOptions: CleanDropdownOption[] = [
    { value: 'ALL', label: 'All Methods' },
    { value: 'WEBVIEW', label: 'WebView (JS SDK)' },
    { value: 'FLUTTER_PACKAGE', label: 'Flutter Package (Dart)' },
    { value: 'NATIVE_SDK', label: 'Native SDK (iOS/Android)' },
    { value: 'DEEP_LINK', label: 'Deep Link (URI Protocol)' },
  ];

  // Filter capabilities by search, category, integration method, and allowlist
  const filteredCapabilities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return safeCapabilities.filter((cap) => {
      const visual = getCapabilityVisual(cap.key, cap.name, cap.description);

      if (selectedCategory !== 'ALL' && visual.category !== selectedCategory) {
        return false;
      }

      if (allowlistFilter === 'ALLOWED' && cap.isAllowed === false) {
        return false;
      }

      if (allowlistFilter === 'DISALLOWED' && cap.isAllowed !== false) {
        return false;
      }

      const methodSyntax = getCapabilityMethodSyntax(
        cap.key,
        selectedIntegrationMethod,
        cap.jsBridgeMethod,
        (cap as any).metadata,
        cap.category
      );

      if (q) {
        const matchesName = cap.name?.toLowerCase().includes(q);
        const matchesKey = cap.key?.toLowerCase().includes(q);
        const matchesDesc = cap.description?.toLowerCase().includes(q);
        const matchesMethod = cap.jsBridgeMethod?.toLowerCase().includes(q);
        const matchesPkg = cap.providerPackage?.toLowerCase().includes(q);
        const matchesConcise = methodSyntax.concise.toLowerCase().includes(q);
        const matchesFull = methodSyntax.full.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesKey ||
          matchesDesc ||
          matchesMethod ||
          matchesPkg ||
          matchesConcise ||
          matchesFull
        );
      }

      return true;
    });
  }, [safeCapabilities, searchQuery, selectedCategory, selectedIntegrationMethod, allowlistFilter]);

  // Pagination calculation
  const totalItems = filteredCapabilities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCapabilities.slice(start, start + pageSize);
  }, [filteredCapabilities, safePage, pageSize]);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    copyText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedIntegrationMethod('ALL');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card
            key={i}
            className="p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/3" />
              </div>
            </div>
            <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
            <div className="h-8 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (safeCapabilities.length === 0) {
    return (
      <Card className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <Smartphone className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No active capabilities found in registry
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Synchronize host shell capabilities directly from GitLab repository to populate the directory.
          </p>
        </div>
        {onSyncGitLab && (
          <button
            type="button"
            onClick={onSyncGitLab}
            disabled={isSyncingGitLab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors cursor-pointer"
          >
            {isSyncingGitLab ? 'Syncing...' : 'Sync from GitLab'}
          </button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* SuperAdmin Host Allowlist Status & Scope Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                SuperApp Host Capability Whitelist
              </h4>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                {allowedCount} of {safeCapabilities.length} Allowed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Decide which device and bridge capabilities MiniApps are authorized to declare during security validation.
            </p>
          </div>
        </div>

        {/* Allowlist Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAllowlistFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              allowlistFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All ({safeCapabilities.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setAllowlistFilter('ALLOWED');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              allowlistFilter === 'ALLOWED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>Allowed ({allowedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAllowlistFilter('DISALLOWED');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              allowlistFilter === 'DISALLOWED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <X className="w-3 h-3" />
            <span>Disallowed ({disallowedCount})</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & View Toggle Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, key, or method (e.g. .postMessage, .takePhoto)..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & View Mode Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Category Dropdown */}
          <CleanDropdown
            label="Category"
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
            options={categoryOptions}
            buttonClassName="py-1.5 text-xs rounded-xl"
            dropdownWidth="w-52"
          />

          {/* Integration Method Dropdown */}
          <CleanDropdown
            label="Method"
            value={selectedIntegrationMethod}
            onChange={(val) => {
              setSelectedIntegrationMethod(val as IntegrationMethodOption);
              setCurrentPage(1);
            }}
            options={integrationMethodOptions}
            buttonClassName="py-1.5 text-xs rounded-xl"
            dropdownWidth="w-56"
          />

          {/* View Toggle: Table / Grid */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('table');
                setPageSize(10);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('grid');
                setPageSize(6);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Capabilities Content */}
      {paginatedItems.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No capabilities match your filters &ldquo;{searchQuery || selectedCategory !== 'ALL' ? selectedCategory : selectedIntegrationMethod}&rdquo;.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
          >
            Clear Filters
          </button>
        </Card>
      ) : viewMode === 'table' ? (
        /* Clean Enterprise Table View */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-5">Capability</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Integration Method Call</th>
                  <th className="py-3 px-4">Provider Package</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4">Host Allowlist</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedItems.map((cap) => {
                  const visual = getCapabilityVisual(cap.key, cap.name, cap.description);
                  const Icon = visual.Icon;
                  const detailHref = `/capabilities/${cap.id || cap.key}`;
                  const methodSyntax = getCapabilityMethodSyntax(
                    cap.key,
                    selectedIntegrationMethod,
                    cap.jsBridgeMethod,
                    (cap as any).metadata,
                    cap.category
                  );
                  const isActive = cap.status === 'Active' || (cap as any).isActive !== false;

                  return (
                    <tr
                      key={cap.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Capability Name & Key (no description underneath) */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${visual.bgColor} ${visual.borderColor} border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
                          >
                            <Icon className={`w-4 h-4 ${visual.iconColor}`} />
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              href={detailHref}
                              className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate"
                            >
                              {cap.name}
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, cap.key || '', `key-${cap.id}`)}
                              className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title="Click to copy key"
                            >
                              <span>#{cap.key}</span>
                              {copiedKey === `key-${cap.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-60" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${visual.pillBgColor} ${visual.badgeTextColor} border ${visual.borderColor}`}
                        >
                          {visual.category}
                        </span>
                      </td>

                      {/* Method Call */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 transition-colors">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${methodSyntax.badgeColor.bg} ${methodSyntax.badgeColor.text} ${methodSyntax.badgeColor.border}`}
                          >
                            {methodSyntax.badgeLabel}
                          </span>
                          <code
                            className="font-mono text-xs font-bold text-accent-600 dark:text-accent-400 truncate max-w-[140px] sm:max-w-[200px]"
                            title={methodSyntax.full}
                          >
                            {methodSyntax.concise}
                          </code>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, methodSyntax.full, `method-${cap.id}`)}
                            className="p-1 text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 shrink-0 transition-colors cursor-pointer"
                            title={`Copy invocation (${methodSyntax.full})`}
                          >
                            {copiedKey === `method-${cap.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Provider Package */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cap.providerPackage ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs border border-slate-200/60 dark:border-slate-700/60">
                            <Package className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{cap.providerPackage}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Status & Platform */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            />
                            <span>{isActive ? 'Active' : 'Deprecated'}</span>
                          </span>
                          <div className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>{cap.platform || 'Cross-Platform'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Host Allowlist Policy Toggle Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {canManageAllowlist && (
                            <button
                              type="button"
                              disabled={isTogglingId === cap.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAllowed(cap.id, cap.isAllowed !== false);
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                                cap.isAllowed !== false
                                  ? 'bg-emerald-600 dark:bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              } ${isTogglingId === cap.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={`Click to ${cap.isAllowed !== false ? 'disallow' : 'allow'} this capability for MiniApps`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  cap.isAllowed !== false ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                              cap.isAllowed !== false
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {cap.isAllowed !== false ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Allowed</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span>Disallowed</span>
                              </>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={detailHref}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group-hover:border-brand-500/30"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Alternative Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((cap) => {
            const visual = getCapabilityVisual(cap.key, cap.name, cap.description);
            const Icon = visual.Icon;
            const detailHref = `/capabilities/${cap.id || cap.key}`;
            const methodSyntax = getCapabilityMethodSyntax(
              cap.key,
              selectedIntegrationMethod,
              cap.jsBridgeMethod,
              (cap as any).metadata,
              cap.category
            );

            return (
              <Card
                key={cap.id}
                className="p-5 flex flex-col justify-between hover:border-brand-500/40 dark:hover:border-brand-500/40 hover:shadow-md transition-all group bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl"
              >
                <div className="space-y-3">
                  {/* Header: Icon, Name, Category, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl ${visual.bgColor} ${visual.borderColor} border shrink-0 transition-transform group-hover:scale-105`}
                      >
                        <Icon className={`w-4 h-4 ${visual.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={detailHref}
                          className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate block hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                          {cap.name}
                        </Link>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                            {cap.key}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className={`text-xs font-semibold ${visual.badgeTextColor}`}>
                            {visual.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        cap.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                      }`}
                    >
                      {cap.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {cap.description}
                  </p>

                  {/* Technical Code Snippet Box */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-brand-500/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${methodSyntax.badgeColor.bg} ${methodSyntax.badgeColor.text} ${methodSyntax.badgeColor.border}`}
                        >
                          {methodSyntax.badgeLabel}
                        </span>
                        <div className="flex items-baseline gap-1.5 min-w-0 truncate">
                          <code
                            className="font-mono text-xs font-bold text-accent-600 dark:text-accent-400 truncate"
                            title={methodSyntax.full}
                          >
                            {methodSyntax.concise}
                          </code>
                          <span
                            className="text-xs font-mono text-slate-400 truncate hidden xl:inline"
                            title={methodSyntax.full}
                          >
                            {methodSyntax.full}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, methodSyntax.full, `method-${cap.id}`)}
                        className="p-1 text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 shrink-0 transition-colors cursor-pointer"
                        title={`Copy ${methodSyntax.badgeLabel} Method (${methodSyntax.full})`}
                      >
                        {copiedKey === `method-${cap.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Badges Row: Provider Package & Permissions */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {cap.providerPackage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs">
                          <Package className="w-3 h-3 text-slate-400" />
                          {cap.providerPackage}
                        </span>
                      )}

                      {cap.requiredPermissions?.map((perm) => (
                        <span
                          key={perm}
                          className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer with Allowlist Toggle & View Details Link */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {canManageAllowlist && (
                      <button
                        type="button"
                        disabled={isTogglingId === cap.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAllowed(cap.id, cap.isAllowed !== false);
                        }}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          cap.isAllowed !== false
                            ? 'bg-emerald-600 dark:bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-700'
                        } ${isTogglingId === cap.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={`Click to ${cap.isAllowed !== false ? 'disallow' : 'allow'} this capability`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            cap.isAllowed !== false ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                        cap.isAllowed !== false
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {cap.isAllowed !== false ? 'Allowed' : 'Disallowed'}
                    </span>
                  </div>

                  <Link
                    href={detailHref}
                    className="inline-flex items-center gap-1 font-semibold text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
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
            pageSizeOptions={viewMode === 'table' ? [5, 10, 20, 50] : [3, 6, 9, 12]}
            showTotal={true}
          />
        </div>
      )}
    </div>
  );
}
