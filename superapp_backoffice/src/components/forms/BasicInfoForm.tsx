import React, { useState, useEffect, useMemo } from 'react';
import { Input, Label, Select, Textarea } from '@/components/ui/inputs';
import { LogoUploadInput } from '@/components/ui/LogoUploadInput';
import { LockIcon, BuildingIcon } from '@/components/ui/Icons';
import { organizationsApi, Organization } from '@/api/organizations.api';
import { unwrapData } from '@/api';
import { useAuth } from '@/lib/auth';

export default function BasicInfoForm({ formData, handleChange, allErrors = {}, isEditable = true }: any) {
  const { user } = useAuth();
  const [dbOrganizations, setDbOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadOrgs = async () => {
      try {
        setLoadingOrgs(true);
        const res = await organizationsApi.getAll({ status: 'ACTIVE', limit: 100 });
        const data = unwrapData<Organization>(res);
        if (mounted && Array.isArray(data) && data.length > 0) {
          setDbOrganizations(data);

          // Find organization that the current user belongs to
          const userOrg = user?.organization;
          const userOrgId = user?.organizationId || (typeof userOrg === 'object' && userOrg ? userOrg.id : null);
          const userOrgName = typeof userOrg === 'string' ? userOrg : userOrg?.name;
          const userOrgCode = typeof userOrg === 'object' && userOrg ? userOrg.code : null;

          const matchedUserOrg = data.find((org) => {
            if (userOrgId && org.id === userOrgId) return true;
            if (userOrgCode && org.code && org.code.toLowerCase() === userOrgCode.toLowerCase()) return true;
            if (userOrgName) {
              const u = userOrgName.toLowerCase().trim();
              const oName = (org.name || '').toLowerCase().trim();
              const oCode = (org.code || '').toLowerCase().trim();
              if (oName === u || oCode === u) return true;
              if (oName && u.includes(oName)) return true;
              if (oCode && u.includes(oCode)) return true;
              if (u && oName.includes(u)) return true;
            }
            return false;
          });

          // If user belongs to an organization, always bind to their organization
          const targetOrg = matchedUserOrg || (userOrgName ? { name: userOrgName, code: userOrgCode || '' } : (!formData.organization ? data[0] : null));

          if (targetOrg && handleChange && (!formData.organization || (!formData.id && (matchedUserOrg || userOrgName)))) {
            handleChange({
              target: { name: 'organization', value: targetOrg.name },
            } as any);
            if (targetOrg.code) {
              handleChange({
                target: { name: 'organizationCode', value: targetOrg.code },
              } as any);
            }
            handleChange({
              target: { name: 'category', value: targetOrg.name },
            } as any);
          }
        }
      } catch (err) {
        console.error('Failed to query organizations from database API:', err);
      } finally {
        if (mounted) setLoadingOrgs(false);
      }
    };

    loadOrgs();
    return () => {
      mounted = false;
    };
  }, [user]);

  // User Affiliated Organization: Auto-detect from authenticated user session
  const userAffiliatedOrg = useMemo(() => {
    if (!user) return null;
    const userOrg = user.organization;
    const userOrgId = user.organizationId || (typeof userOrg === 'object' && userOrg ? userOrg.id : null);
    const userOrgName = typeof userOrg === 'string' ? userOrg : userOrg?.name;
    const userOrgCode = typeof userOrg === 'object' && userOrg ? userOrg.code : null;

    if (!userOrg && !userOrgId && !userOrgName) return null;

    const matched = dbOrganizations.find((org) => {
      if (userOrgId && org.id === userOrgId) return true;
      if (userOrgCode && org.code && org.code.toLowerCase() === userOrgCode.toLowerCase()) return true;
      if (userOrgName) {
        const u = userOrgName.toLowerCase().trim();
        const oName = (org.name || '').toLowerCase().trim();
        const oCode = (org.code || '').toLowerCase().trim();
        if (oName === u || oCode === u) return true;
        if (oName && u.includes(oName)) return true;
        if (oCode && u.includes(oCode)) return true;
        if (u && oName.includes(u)) return true;
      }
      return false;
    });

    if (matched) return matched;
    if (userOrgName || userOrgId) {
      return {
        id: userOrgId || '',
        name: userOrgName || '',
        code: userOrgCode || '',
      } as Organization;
    }
    return null;
  }, [user, dbOrganizations]);

  // Sync user organization when user or organizations finish loading
  useEffect(() => {
    if (!userAffiliatedOrg || !handleChange) return;
    if (formData.id) return; // Do not overwrite existing miniapp organization

    const targetName = userAffiliatedOrg.name;
    const targetCode = userAffiliatedOrg.code || '';

    if (formData.organization !== targetName) {
      handleChange({
        target: { name: 'organization', value: targetName },
      } as any);
    }
    if (targetCode && formData.organizationCode !== targetCode) {
      handleChange({
        target: { name: 'organizationCode', value: targetCode },
      } as any);
    }
    if (formData.category !== targetName) {
      handleChange({
        target: { name: 'category', value: targetName },
      } as any);
    }
  }, [userAffiliatedOrg, formData.id, formData.organization, formData.organizationCode, formData.category, handleChange]);

  // Filter out any INACTIVE organizations and sort in Ascending (ASC) order from A to Z
  const activeDbOrgs = useMemo(
    () =>
      dbOrganizations
        .filter((o) => (o.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [dbOrganizations]
  );

  // Group active database organizations dynamically by their official `parentAuthority` attribute
  const groupedByParent = useMemo(() => {
    const groups: Record<string, Organization[]> = {};
    activeDbOrgs.forEach((org) => {
      const parent = org.parentAuthority || 'Non-Bank Financial Services Authority';
      if (!groups[parent]) groups[parent] = [];
      groups[parent].push(org);
    });
    // Ensure each group's items are sorted ASC A to Z
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    return groups;
  }, [activeDbOrgs]);

  const handleOrgSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (userAffiliatedOrg) return; // Disallow changing organization when bound to user's org
    const chosenName = e.target.value;
    const selectedOrg = dbOrganizations.find((o) => o.name === chosenName);

    if (handleChange) {
      handleChange({
        target: { name: 'organization', value: chosenName },
      } as any);

      handleChange({
        target: { name: 'organizationCode', value: selectedOrg?.code || '' },
      } as any);

      handleChange({
        target: { name: 'category', value: chosenName },
      } as any);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. MiniApp Name */}
        <div>
          <Label>
            MiniApp Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            required
            disabled={!isEditable}
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="e.g. Core Banking App"
            className={allErrors.name ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          {allErrors.name && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.name}</p>}
        </div>

        {/* 2. MiniApp Slug */}
        <div>
          <Label>
            MiniApp Slug <span className="text-slate-400 font-normal text-xs">(URL &amp; Catalog Key)</span> <span className="text-rose-500">*</span>
          </Label>
          <div className="relative flex items-center">
            <Input
              disabled
              readOnly
              name="slug"
              value={formData.slug || ''}
              placeholder="e.g. staff-portal-attendance"
              className={`font-mono text-base !bg-slate-200/70 dark:!bg-slate-800/90 !border-slate-300/80 dark:!border-slate-700 !text-slate-600 dark:!text-slate-200 placeholder:!text-slate-400 dark:placeholder:!text-slate-400 cursor-not-allowed select-all pr-10 ${allErrors.slug ? '!border-rose-500 ring-1 ring-rose-500 bg-rose-50/50' : ''}`}
            />
            <div className="absolute right-3.5 pointer-events-none flex items-center text-slate-400 dark:text-slate-500">
              <LockIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Binary MiniApp ID (<code>app_id</code>) is auto-detected from your package in the Integration step.
          </p>
          {allErrors.slug && <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.slug}</p>}
        </div>

        {/* 3. Organization (Auto-detected and locked to user's organization) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="flex items-center gap-1.5">
              <BuildingIcon className="w-3.5 h-3.5 text-sky-500" />
              <span>
                Organization <span className="text-rose-500">*</span>
              </span>
            </Label>
            {userAffiliatedOrg ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Affiliated Organization (Locked)
              </span>
            ) : loadingOrgs ? (
              <span className="text-[11px] text-slate-400 animate-pulse">
                Querying database...
              </span>
            ) : null}
          </div>
          {userAffiliatedOrg ? (
            <div>
              <div className="relative flex items-center">
                <Input
                  disabled
                  readOnly
                  name="organization"
                  value={
                    userAffiliatedOrg.code
                      ? `${userAffiliatedOrg.code} — ${userAffiliatedOrg.name}`
                      : userAffiliatedOrg.name
                  }
                  className="font-medium text-sm !bg-slate-100/90 dark:!bg-slate-800/90 !border-slate-300/80 dark:!border-slate-700 !text-slate-800 dark:!text-slate-200 cursor-not-allowed select-all pr-10"
                />
                <div
                  className="absolute right-3.5 pointer-events-none flex items-center text-slate-400 dark:text-slate-500"
                  title="Organization is locked to your affiliated authority"
                >
                  <LockIcon className="w-4 h-4" />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                MiniApp ownership is locked to your affiliated organization ({userAffiliatedOrg.code || userAffiliatedOrg.name}). Changing organization is restricted.
              </p>
            </div>
          ) : (
            <Select
              name="organization"
              value={formData.organization || ''}
              onChange={handleOrgSelect}
              disabled={!isEditable || loadingOrgs}
              className="text-sm font-medium"
            >
              {activeDbOrgs.length === 0 ? (
                <option value="">
                  {loadingOrgs ? 'Loading organizations from database...' : 'No active organizations found'}
                </option>
              ) : (
                <>
                  <option value="">Select an organization</option>
                  {Object.entries(groupedByParent).map(([parent, orgs]) => (
                    <optgroup key={parent} label={parent} className="font-semibold text-slate-700 dark:text-slate-200">
                      {orgs.map((org) => (
                        <option key={org.id} value={org.name} className="font-normal text-slate-800 dark:text-slate-300">
                          {org.code ? `${org.code} — ` : ''}{org.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </Select>
          )}
        </div>

        {/* 4. Logo Upload */}
        <div>
          <LogoUploadInput
            value={formData.logo || ''}
            onChange={(logoVal) => handleChange({ target: { name: 'logo', value: logoVal } })}
            error={allErrors.logo}
            required={true}
          />
        </div>

        {/* 5. Tagline / Short Description */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label>Tagline / Short Description</Label>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono ${
                (formData.tagline ?? formData.shortDescription ?? '').length > 90
                  ? 'text-amber-500 font-semibold'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {(formData.tagline ?? formData.shortDescription ?? '').length} / 100 characters
              </span>
              <span className="text-xs text-slate-400 font-medium">Optional</span>
            </div>
          </div>
          <Input
            name="tagline"
            maxLength={100}
            value={formData.tagline ?? formData.shortDescription ?? ''}
            onChange={(e) => {
              handleChange(e);
              handleChange({ target: { name: 'shortDescription', value: e.target.value } } as any);
            }}
            placeholder="e.g. Instant payments and digital wallet for retail users"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Concise summary displayed on mobile app catalog tiles, search snippets, and notifications (max 100 characters).
          </p>
        </div>

        {/* 6. Description */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label>Description</Label>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono ${
                (formData.description ?? formData.fullDescription ?? '').length > 900
                  ? 'text-amber-500 font-semibold'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {(formData.description ?? formData.fullDescription ?? '').length} / 1000 characters
              </span>
              <span className="text-xs text-slate-400 font-medium">Optional</span>
            </div>
          </div>
          <Textarea
            name="description"
            rows={3}
            maxLength={1000}
            value={formData.description ?? formData.fullDescription ?? ''}
            onChange={(e) => {
              handleChange(e);
              handleChange({ target: { name: 'fullDescription', value: e.target.value } } as any);
            }}
            placeholder="e.g. Comprehensive details explaining the features, user flows, and core functionality of this MiniApp..."
            className={allErrors.description || allErrors.fullDescription ? 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500 bg-rose-50/50' : ''}
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Comprehensive details explaining features, user flows, and capabilities for the MiniApp detail page (max 1,000 characters).
          </p>
          {(allErrors.description || allErrors.fullDescription) && (
            <p className="mt-1.5 text-sm text-rose-600 font-medium">{allErrors.description || allErrors.fullDescription}</p>
          )}
        </div>
      </div>
    </>
  );
}
