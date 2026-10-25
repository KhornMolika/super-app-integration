"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState, useMemo } from 'react';
import {
  miniappsApi,
  permissionsApi,
  superAppApi,
  telegramApi,
  isBackendUnreachableError,
  unwrapData,
} from '@/api';
import { usersApi, User } from '@/api/users.api';
import { organizationsApi, Organization, getOrganizationCode } from '@/api/organizations.api';
import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import DistributionDonutChart, { DonutTab } from '@/components/dashboard/DistributionDonutChart';
import ActivityTrendChart, { ActivityDataPoint } from '@/components/dashboard/ActivityTrendChart';
import OrganizationsOverviewCard from '@/components/dashboard/OrganizationsOverviewCard';

export default function Dashboard() {
  const { can, role, user } = useAuth();
  const isManager = role === 'MA_DEVELOPER';

  const [metrics, setMetrics] = useState({
    totalMiniApps: 0,
    pendingReviews: 0,
    supportedPermissions: 0,
    superAppTestVersion: 'v0.0.1',
    officialReleaseVersion: 'v0.0.1',
    totalUsers: 0,
    totalOrganizations: 0,
    developerCount: 0,
    adminCount: 0,
    pendingUsersCount: 0,
  });

  const [miniAppsList, setMiniAppsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [organizationsList, setOrganizationsList] = useState<Organization[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ configured: boolean; licenseType: string; endpoint: string } | null>(null);
  const [telegramInfo, setTelegramInfo] = useState<{ isConnected?: boolean; botUsername?: string; user?: any } | null>(null);
  const [ecosystemData, setEcosystemData] = useState<any>(null);
  const [isBackendDown, setIsBackendDown] = useState(false);

  async function fetchMetrics() {
    try {
      let isDown = false;

      // Base calls accessible by all authorized backoffice sessions
      const calls: Promise<any>[] = [
        miniappsApi.getAll().catch((err) => {
          if (isBackendUnreachableError(err)) isDown = true;
          return [];
        }),
        permissionsApi.getProposals().catch((err) => {
          if (isBackendUnreachableError(err)) isDown = true;
          return [];
        }),
        permissionsApi.getAll().catch((err) => {
          if (isBackendUnreachableError(err)) isDown = true;
          return [];
        }),
        superAppApi.getEcosystemStatus().catch((err) => {
          if (isBackendUnreachableError(err)) isDown = true;
          return null;
        }),
        superAppApi.getStorageLicenseStatus().catch(() => null),
        telegramApi.getStatus().catch(() => null),
      ];

      // Role-gated call: users directory
      if (can('user:read')) {
        calls.push(
          usersApi.getAll().catch((err) => {
            if (isBackendUnreachableError(err)) isDown = true;
            return [];
          }),
        );
      } else {
        calls.push(Promise.resolve([]));
      }

      // Role-gated call: organizations directory
      if (can('organization:read')) {
        calls.push(
          organizationsApi.getAll().catch((err) => {
            if (isBackendUnreachableError(err)) isDown = true;
            return [];
          }),
        );
      } else {
        calls.push(Promise.resolve([]));
      }

      const [
        miniAppsRes,
        proposalsRes,
        permissionsRes,
        ecosystem,
        storage,
        telegram,
        usersRes,
        orgsRes,
      ] = await Promise.all(calls);

      setIsBackendDown(isDown);

      const rawApps = unwrapData<any>(miniAppsRes);
      setMiniAppsList(rawApps);

      const rawUsers = unwrapData<User>(usersRes);
      setUsersList(rawUsers);

      const rawOrgs = unwrapData<Organization>(orgsRes);
      setOrganizationsList(rawOrgs);

      // Pending MiniApps needing review
      const pendingApps = rawApps.filter(
        (a: any) => a.status === 'IN_REVIEW' || a.status === 'SUBMITTED',
      );

      // Pending Permission Proposals needing review
      const rawProposals = unwrapData<any>(proposalsRes);
      const pendingProposals = rawProposals.filter(
        (p: any) => p.status === 'PENDING_REVIEW' || p.status === 'Pending',
      );

      const permissions = unwrapData<any>(permissionsRes);

      // User role counts
      let devCount = 0;
      let admCount = 0;
      let pendingUserCount = 0;

      rawUsers.forEach((u) => {
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

      setMetrics({
        totalMiniApps: rawApps.length,
        pendingReviews: pendingApps.length + pendingProposals.length,
        supportedPermissions: permissions.length,
        superAppTestVersion: ecosystem?.superAppTestVersion || ecosystem?.superAppVersion || 'v0.0.1',
        officialReleaseVersion: ecosystem?.officialReleaseVersion || 'v0.0.1',
        totalUsers: rawUsers.length,
        totalOrganizations: rawOrgs.length,
        developerCount: devCount,
        adminCount: admCount,
        pendingUsersCount: pendingUserCount,
      });

      if (ecosystem) setEcosystemData(ecosystem);
      if (storage) setStorageInfo(storage);
      if (telegram) setTelegramInfo(telegram);
    } catch (e) {
      console.error('Failed to fetch dashboard metrics', e);
      if (isBackendUnreachableError(e)) {
        setIsBackendDown(true);
      }
    }
  }

  useEffect(() => {
    fetchMetrics();
  }, [role]);

  const nexusUrl = ecosystemData?.integratedServices?.nexusRegistry?.url || 'http://localhost:8081';
  const jenkinsUrl = ecosystemData?.integratedServices?.jenkinsCiCd?.url || 'http://localhost:8085';
  const botUsername =
    telegramInfo?.botUsername || ecosystemData?.integratedServices?.telegramBot?.username || 'superapp_notification_bot';
  const botUrl = `https://t.me/${botUsername}`;
  const storageEndpoint =
    storageInfo?.endpoint || ecosystemData?.integratedServices?.minioStorage?.endpoint || 'localhost:9000';

  const isTelegramConnected = Boolean(telegramInfo?.user?.isConnected || telegramInfo?.isConnected);

  // MA Developer specific counts
  const myPendingAppsCount = miniAppsList.filter((a: any) =>
    ['IN_REVIEW', 'SUBMITTED'].includes(a.status),
  ).length;
  const myPublishedAppsCount = miniAppsList.filter((a: any) =>
    ['APPROVED', 'PUBLISHED', 'ACTIVE'].includes(a.status),
  ).length;

  // --------------------------------------------------------------------------
  // ANALYTICS DATA PREPARATION
  // --------------------------------------------------------------------------

  // 1. Activity Trend (Real 90 days aggregated telemetry)
  const activityData: ActivityDataPoint[] = useMemo(() => {
    const days: ActivityDataPoint[] = [];
    const now = new Date();

    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  }, [miniAppsList]);

  // 2. Donut Tabs: Lifecycle, User Access, and Integration Types
  const donutTabs: DonutTab[] = useMemo(() => {
    // App lifecycle breakdown
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

    // Integration methods breakdown
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

    // If user has permission to read users, include User Access breakdown
    if (can('user:read') && usersList.length > 0) {
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
  }, [miniAppsList, usersList, can]);

  // 3. Organization statistics with apps count
  const orgStats = useMemo(() => {
    return organizationsList.map((org) => {
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
    }).sort((a, b) => b.miniAppsCount - a.miniAppsCount);
  }, [organizationsList, miniAppsList]);

  // Find user's organization for developer view
  const myOrganization = useMemo(() => {
    if (!user?.organizationId) return null;
    return organizationsList.find((o) => o.id === user.organizationId) || null;
  }, [user, organizationsList]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out space-y-8">
      {isBackendDown && (
        <BackendServiceOfflineNotice
          mode="banner"
          title="Backend Service Unreachable"
          message="Live metrics and ecosystem telemetry may be delayed while the backend is starting up or restarting."
          onRetry={fetchMetrics}
          autoRetrySeconds={5}
        />
      )}

      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {isManager ? 'MiniApp Developer Workspace' : 'SuperApp Administration'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isManager
              ? 'Monitor your registered MiniApps, review statuses, security verification, and direct notifications.'
              : 'Global ecosystem metrics, user directory, release versions, and platform infrastructure.'}
          </p>
        </div>

        {/* Action shortcuts */}
        <div className="flex flex-wrap gap-3">
          {can('miniapp:create') && (
            <Link
              href="/miniapps/register"
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-brand-600 hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Register MiniApp</span>
            </Link>
          )}

          {!isManager && can('permission_proposal:read') && (
            <Link
              href="/capabilities?tab=proposals"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Review Pending ({metrics.pendingReviews})</span>
            </Link>
          )}

          {isManager && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span>{isTelegramConnected ? 'Telegram Active' : 'Setup Telegram Alerts'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TIER 1: HIGH-LEVEL PLATFORM KPIS (ROLE-AWARE) */}
      {/* ------------------------------------------------------------- */}
      {!isManager ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          {/* Total MiniApps */}
          <Link
            href="/miniapps"
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-brand-500/50 transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
              </div>
              {metrics.pendingReviews > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {metrics.pendingReviews} pending
                </span>
              )}
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Total MiniApps</h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalMiniApps}</p>
            </div>
          </Link>

          {/* Platform Users */}
          {can('user:read') ? (
            <Link
              href="/users"
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-indigo-500/50 transition-all relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                {metrics.pendingUsersCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {metrics.pendingUsersCount} unapproved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Platform Users</h3>
              <div className="mt-1 flex items-baseline space-x-2">
                <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalUsers}</p>
                <span className="text-xs text-slate-400">({metrics.developerCount} devs)</span>
              </div>
            </Link>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Developer Community</h3>
              <div className="mt-1 flex items-baseline space-x-2">
                <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.developerCount || miniAppsList.length}</p>
              </div>
            </div>
          )}

          {/* Partner Organizations */}
          <Link
            href="/organizations"
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-sky-500/50 transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                Regulators
              </span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Authorities &amp; Orgs</h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalOrganizations || organizationsList.length}</p>
            </div>
          </Link>

          {/* Supported Permissions */}
          <Link
            href="/capabilities"
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-emerald-500/50 transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                RBAC
              </span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Capabilities</h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.supportedPermissions}</p>
            </div>
          </Link>

          {/* SuperApp Test Build Version */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800/40 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Testing
              </span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Test Build APK</h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.superAppTestVersion}</p>
            </div>
          </div>

          {/* Official Release Version */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-accent-200 dark:border-accent-800/40 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent-50 text-accent-800 dark:bg-accent-950 dark:text-accent-300 border border-accent-300 dark:border-accent-800">
                Production
              </span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Official Release</h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.officialReleaseVersion}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MA DEVELOPER DASHBOARD METRICS */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* My Total MiniApps */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">My MiniApps</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{miniAppsList.length}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Total registered packages</p>
          </div>

          {/* In Review / Submitted */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">In Review</h3>
              {myPendingAppsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Awaiting Approval
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{myPendingAppsCount}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Submissions undergoing review</p>
          </div>

          {/* Published / Active */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Active &amp; Published</h3>
            <div className="mt-2 flex items-baseline space-x-2">
              <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{myPublishedAppsCount}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Live in SuperApp ecosystem</p>
          </div>

          {/* Direct Telegram Alerts */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-sky-200 dark:border-sky-900/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center mb-4 text-sky-600 dark:text-sky-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Telegram Alerts</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                isTelegramConnected
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {isTelegramConnected ? 'Active' : 'Unlinked'}
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {isTelegramConnected
                ? (telegramInfo?.user?.telegramUsername ? `@${telegramInfo.user.telegramUsername}` : 'Direct Chat Linked')
                : 'Not Linked'}
            </div>
            <Link href="/settings" className="text-xs text-sky-600 dark:text-sky-400 hover:underline mt-1 block">
              {isTelegramConnected ? 'Manage notifications →' : 'Connect now (1-Click) →'}
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TIER 2: INTERACTIVE VISUAL ANALYTICS (GRAPHS & PIES) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 Cols): Activity & Velocity Curve */}
        <div className="lg:col-span-7 flex flex-col">
          <ActivityTrendChart
            title={isManager ? 'My MiniApp Submission Velocity' : 'Ecosystem Velocity & Releases'}
            description={
              isManager
                ? 'Timeline of your package updates, automated checks, and regulatory reviews.'
                : 'Aggregated submissions, version updates, and compliance verifications across all ministries.'
            }
            data={activityData}
            primaryLabel={isManager ? 'My Submissions' : 'Submissions'}
            secondaryLabel={isManager ? 'Build Checks' : 'Scans & Reviews'}
          />
        </div>

        {/* Right Column (5 Cols): Distribution Donut (Lifecycle, Roles, Integrations) */}
        <div className="lg:col-span-5 flex flex-col">
          <DistributionDonutChart
            title={isManager ? 'My MiniApps Distribution' : 'Ecosystem Composition'}
            description={
              isManager
                ? 'Lifecycle status and integration methods of your registered packages.'
                : 'Live breakdown of MiniApp statuses, user permissions, and architecture types.'
            }
            tabs={donutTabs}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TIER 3: REGULATORY AUTHORITIES / DEVELOPER LIFECYCLE & INFRA */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Box (6 cols): Regulatory Authorities / Organizations Meter */}
        <div className="lg:col-span-6 flex flex-col">
          <OrganizationsOverviewCard
            organizations={orgStats}
            totalOrganizations={metrics.totalOrganizations || organizationsList.length}
            isManager={isManager}
            myOrganization={myOrganization}
          />
        </div>

        {/* Right Box (6 cols): Ecosystem Infrastructure Services (Admins) OR Developer Quick Action */}
        <div className="lg:col-span-6 flex flex-col">
          {!isManager ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Ecosystem Services &amp; Infrastructure
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        Operational status of object storage, messaging bots, artifact registries, and CI/CD pipelines.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                    4 Active Daemons
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                  {/* Storage Engine Status */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Storage Engine</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                      {storageInfo?.licenseType || 'MinIO Object Storage'}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                      {storageEndpoint}
                    </p>
                  </div>

                  {/* Telegram Gateway Status */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Telegram Gateway</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                      Bot Gateway
                    </div>
                    <a
                      href={botUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-mono mt-0.5 block truncate"
                    >
                      @{botUsername}
                    </a>
                  </div>

                  {/* Nexus Registry */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Nexus Registry</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                      Sonatype Pub Group
                    </div>
                    <a
                      href={nexusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-accent-600 dark:text-accent-400 hover:underline font-mono mt-0.5 block truncate"
                    >
                      {nexusUrl}
                    </a>
                  </div>

                  {/* CI/CD Automation */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">CI/CD Engine</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                      Jenkins Pipeline
                    </div>
                    <a
                      href={jenkinsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-mono mt-0.5 block truncate"
                    >
                      {jenkinsUrl}
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Infrastructure Health</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  All Core Daemons Online
                </span>
              </div>
            </div>
          ) : (
            /* Developer Quick Actions Card */
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Developer Guidelines &amp; Quick Links
                  </h3>
                  <Link
                    href="/guidelines"
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View Guidelines →
                  </Link>
                </div>

                <div className="space-y-3 mt-4 text-xs">
                  <Link
                    href="/miniapps/register"
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-center justify-between transition-colors group block"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        1. Register MiniApp Package
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Define basic info, team telegram chat, and upload your Flutter or Web package.
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href="/capabilities"
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex items-center justify-between transition-colors group block"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        2. Propose System Capabilities
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Request high-risk device capabilities (Camera, Location, Biometrics) with justification.
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
                <span>SuperApp Platform SDK Compliance: Version 1.0.0</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DEVELOPER TABLE: My MiniApps Lifecycle Table (Manager view only) */}
      {/* ------------------------------------------------------------- */}
      {isManager && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                My MiniApps Lifecycle
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Status of your submitted packages, automated security scans, and build revisions.
              </p>
            </div>
            <Link
              href="/miniapps"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 inline-flex items-center gap-1.5"
            >
              <span>View All MiniApps</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {miniAppsList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No MiniApps Registered Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Get started by registering your Flutter or Web MiniApp into the SuperApp ecosystem.
              </p>
              <Link
                href="/miniapps/register"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm"
              >
                Register MiniApp
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-4">MiniApp</th>
                    <th className="py-3 px-4">App ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {miniAppsList.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {app.name}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{app.description || 'No description'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {app.appId || app.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {app.type || 'FLUTTER_PACKAGE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {app.version || 'v1.0.0'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                            app.status === 'APPROVED' || app.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : app.status === 'IN_REVIEW' || app.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {app.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/miniapps/${app.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-block"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
