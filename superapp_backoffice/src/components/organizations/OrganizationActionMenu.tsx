'use client';

import React from 'react';
import { Organization } from '@/api/organizations.api';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';

interface OrganizationActionMenuProps {
  organization: Organization;
  onView?: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onToggleStatus: (org: Organization) => void;
}

export function OrganizationActionMenu({
  organization,
  onView,
  onEdit,
  onToggleStatus,
}: OrganizationActionMenuProps) {
  const isActive = organization.status === 'ACTIVE';

  const items: ActionMenuItem[] = [
    {
      label: 'View',
      href: `/organizations/${organization.id}`,
      onClick: () => onView?.(organization),
      icon: (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: 'Edit',
      onClick: () => onEdit(organization),
      icon: (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      label: isActive ? 'Disable' : 'Enable',
      variant: isActive ? 'warning' : 'primary',
      divider: true,
      onClick: () => onToggleStatus(organization),
      icon: isActive ? (
        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return <ActionMenu items={items} ariaLabel={`Actions for ${organization.name}`} />;
}
