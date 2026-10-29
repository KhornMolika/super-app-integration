'use client';

import React from 'react';
import { User } from '@/api/users.api';
import { Role } from '@/api/roles.api';
import { MiniApp } from '@/api/miniapps.api';
import { AuditLog } from '@/api/audit-logs.api';
import { UserOverviewTab } from './tabs/UserOverviewTab';

export interface UserDetailTabsProps {
  user: User;
  roles?: Role[];
  miniApps: MiniApp[];
  loadingMiniApps?: boolean;
  auditLogs?: AuditLog[];
  loadingAuditLogs?: boolean;
}

export function UserDetailTabs({
  user,
  miniApps,
}: UserDetailTabsProps) {
  return (
    <UserOverviewTab
      user={user}
      miniApps={miniApps}
      miniAppsCount={miniApps.length}
    />
  );
}
