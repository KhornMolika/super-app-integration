import { User } from '@/api/users.api';
import { Organization } from '@/api/organizations.api';
import { ActivityDataPoint, DonutTab, OrgStatItem } from '../types';

/**
 * Generates 90-day activity trend telemetry aggregated by date.
 */
export function generateActivityTrend(miniAppsList: any[]): ActivityDataPoint[] {
  const days: ActivityDataPoint[] = [];
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;

    // Count actual miniApps created or updated on this exact date
    const appSubs = miniAppsList.filter((app) => {
      const dStr = app.createdAt || app.updatedAt;
      return dStr ? dStr.startsWith(iso) : false;
    }).length;

    const appRevs = miniAppsList.filter((app) => {
      if (!['APPROVED', 'PUBLISHED', 'IN_REVIEW', 'ACTIVE'].includes(app.status)) return false;
      const dStr = app.updatedAt || app.createdAt;
      return dStr ? dStr.startsWith(iso) : false;
    }).length;

    days.push({
      date: iso,
      label,
      submissions: appSubs,
      reviews: appRevs,
    });
  }

  return days;
}

/**
 * Builds donut chart tabs for lifecycle, integrations, and optionally user roles.
 */
export function generateDonutTabs(
  miniAppsList: any[],
  usersList: User[],
  canReadUsers: boolean,
): DonutTab[] {
  // 1. App lifecycle breakdown
  const activeCount = miniAppsList.filter((a) => ['APPROVED', 'PUBLISHED', 'ACTIVE'].includes(a.status)).length;
  const reviewCount = miniAppsList.filter((a) => ['IN_REVIEW', 'SUBMITTED'].includes(a.status)).length;
  const draftCount = miniAppsList.filter((a) => a.status === 'DRAFT' || !a.status).length;
  const rejectedCount = miniAppsList.filter((a) => ['REJECTED', 'SUSPENDED'].includes(a.status)).length;

  const lifecycleTab: DonutTab = {
    id: 'lifecycle',
    label: 'Lifecycle',
    centerLabel: 'MiniApps',
    segments: [
      { label: 'Published', value: activeCount, color: '#10b981' },
      { label: 'In Review', value: reviewCount, color: '#f59e0b' },
      { label: 'Draft', value: draftCount, color: '#64748b' },
      { label: 'Rejected', value: rejectedCount, color: '#f43f5e' },
    ],
  };

  // 2. Integration methods breakdown
  const webviewCount = miniAppsList.filter((a) => a.integrationMethod === 'WEBVIEW').length;
  const flutterCount = miniAppsList.filter((a) => a.integrationMethod === 'FLUTTER_PACKAGE' || !a.integrationMethod).length;
  const deepLinkCount = miniAppsList.filter((a) => a.integrationMethod === 'DEEP_LINK').length;
  const nativeSdkCount = miniAppsList.filter((a) => a.integrationMethod === 'NATIVE_SDK').length;

  const integrationTab: DonutTab = {
    id: 'integration',
    label: 'Integrations',
    centerLabel: 'Packages',
    segments: [
      { label: 'Flutter', value: flutterCount, color: '#06b6d4' },
      { label: 'WebView', value: webviewCount, color: '#3b82f6' },
      { label: 'Deep Link', value: deepLinkCount, color: '#8b5cf6' },
      { label: 'Native SDK', value: nativeSdkCount, color: '#ec4899' },
    ],
  };

  // 3. User Access breakdown if permitted
  if (canReadUsers && usersList.length > 0) {
    let superAdmins = 0;
    let admins = 0;
    let devs = 0;

    usersList.forEach((u) => {
      const uRole = u.role?.name || (u.roles && u.roles[0]?.name) || '';
      if (uRole === 'SUPER_ADMIN') superAdmins++;
      else if (uRole === 'ADMIN') admins++;
      else devs++;
    });

    const userRolesTab: DonutTab = {
      id: 'user_roles',
      label: 'Roles',
      centerLabel: 'Users',
      segments: [
        { label: 'MA Developers', value: devs, color: '#6366f1' },
        { label: 'Regulators & Admins', value: admins, color: '#0ea5e9' },
        { label: 'Super Admins', value: superAdmins, color: '#8b5cf6' },
      ],
    };

    return [lifecycleTab, userRolesTab, integrationTab];
  }

  return [lifecycleTab, integrationTab];
}

/**
 * Computes organization metrics with attached miniApps count and sorts descending.
 */
export function generateOrgStats(
  organizationsList: Organization[],
  miniAppsList: any[],
): OrgStatItem[] {
  return organizationsList
    .map((org) => {
      const orgApps = miniAppsList.filter(
        (app) =>
          app.organizationId === org.id ||
          app.organization?.id === org.id ||
          (app.organization?.name && app.organization.name === org.name),
      );
      return {
        id: org.id,
        name: org.name,
        code: org.code,
        parentAuthority: org.parentAuthority,
        status: org.status,
        miniAppsCount: orgApps.length,
      };
    })
    .sort((a, b) => b.miniAppsCount - a.miniAppsCount);
}

/**
 * Counts user roles and unapproved/pending statuses.
 */
export function calculateUserCounts(usersList: User[]) {
  let devCount = 0;
  let admCount = 0;
  let pendingUserCount = 0;

  usersList.forEach((u) => {
    const uRole = u.role?.name || (u.roles && u.roles[0]?.name) || '';
    if (uRole === 'MA_DEVELOPER' || uRole === 'MINI_APP_DEVELOPER') {
      devCount++;
    } else if (uRole === 'ADMIN' || uRole === 'SUPER_ADMIN') {
      admCount++;
    }
    if (u.status === 'PENDING' || u.isActive === false) {
      pendingUserCount++;
    }
  });

  return { devCount, admCount, pendingUserCount };
}
