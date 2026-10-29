'use client';

import React from 'react';
import { Organization, isRootOrganization } from '@/api/organizations.api';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';

interface OrganizationActionMenuProps {
  organization: Organization;
  onView?: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onToggleStatus: (org: Organization) => void;
  onDelete?: (org: Organization) => void;
  isOwnOrg?: boolean;
}

export function OrganizationActionMenu({
  organization,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  isOwnOrg = false,
}: OrganizationActionMenuProps) {
  const isActive = organization.status === 'ACTIVE';
  const isRoot = isRootOrganization(organization);
  const activeChildrenCount = (organization.children || []).filter((c) => c.status === 'ACTIVE').length;
  const hasChildren = (organization.children?.length ?? 0) > 0;

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
      label: isRoot
        ? 'Primary Authority (Protected)'
        : isActive && isOwnOrg
        ? 'Disable (Assigned Org)'
        : isActive
        ? 'Disable'
        : 'Enable',
      variant: isRoot ? 'default' : isActive ? 'warning' : 'primary',
      disabled: isRoot || (isActive && isOwnOrg),
      divider: true,
      onClick: () => onToggleStatus(organization),
      icon: isRoot ? (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : isActive && isOwnOrg ? (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ) : isActive ? (
        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    ...(!isRoot && onDelete
      ? [
          {
            label: 'Delete',
            variant: 'danger' as const,
            divider: true,
            onClick: () => onDelete(organization),
            icon: (
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return <ActionMenu items={items} ariaLabel={`Actions for ${organization.name}`} />;
}
