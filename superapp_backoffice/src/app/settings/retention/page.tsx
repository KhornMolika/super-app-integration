'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ArtifactRetentionCard, SettingsPageHeader } from '@/components/settings';

export default function StorageRetentionPage() {
  return (
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <div className="w-full min-w-0 space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
        <SettingsPageHeader
          section="Platform Infrastructure"
          title="Storage Retention & Cleanup Policies"
          description="Configure automated artifact lifecycle rules, scheduled background pruning for CI/CD test builds, and on-demand storage reclamation."
          badge={{ label: 'Super Admin Restricted', tone: 'emerald', pulse: true }}
        />

        {/* Main Content */}
        <ArtifactRetentionCard />
      </div>
    </ProtectedRoute>
  );
}

