'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';
import { organizationsApi, Organization } from '@/api';
import { useConfirm } from '@/components/ui/ConfirmationProvider';
import { BuildingIcon, ShieldCheckIcon, DocumentTextIcon, CheckIcon, XIcon } from '@/components/ui/Icons';
import {
  getOrganizationCode,
  getOrganizationDef,
  getOrganizationEntityType,
  FSA_AUTHORITY_NAME,
  FSA_PARENT_MINISTRY,
  FsaEntityType,
} from '@/lib/constants/fsa-organizations';

type FilterCategory = 'ALL' | 'SECTOR_REGULATOR' | 'ADMINISTRATIVE' | 'OVERSIGHT_UNIT';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    domain: '',
    description: '',
    contactEmail: '',
    entityType: 'SECTOR_REGULATOR' as FsaEntityType,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'PENDING',
  });

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationsApi.getAll();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleOpenCreateModal = () => {
    setEditingOrg(null);
    setFormData({
      name: '',
      code: '',
      domain: '',
      description: '',
      contactEmail: '',
      entityType: 'SECTOR_REGULATOR',
      status: 'ACTIVE',
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: Organization) => {
    const def = getOrganizationDef(org.name) || getOrganizationDef(org.code);
    const resolvedType: FsaEntityType =
      org.metadata?.entityType || def?.entityType || 'SECTOR_REGULATOR';

    setEditingOrg(org);
    setFormData({
      name: org.name,
      code: org.code || def?.code || getOrganizationCode(org.name),
      domain: org.domain,
      description: org.description || def?.description || '',
      contactEmail: org.contactEmail || def?.contactEmail || '',
      entityType: resolvedType,
      status: org.status,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.domain.trim()) {
      setErrorMessage('Name and Domain are required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const typeLabel =
      formData.entityType === 'ADMINISTRATIVE'
        ? 'Administrative & Policy Body'
        : formData.entityType === 'OVERSIGHT_UNIT'
        ? 'Oversight & Compliance Unit'
        : 'Sector-Specific Regulator';

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase() || getOrganizationCode(formData.name),
      domain: formData.domain.trim(),
      description: formData.description.trim(),
      contactEmail: formData.contactEmail.trim(),
      status: formData.status,
      metadata: {
        shortCode: formData.code.trim().toUpperCase() || getOrganizationCode(formData.name),
        entityType: formData.entityType,
        entityTypeLabel: typeLabel,
        parentAuthority: FSA_AUTHORITY_NAME,
        parentMinistry: FSA_PARENT_MINISTRY,
      },
    };

    try {
      if (editingOrg) {
        await organizationsApi.update(editingOrg.id, payload);
      } else {
        await organizationsApi.create(payload);
      }
      setIsModalOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Organization',
      message: 'Are you sure you want to remove this organization? Associated applications and users may be impacted.',
      confirmText: 'Remove',
      confirmVariant: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await organizationsApi.delete(id);
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to delete organization', err);
    }
  };

  // Helper to determine org entity type
  const getOrgClassification = (org: Organization) => {
    const def = getOrganizationDef(org.name) || getOrganizationDef(org.code);
    const type: FsaEntityType = org.metadata?.entityType || def?.entityType || 'SECTOR_REGULATOR';
    const label: string = org.metadata?.entityTypeLabel || def?.entityTypeLabel || getOrganizationEntityType(org.name);
    return { type, label };
  };

  // Filter logic
  const filtered = organizations.filter((org) => {
    const { type } = getOrgClassification(org);
    const matchesCategory =
      categoryFilter === 'ALL' || type === categoryFilter;

    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.code && org.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      org.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Calculate breakdown stats
  const totalCount = organizations.length;
  const sectorCount = organizations.filter((o) => getOrgClassification(o).type === 'SECTOR_REGULATOR').length;
  const adminCount = organizations.filter((o) => getOrgClassification(o).type === 'ADMINISTRATIVE').length;
  const oversightCount = organizations.filter((o) => getOrgClassification(o).type === 'OVERSIGHT_UNIT').length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
      {/* Header section with Authority Hierarchy Subtitle */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Organizations & Regulators
              </h2>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">8 Subordinate Entities</span>
            <span>under the</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
              {FSA_AUTHORITY_NAME}
            </span>
            <span>•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {FSA_PARENT_MINISTRY}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search organizations or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-64 text-sm pl-9"
            />
          </div>
          <Button onClick={handleOpenCreateModal} className="h-10 text-sm font-semibold shrink-0 gap-2 flex items-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Organization
          </Button>
        </div>
      </div>

      {/* Classification Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/60 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Subordinate Bodies</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount || 8}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <BuildingIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">Operating under MEF / FSA</div>
        </Card>

        <Card className="!p-4 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-semibold">Sector-Specific Regulators</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{sectorCount || 6}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
              <BuildingIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">IRC, SERC, SSR, TR, ACAR, RPR</div>
        </Card>

        <Card className="!p-4 bg-gradient-to-br from-white to-sky-50/30 dark:from-slate-900 dark:to-sky-950/20 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sky-600 dark:text-sky-400 font-semibold">Administrative & Policy</p>
              <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">{adminCount || 1}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-sky-600/80 dark:text-sky-400/80 font-mono">FTC (General Secretariat)</div>
        </Card>

        <Card className="!p-4 bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 font-semibold">Oversight & Compliance</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{oversightCount || 1}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-purple-600/80 dark:text-purple-400/80 font-mono">IAU (Internal Audit Unit)</div>
        </Card>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            categoryFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>All Subordinate Entities</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('SECTOR_REGULATOR')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            categoryFilter === 'SECTOR_REGULATOR'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <BuildingIcon className="w-3.5 h-3.5" />
          <span>Sector-Specific Regulators</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-700 text-emerald-100">
            {sectorCount}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('ADMINISTRATIVE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            categoryFilter === 'ADMINISTRATIVE'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
          }`}
        >
          <DocumentTextIcon className="w-3.5 h-3.5" />
          <span>Administrative & Policy</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-700 text-sky-100">
            {adminCount}
          </span>
        </button>

        <button
          onClick={() => setCategoryFilter('OVERSIGHT_UNIT')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            categoryFilter === 'OVERSIGHT_UNIT'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
          }`}
        >
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          <span>Oversight & Compliance</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-700 text-purple-100">
            {oversightCount}
          </span>
        </button>
      </div>

      {/* Main Organizations Table */}
      <Card className="!p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="w-[32%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Organization & Entity
                </th>
                <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Classification
                </th>
                <th className="w-[18%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Domain
                </th>
                <th className="w-[15%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Contact
                </th>
                <th className="w-[8%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="w-[7%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading subordinate organizations...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No organizations found matching the selected filter or search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((org) => {
                  const { type, label } = getOrgClassification(org);
                  const code = org.code || getOrganizationCode(org.name);

                  let badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
                  let BadgeIcon = BuildingIcon;

                  if (type === 'ADMINISTRATIVE') {
                    badgeColor = 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20';
                    BadgeIcon = DocumentTextIcon;
                  } else if (type === 'OVERSIGHT_UNIT') {
                    badgeColor = 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20';
                    BadgeIcon = ShieldCheckIcon;
                  }

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold text-xs border border-sky-200 dark:border-sky-800/60 shrink-0 mt-0.5 shadow-xs">
                            {code}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <span>{org.name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-mono shrink-0">
                                {code}
                              </span>
                            </div>
                            {org.description && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md line-clamp-2">
                                {org.description}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 font-medium">
                              <span>FSA Subordinate Body</span>
                              <span>•</span>
                              <span>MEF Cambodia</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${badgeColor}`}>
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                            {org.domain}
                          </code>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {org.contactEmail ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate max-w-[160px]">{org.contactEmail}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                            org.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {org.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(org)}
                          className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(org.id)}
                          className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Organization Modal - Portaled to document.body */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl my-auto max-h-[calc(100vh-3rem)] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                  <BuildingIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingOrg ? 'Edit Subordinate Entity' : 'Add New Organization'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingOrg ? 'Update entity details, code & legal classification' : 'Register a new FSA subordinate regulator or body'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <Label htmlFor="org-name" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
                  Organization Name *
                </Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const autoCode = getOrganizationCode(newName);
                    setFormData((prev) => ({
                      ...prev,
                      name: newName,
                      code: prev.code ? prev.code : autoCode,
                    }));
                  }}
                  placeholder="e.g. Insurance Regulator of Cambodia (IRC)"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="org-code" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <BuildingIcon className="w-3.5 h-3.5 text-sky-500" />
                    Short Code / Acronym *
                  </Label>
                  <Input
                    id="org-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. IRC, SERC, FTC"
                    className="font-mono"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="org-type" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400" />
                    Legal Classification *
                  </Label>
                  <select
                    id="org-type"
                    value={formData.entityType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        entityType: e.target.value as FsaEntityType,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="SECTOR_REGULATOR">Sector-Specific Regulator (FSA)</option>
                    <option value="ADMINISTRATIVE">Administrative & Policy Body (FSA)</option>
                    <option value="OVERSIGHT_UNIT">Oversight & Compliance Unit (FSA)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="org-domain" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Authorized Domain *
                </Label>
                <Input
                  id="org-domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="e.g. irc.gov.kh"
                  required
                />
              </div>

              <div>
                <Label htmlFor="org-email" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Email
                </Label>
                <Input
                  id="org-email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="e.g. info@irc.gov.kh"
                />
              </div>

              <div>
                <Label htmlFor="org-desc" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                  Description
                </Label>
                <textarea
                  id="org-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Regulatory mandate and supervisory scope under the FSA..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="org-status" className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <CheckIcon className="w-3.5 h-3.5 text-slate-400" />
                  Status
                </Label>
                <select
                  id="org-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'PENDING',
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  <XIcon className="w-4 h-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {editingOrg ? 'Save Changes' : 'Create Organization'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
