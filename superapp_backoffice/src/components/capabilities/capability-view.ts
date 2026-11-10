'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';

/**
 * Who is looking at the Capabilities pages:
 * - decider: approves or rejects requests (Super Admin)
 * - overseer: follows every request, cannot change any (regulatory admin)
 * - requester: asks for capabilities for their own mini apps (developer)
 */
export type CapabilityAudience = 'decider' | 'overseer' | 'requester';

export interface CapabilityView {
  audience: CapabilityAudience;
  canSync: boolean;
  canEditCatalog: boolean;
  canRequest: boolean;
  canReview: boolean;
  canApprove: boolean;
  canSeeRequests: boolean;
  text: {
    subtitle: string;
    requestsTab: string;
    requestButton: string;
    requestChangeButton: string;
    appsUsingIt: string;
  };
}

const TEXT: Record<CapabilityAudience, CapabilityView['text']> = {
  decider: {
    subtitle: 'Decide capability requests and keep the Super App catalog in sync.',
    requestsTab: 'Requests',
    requestButton: 'Propose Capability',
    requestChangeButton: 'Propose Revision',
    appsUsingIt: 'Associated MiniApps',
  },
  overseer: {
    subtitle:
      'Follow the capabilities mini apps use and every request for a new one. Super Admins approve or reject requests.',
    requestsTab: 'All requests',
    requestButton: 'Propose Capability',
    requestChangeButton: 'Propose Revision',
    appsUsingIt: 'Associated MiniApps',
  },
  requester: {
    subtitle: 'Device features your mini app can call through the SDK. Missing one? Request it.',
    requestsTab: 'My requests',
    requestButton: 'Request a capability',
    requestChangeButton: 'Request a change',
    appsUsingIt: 'Your mini apps using it',
  },
};

/**
 * The Capabilities view for the signed-in user, decided by permissions only
 * (never by role name), so a custom role with the same permissions gets the
 * same view.
 */
export function useCapabilityView(): CapabilityView {
  const { can } = useAuth();
  const canReview = can('permission_proposal:review');
  const canApprove = can('permission_proposal:approve');
  const canRequest = can('permission_proposal:create');
  const canSeeRequests = can('permission_proposal:read');
  const canManage = can('permission:manage');

  return useMemo(() => {
    const audience: CapabilityAudience =
      canReview || canApprove ? 'decider' : canSeeRequests && !canRequest ? 'overseer' : 'requester';
    return {
      audience,
      canSync: canManage,
      canEditCatalog: canManage,
      canRequest,
      canReview,
      canApprove,
      canSeeRequests,
      text: TEXT[audience],
    };
  }, [canReview, canApprove, canRequest, canSeeRequests, canManage]);
}
