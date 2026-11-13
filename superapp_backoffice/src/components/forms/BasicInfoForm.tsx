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

    if (!userOrg && !userOrgId && !userOrgName) {
      const ftcOrg = dbOrganizations.find(
        (o) => (o.code || '').toUpperCase() === 'FTC' || (o.name || '').toLowerCase().includes('financial technology center')
      );
      if (ftcOrg) return ftcOrg;
      return dbOrganizations[0] || null;
    }

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
  }, [userAffiliatedOrg, formData.id, formData.organization, formData.organizationCode, handleChange]);

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
    }
  };

  const tagline = formData.tagline ?? formData.shortDescription ?? '';
  const description = formData.description ?? formData.fullDescription ?? '';
  const errorRing = 'border-rose-500 ring-1 ring-rose-500 focus:ring-rose-500';
  const counter = (n: number, max: number) => (
    <span className={`text-xs tabular-nums ${n > max * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
      {n}/{max}
    </span>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      {/* Name, with the app ID it produces */}
      <div>
        <Label htmlFor="miniapp-name">
          Name <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="miniapp-name"
          required
          disabled={!isEditable}
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="e.g. Staff Attendance"
          className={allErrors.name ? errorRing : ''}
        />
        {allErrors.name ? (
          <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{allErrors.name}</p>
        ) : formData.slug ? (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            App ID <code className="font-mono text-slate-700 dark:text-slate-300">{formData.slug}</code>
          </p>
        ) : null}
        {allErrors.slug && <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{allErrors.slug}</p>}
      </div>

      {/* Organization: plain text when it is fixed to the user's own */}
      <div>
        <Label htmlFor="miniapp-org">
          Organization <span className="text-rose-500">*</span>
        </Label>
        {userAffiliatedOrg ? (
          <div
            id="miniapp-org"
            className="flex items-center gap-2 min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200"
            title="Mini apps belong to your organization"
          >
            <BuildingIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">
              {userAffiliatedOrg.code ? (
                <>
                  <span className="font-semibold">{userAffiliatedOrg.code}</span>
                  <span className="text-slate-500 dark:text-slate-400"> · {userAffiliatedOrg.name}</span>
                </>
              ) : (
                userAffiliatedOrg.name
              )}
            </span>
            <LockIcon className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />
          </div>
        ) : (
          <Select
            id="miniapp-org"
            name="organization"
            value={formData.organization || ''}
            onChange={handleOrgSelect}
            disabled={!isEditable || loadingOrgs}
          >
            {activeDbOrgs.length === 0 ? (
              <option value="">{loadingOrgs ? 'Loading...' : 'No active organizations'}</option>
            ) : (
              <>
                <option value="">Select an organization</option>
                {Object.entries(groupedByParent).map(([parent, orgs]) => (
                  <optgroup key={parent} label={parent}>
                    {orgs.map((org) => (
                      <option key={org.id} value={org.name}>
                        {org.code ? `${org.code} · ` : ''}
                        {org.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            )}
          </Select>
        )}
      </div>

      {/* Icon */}
      <div className="md:col-span-2">
        <LogoUploadInput
          value={formData.logo || ''}
          onChange={(logoVal) => handleChange({ target: { name: 'logo', value: logoVal } })}
          error={allErrors.logo}
          required={true}
          label="Icon"
          helperText="Square PNG, JPG, SVG or WebP, 512 × 512 px, up to 2 MB."
        />
      </div>

      {/* Tagline */}
      <div className="md:col-span-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="miniapp-tagline">
            Tagline <span className="text-xs font-normal text-slate-400">Optional</span>
          </Label>
          {counter(tagline.length, 100)}
        </div>
        <Input
          id="miniapp-tagline"
          name="tagline"
          maxLength={100}
          disabled={!isEditable}
          value={tagline}
          onChange={(e) => {
            handleChange(e);
            handleChange({ target: { name: 'shortDescription', value: e.target.value } } as any);
          }}
          placeholder="One line shown under the app name"
        />
      </div>

      {/* Description */}
      <div className="md:col-span-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="miniapp-description">
            Description <span className="text-xs font-normal text-slate-400">Optional</span>
          </Label>
          {counter(description.length, 1000)}
        </div>
        <Textarea
          id="miniapp-description"
          name="description"
          rows={4}
          maxLength={1000}
          disabled={!isEditable}
          value={description}
          onChange={(e) => {
            handleChange(e);
            handleChange({ target: { name: 'fullDescription', value: e.target.value } } as any);
          }}
          placeholder="What the app does and who it is for"
          className={allErrors.description || allErrors.fullDescription ? errorRing : ''}
        />
        {(allErrors.description || allErrors.fullDescription) && (
          <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{allErrors.description || allErrors.fullDescription}</p>
        )}
      </div>
    </div>
  );
}
