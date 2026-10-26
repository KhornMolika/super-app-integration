"use client";

import { BackendServiceOfflineNotice } from '@/components/ui/BackendServiceOfflineNotice';
import {
  DashboardHeader,
  DashboardMetricsGrid,
  DashboardChartsSection,
  OrganizationsOverviewCard,
  DashboardInfrastructureCard,
  DeveloperQuickActionsCard,
  DeveloperMiniAppsTable,
  useDashboardData,
} from '@/components/dashboard';

export default function Dashboard() {
  const {
    isManager,
    can,
    metrics,
    miniAppsList,
    storageInfo,
    telegramInfo,
    isBackendDown,
    urls,
    isTelegramConnected,
    myPendingAppsCount,
    myPublishedAppsCount,
    activityData,
    donutTabs,
    orgStats,
    myOrganization,
    fetchMetrics,
  } = useDashboardData();

  return (
    <div className="w-full min-w-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
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
      <DashboardHeader
        isManager={isManager}
        pendingReviews={metrics.pendingReviews}
        isTelegramConnected={isTelegramConnected}
        canCreateMiniApp={can('miniapp:create')}
        canReviewPending={can('permission_proposal:read')}
      />

      {/* Tier 1: High-level platform KPIs */}
      <DashboardMetricsGrid
        isManager={isManager}
        metrics={metrics}
        miniAppsCount={miniAppsList.length}
        myPendingAppsCount={myPendingAppsCount}
        myPublishedAppsCount={myPublishedAppsCount}
        isTelegramConnected={isTelegramConnected}
        telegramUsername={telegramInfo?.user?.telegramUsername}
        canReadUsers={can('user:read')}
      />

      {/* Tier 2: Interactive visual analytics */}
      <DashboardChartsSection
        isManager={isManager}
        activityData={activityData}
        donutTabs={donutTabs}
      />

      {/* Tier 3: Regulatory Authorities & Infra / Developer Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <OrganizationsOverviewCard
            organizations={orgStats}
            totalOrganizations={metrics.totalOrganizations || orgStats.length}
            isManager={isManager}
            myOrganization={myOrganization}
          />
        </div>

        <div className="lg:col-span-6 flex flex-col">
          {!isManager ? (
            <DashboardInfrastructureCard
              storageLicenseType={storageInfo?.licenseType}
              storageEndpoint={urls.storageEndpoint}
              botUsername={urls.botUsername}
              botUrl={urls.botUrl}
              nexusUrl={urls.nexusUrl}
              jenkinsUrl={urls.jenkinsUrl}
            />
          ) : (
            <DeveloperQuickActionsCard />
          )}
        </div>
      </div>

      {/* Tier 4: Developer table */}
      {isManager && <DeveloperMiniAppsTable miniAppsList={miniAppsList} />}
    </div>
  );
}
