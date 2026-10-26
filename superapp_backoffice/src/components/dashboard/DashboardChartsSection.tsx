"use client";

import React from 'react';
import ActivityTrendChart from './ActivityTrendChart';
import DistributionDonutChart from './DistributionDonutChart';
import { DashboardChartsSectionProps } from './types';

export default function DashboardChartsSection({
  isManager,
  activityData,
  donutTabs,
}: DashboardChartsSectionProps) {
  return (
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
  );
}
