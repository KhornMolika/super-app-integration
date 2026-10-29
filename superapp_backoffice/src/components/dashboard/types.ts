import { ActivityDataPoint } from './ActivityTrendChart';
import { DonutTab, DonutSegment } from './DistributionDonutChart';

export type { ActivityDataPoint, DonutTab, DonutSegment };

export interface OrgStatItem {
  id: string;
  name: string;
  code?: string;
  parentAuthority?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  miniAppsCount: number;
}

export interface DashboardMetrics {
  totalMiniApps: number;
  pendingReviews: number;
  supportedPermissions: number;
  superAppTestVersion: string;
  officialReleaseVersion: string;
  totalUsers: number;
  totalOrganizations: number;
  developerCount: number;
  adminCount: number;
  pendingUsersCount: number;
}

export interface StorageInfo {
  configured: boolean;
  licenseType: string;
  endpoint: string;
}

export interface TelegramInfo {
  isConnected?: boolean;
  botUsername?: string;
  user?: {
    isConnected?: boolean;
    telegramUsername?: string;
    telegramUserId?: string;
    [key: string]: any;
  };
}

export interface DashboardInfrastructureUrls {
  nexusUrl: string;
  jenkinsUrl: string;
  botUsername: string;
  botUrl: string;
  storageEndpoint: string;
}

export interface DashboardHeaderProps {
  isManager: boolean;
  pendingReviews: number;
  isTelegramConnected: boolean;
  canCreateMiniApp: boolean;
  canReviewPending: boolean;
}

export interface DashboardMetricsGridProps {
  isManager: boolean;
  metrics: DashboardMetrics;
  miniAppsCount: number;
  myPendingAppsCount: number;
  myPublishedAppsCount: number;
  isTelegramConnected: boolean;
  telegramUsername?: string;
  canReadUsers: boolean;
}

export interface DashboardChartsSectionProps {
  isManager: boolean;
  activityData: ActivityDataPoint[];
  donutTabs: DonutTab[];
}

export interface DashboardInfrastructureCardProps {
  storageLicenseType?: string;
  storageEndpoint: string;
  botUsername: string;
  botUrl: string;
  nexusUrl: string;
  jenkinsUrl: string;
}

export interface DeveloperMiniAppsTableProps {
  miniAppsList: any[];
}
