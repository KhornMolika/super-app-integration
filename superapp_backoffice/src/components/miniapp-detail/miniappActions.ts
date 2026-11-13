/**
 * Which mini app actions the current user can take, in one place.
 *
 * The status banner shows the next step (submit, review, build, pass testing, activate,
 * resume, archive decision, restore). The header "..." menu holds the rest
 * (edit, sandbox, suspend, archive, delete). Each flag here matches the rule
 * the backend applies, so a button is only shown when it can work.
 */

import { MiniAppAccessLevel, hasAccess } from '@/lib/miniappAccess';

export type MiniAppPhase =
  | 'draft'
  | 'review'
  | 'approved'
  | 'building'
  | 'build-failed'
  | 'testing'
  /** The test build was verified (TEST_PASSED): next is Activate. */
  | 'test-passed'
  | 'live'
  | 'suspended'
  | 'archived';

export interface MiniAppActionSubject {
  status?: string;
  availabilityStatus?: string;
  ownerId?: string;
  buildStatus?: string;
  pendingRevision?: unknown;
  archiveRequest?: unknown;
  /** Security scan result (the pending revision's, when there is one). */
  validationStatus?: string;
}

export interface MiniAppActionUser {
  role?: string;
  userId?: string;
  can: (permission: string) => boolean;
  /**
   * The caller's access on this app (API `myAccess`). Each action needs both
   * the role permission and this level, as the API checks both. Missing reads
   * as VIEW: nothing beyond reading is offered until the API says otherwise.
   */
  access?: MiniAppAccessLevel;
}

export interface MiniAppAllowedActions {
  phase: MiniAppPhase;
  isLive: boolean;
  isOwner: boolean;
  archiveRequested: boolean;
  /** The security scan failed: it cannot be approved (Request Changes / Reject still can). */
  scanFailed: boolean;
  // Banner: next step
  submit: boolean;
  approve: boolean;
  requestChanges: boolean;
  reject: boolean;
  startTesting: boolean;
  retryBuild: boolean;
  /** TESTING -> TEST_PASSED (the test build works). */
  passTesting: boolean;
  /** TEST_PASSED -> production release build -> ACTIVE. */
  activate: boolean;
  publishRevision: boolean;
  discardRevision: boolean;
  resume: boolean;
  decideArchive: boolean;
  restore: boolean;
  // Header menu
  edit: boolean;
  sandbox: boolean;
  suspend: boolean;
  archive: boolean;
  requestArchive: boolean;
  delete: boolean;
  /** Archived apps only, Super Admin, App ID typed to confirm. */
  deletePermanently: boolean;
  rollback: boolean;
  downloadTestApk: boolean;
}

/** Never released: delete instead of archiving. */
const DELETABLE = ['DRAFT', 'REJECTED'];
const NEEDS_SUBMIT = ['DRAFT', 'REJECTED', 'CHANGES_REQUESTED'];
const IN_REVIEW = ['SUBMITTED', 'IN_REVIEW'];
const NOT_EDITABLE = ['ARCHIVED', 'BUILDING', 'SUBMITTED', 'IN_REVIEW'];

export function getMiniAppPhase(app: MiniAppActionSubject): MiniAppPhase {
  const status = (app.status || 'DRAFT').toUpperCase();
  const availability = (app.availabilityStatus || '').toUpperCase();
  if (status === 'ARCHIVED') return 'archived';
  if (availability === 'SUSPENDED') return 'suspended';
  if (NEEDS_SUBMIT.includes(status)) return 'draft';
  if (IN_REVIEW.includes(status)) return 'review';
  if (
    status === 'BUILD_FAILED' ||
    (app.buildStatus === 'FAILED' && status !== 'TESTING' && status !== 'TEST_PASSED' && status !== 'ACTIVE')
  ) {
    return 'build-failed';
  }
  if (status === 'BUILDING') return 'building';
  // ACTIVE, or older rows activated as APPROVED + PRODUCTION
  if (status === 'ACTIVE' || availability === 'PRODUCTION') return 'live';
  if (status === 'TESTING') return 'testing';
  if (status === 'TEST_PASSED') return 'test-passed';
  return 'approved';
}

export function getAllowedActions(
  app: MiniAppActionSubject,
  user: MiniAppActionUser,
): MiniAppAllowedActions {
  const status = (app.status || 'DRAFT').toUpperCase();
  const availability = (app.availabilityStatus || '').toUpperCase();
  const phase = getMiniAppPhase(app);
  const isSuper = user.role === 'SUPER_ADMIN';
  const isOwner = Boolean(user.userId && app.ownerId && user.userId === app.ownerId);
  const access = user.access ?? 'VIEW';
  // Role permission AND access level on this app (owner / collaborator role / org admin)
  const canEditApp = hasAccess(access, 'EDIT');
  const canMaintain = hasAccess(access, 'MAINTAIN');
  const canOwn = hasAccess(access, 'OWN');
  const isAppAdmin = hasAccess(access, 'ADMIN');
  const canUpdate = user.can('miniapp:update') && canEditApp;
  const canApprove = user.can('miniapp:approve') && isAppAdmin;
  const canReject = user.can('miniapp:reject') && isAppAdmin;
  const canSuspend = user.can('miniapp:suspend') && isAppAdmin;
  const isLive = phase === 'live';
  const archiveRequested = Boolean(app.archiveRequest);
  const hasRevision = Boolean(app.pendingRevision);
  const ownerOrAdmin = canOwn;
  // Same rule as the backend (assertSecurityScanNotFailed): no approval after a failed
  // scan. Request Changes and Reject stay, so the reviewer can send it back or turn it down.
  const scanFailed = (app.validationStatus || '').toUpperCase() === 'FAILED';

  return {
    phase,
    isLive,
    isOwner,
    archiveRequested,
    scanFailed,
    submit: phase === 'draft' && canUpdate && canMaintain,
    approve: phase === 'review' && canApprove && !scanFailed,
    requestChanges: phase === 'review' && canReject,
    reject: phase === 'review' && canReject,
    startTesting: phase === 'approved' && canApprove,
    retryBuild: phase === 'build-failed' && canApprove,
    passTesting: phase === 'testing' && canApprove,
    activate: phase === 'test-passed' && canApprove,
    publishRevision: isLive && hasRevision && canApprove && !scanFailed,
    discardRevision: isLive && hasRevision && canUpdate && canMaintain,
    resume: phase === 'suspended' && canSuspend,
    decideArchive: isSuper && archiveRequested && phase !== 'archived',
    restore: phase === 'archived' && isSuper,
    edit: canUpdate && !NOT_EDITABLE.includes(status),
    sandbox: phase !== 'archived' && phase !== 'draft',
    suspend:
      canSuspend &&
      (phase === 'live' || phase === 'testing' || phase === 'test-passed' || (phase === 'approved' && status === 'APPROVED') ||
        (phase === 'review' && availability === 'PRODUCTION')),
    archive: isSuper && phase !== 'archived' && !DELETABLE.includes(status),
    requestArchive: !isSuper && canSuspend && phase === 'suspended' && !archiveRequested,
    delete: DELETABLE.includes(status) && canUpdate && ownerOrAdmin,
    deletePermanently: phase === 'archived' && isSuper,
    rollback: canMaintain && user.can('miniapp:update') && phase !== 'archived',
    downloadTestApk: phase === 'testing' || phase === 'test-passed' || phase === 'live',
  };
}
