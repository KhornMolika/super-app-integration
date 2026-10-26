import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  miniappsApi,
  permissionsApi,
  superAppApi,
  telegramApi,
  isBackendUnreachableError,
  unwrapData,
} from '@/api';
import { usersApi, User } from '@/api/users.api';
import { organizationsApi, Organization } from '@/api/organizations.api';
import {
  DashboardMetrics,
  StorageInfo,
  TelegramInfo,
  DashboardInfrastructureUrls,
} from '../types';
import {
  generateActivityTrend,
  generateDonutTabs,
  generateOrgStats,
  calculateUserCounts,
} from '../utils/analytics.utils';

export function useDashboardData() {
  const { can, role, user } = useAuth();
  const isManager = role === 'MA_DEVELOPER';

  const [metrics, setMetrics] = useState<DashboardMetrics>({
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
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(null);
  const [ecosystemData, setEcosystemData] = useState<any>(null);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
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
      const { devCount, admCount, pendingUserCount } = calculateUserCounts(rawUsers);

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
    } finally {
      setIsLoading(false);
    }
  }, [can]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, role]);

  // Derived ecosystem URLs
  const urls: DashboardInfrastructureUrls = useMemo(() => {
    const nexusUrl = ecosystemData?.integratedServices?.nexusRegistry?.url || 'http://localhost:8081';
    const jenkinsUrl = ecosystemData?.integratedServices?.jenkinsCiCd?.url || 'http://localhost:8085';
    const botUsername =
      telegramInfo?.botUsername || ecosystemData?.integratedServices?.telegramBot?.username || 'superapp_notification_bot';
    const botUrl = `https://t.me/${botUsername}`;
    const storageEndpoint =
      storageInfo?.endpoint || ecosystemData?.integratedServices?.minioStorage?.endpoint || 'localhost:9000';

    return {
      nexusUrl,
      jenkinsUrl,
      botUsername,
      botUrl,
      storageEndpoint,
    };
  }, [ecosystemData, telegramInfo, storageInfo]);

  const isTelegramConnected = Boolean(telegramInfo?.user?.isConnected || telegramInfo?.isConnected);

  // MA Developer specific counts
  const myPendingAppsCount = useMemo(() => {
    return miniAppsList.filter((a: any) => ['IN_REVIEW', 'SUBMITTED'].includes(a.status)).length;
  }, [miniAppsList]);

  const myPublishedAppsCount = useMemo(() => {
    return miniAppsList.filter((a: any) => ['APPROVED', 'PUBLISHED', 'ACTIVE'].includes(a.status)).length;
  }, [miniAppsList]);

  // Analytics datasets
  const activityData = useMemo(() => {
    return generateActivityTrend(miniAppsList);
  }, [miniAppsList]);

  const donutTabs = useMemo(() => {
    return generateDonutTabs(miniAppsList, usersList, can('user:read'));
  }, [miniAppsList, usersList, can]);

  const orgStats = useMemo(() => {
    return generateOrgStats(organizationsList, miniAppsList);
  }, [organizationsList, miniAppsList]);

  const myOrganization = useMemo(() => {
    if (!user?.organizationId) return null;
    return organizationsList.find((o) => o.id === user.organizationId) || null;
  }, [user, organizationsList]);

  return {
    isManager,
    can,
    user,
    role,
    metrics,
    miniAppsList,
    usersList,
    organizationsList,
    storageInfo,
    telegramInfo,
    ecosystemData,
    isBackendDown,
    isLoading,
    urls,
    isTelegramConnected,
    myPendingAppsCount,
    myPublishedAppsCount,
    activityData,
    donutTabs,
    orgStats,
    myOrganization,
    fetchMetrics,
  };
}
