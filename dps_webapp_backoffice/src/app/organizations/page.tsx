'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Label } from '@/components/ui/inputs';
import { Card } from '@/components/ui/card';
import { API_URL } from '@/lib/config';

interface Organization {
  id: string;
  name: string;
  domain: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    description: '',
    contactEmail: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'PENDING',
  });

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      let res = await fetch('/api/organizations');
      if (!res.ok) {
        res = await fetch(`${API_URL}/organizations`);
      }
      if (res.ok) {
        const data = await res.json();
        setOrganizations(Array.isArray(data) ? data : []);
      }
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
      domain: '',
      description: '',
      contactEmail: '',
      status: 'ACTIVE',
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      domain: org.domain,
      description: org.description || '',
      contactEmail: org.contactEmail || '',
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

    try {
      const url = editingOrg
        ? `/api/organizations/${editingOrg.id}`
        : '/api/organizations';
      const fallbackUrl = editingOrg
        ? `${API_URL}/organizations/${editingOrg.id}`
        : `${API_URL}/organizations`;
      const method = editingOrg ? 'PATCH' : 'POST';

      let res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(fallbackUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchOrganizations();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.message || 'Failed to save organization.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this organization?')) return;
    try {
      let res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/organizations/${id}`, { method: 'DELETE' });
      }
      if (res.ok) {
        fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to delete organization', err);
    }
  };

  const filtered = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Organizations
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Manage registered government agencies, commercial partners, and authorized domains.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-64 text-sm"
          />
          <Button onClick={handleOpenCreateModal} className="h-10 text-sm font-semibold shrink-0">
            + Add Organization
          </Button>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="w-[30%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Organization
                </th>
                <th className="w-[25%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Authorized Domain
                </th>
                <th className="w-[20%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Contact
                </th>
                <th className="w-[12%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="w-[13%] px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading registered organizations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No organizations found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {org.name}
                      </div>
                      {org.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm truncate">
                          {org.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                        {org.domain}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {org.contactEmail || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenEditModal(org)}
                        className="text-brand-600 dark:text-brand-400 hover:underline font-semibold text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(org.id)}
                        className="text-rose-600 dark:text-rose-400 hover:underline font-semibold text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingOrg ? 'Edit Organization' : 'Add New Organization'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Insurance Authority"
                  required
                />
              </div>

              <div>
                <Label htmlFor="org-domain">Authorized Domain *</Label>
                <Input
                  id="org-domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="e.g. insurance.gov.kh"
                  required
                />
              </div>

              <div>
                <Label htmlFor="org-email">Contact Email</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="e.g. contact@domain.gov.kh"
                />
              </div>

              <div>
                <Label htmlFor="org-desc">Description</Label>
                <textarea
                  id="org-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of agency role and responsibilities"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="org-status">Status</Label>
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
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingOrg ? 'Save Changes' : 'Create Organization'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
