import {
  AfterLoad,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Identity } from '../../identities/entities/identity.entity';
import { MiniAppCollaborator } from './miniapp-collaborator.entity';
import { MiniAppIssue } from './miniapp-issue.entity';
import { MiniAppVersion } from './miniapp-version.entity';
import { MiniAppBuild } from './miniapp-build.entity';
import { MiniAppScan } from './miniapp-scan.entity';
import { MiniAppLegal } from './miniapp-legal.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import type { HomeWidget } from '../home-widget';

/**
 * Application-Level Lifecycle & Governance Status Taxonomy (MiniApp Entity)
 */
export enum MiniAppLifecycleStatus {
  /** Under active development. Partner/creator is editing metadata, assets, and permissions. Physical deletion permitted for SuperAdmin or owner. */
  DRAFT = 'DRAFT',

  /** Submitted for automated validation (CI Gate 1). Automated security scanners, dependency checks, and domain verifications are executing. */
  SUBMITTED = 'SUBMITTED',

  /** Passed CI Gate 1 automated scans. Awaiting SuperAdmin manual governance, capability compliance, and legal sign-off. */
  IN_REVIEW = 'IN_REVIEW',

  /** SuperAdmin approval granted (milestone status). */
  APPROVED = 'APPROVED',

  /** SuperAdmin approved app for Stage 1 sandbox & test build compilation. */
  APPROVED_FOR_TESTING = 'APPROVED_FOR_TESTING',

  /** Legacy / generic compilation state indicator. */
  BUILDING = 'BUILDING',

  /** Stage 1 Test Build compiling via Jenkins/Fastlane (generating app-debug.apk and sandbox container). */
  BUILDING_STAGE_1 = 'BUILDING_STAGE_1',

  /** Active QA validation in mobile sandbox and test device environments. Defects found trigger return to DRAFT. */
  TESTING = 'TESTING',

  /** Passed all QA test scenarios and device verification. Approved for CI Gate 2 production release. */
  TEST_PASSED = 'TEST_PASSED',

  /** Compiling production release signed APK and release asset bundles (CI Gate 2). */
  BUILDING_STAGE_2 = 'BUILDING_STAGE_2',

  /** Live in production SuperApp mobile catalog. Visible to end users according to department/sharing scope. */
  ACTIVE = 'ACTIVE',

  /** Temporarily frozen or emergency hidden from mobile catalog (e.g. policy breach, maintenance, or security incident). */
  SUSPENDED = 'SUSPENDED',

  /** Terminally rejected during governance review. Physical deletion allowed by SuperAdmin or creator, or creator can address rejection and re-apply. */
  REJECTED = 'REJECTED',

  /** Non-terminal governance feedback from SuperAdmin. Partner updates application specifications and returns to DRAFT. */
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',

  /** Permanently decommissioned and delisted from mobile catalog. Maintained as read-only historical audit record. Replaces TERMINATED. */
  ARCHIVED = 'ARCHIVED',

  /** Backwards-compatibility alias for ARCHIVED. */
  TERMINATED = 'ARCHIVED',
}

export enum MiniAppAvailabilityStatus {
  TESTING = 'TESTING',
  PRODUCTION = 'PRODUCTION',
  SUSPENDED = 'SUSPENDED',
}

export enum MiniAppTargetAudience {
  PUBLIC = 'PUBLIC',
  ALL_FSA_STAFF = 'ALL_FSA_STAFF',
  ORGANIZATION_ONLY = 'ORGANIZATION_ONLY',
}

export enum MiniAppSharingScope {
  GLOBAL = 'GLOBAL',
  RESTRICTED_DEPARTMENT = 'RESTRICTED_DEPARTMENT',
}

// Backwards-compatible status enum alias
export const MiniAppStatus = {
  ...MiniAppLifecycleStatus,
  ACTIVE: 'ACTIVE',
  BUILDING: 'BUILDING',
  TESTING: 'TESTING',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED',
};

export interface MiniAppSuspension {
  reason: string;
  suspendedById?: string;
  suspendedByName?: string;
  suspendedAt: string;
  /** Availability before the suspension, restored by Resume. */
  previousAvailability?: string;
  /** Set when the app was archived (reason kept in `reason`). */
  archivedAt?: string;
}

export interface MiniAppArchiveRequest {
  reason: string;
  requestedById?: string;
  requestedByName?: string;
  requestedAt: string;
}

/** Live in the catalog: ACTIVE, or older rows activated as APPROVED + PRODUCTION. */
export function isMiniAppLive(app: {
  lifecycleStatus?: string | null;
  availabilityStatus?: string | null;
}): boolean {
  return (
    app.availabilityStatus !== 'SUSPENDED' &&
    (app.lifecycleStatus === 'ACTIVE' ||
      app.availabilityStatus === 'PRODUCTION')
  );
}

@Entity('mini_apps')
export class MiniApp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  appId!: string;

  @Column({ unique: true, nullable: true })
  slug?: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  tagline!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'text', nullable: true })
  logo!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, (org) => org.miniApps, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'organizationId' })
  organizationRelation?: Organization;

  @Column({
    type: 'varchar',
    default: MiniAppSharingScope.GLOBAL,
  })
  sharingScope!: string;

  @Column({
    type: 'varchar',
    default: MiniAppTargetAudience.PUBLIC,
  })
  targetAudience!: string;

  @Column({
    type: 'varchar',
    default: MiniAppLifecycleStatus.DRAFT,
  })
  lifecycleStatus!: string;

  get status(): string {
    return this.lifecycleStatus;
  }
  set status(val: string) {
    this.lifecycleStatus = val;
  }

  @Column({
    type: 'varchar',
    default: MiniAppAvailabilityStatus.TESTING,
  })
  availabilityStatus!: string;

  @OneToOne(() => MiniAppLegal, (legal) => legal.miniApp, {
    cascade: true,
    eager: true,
  })
  legal?: MiniAppLegal;

  @ManyToOne(() => Identity, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'ownerId' })
  owner!: Identity;

  @Column({ nullable: true })
  ownerId!: string;

  @Column({ nullable: true })
  supportEmail!: string;

  @Column({ nullable: true })
  alertTelegramChatId?: string;

  @Column({ nullable: true })
  integrationMethod!: string; // WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK

  @Column({ type: 'jsonb', nullable: true })
  integrationConfig!: any;

  // The Home widget the app declares for the Widget Slot (shape depends on
  // integrationMethod, see HOME_WIDGET_FIELD); null = no Home widget.
  @Column({ type: 'jsonb', nullable: true })
  homeWidget?: HomeWidget | null;

  @Column({ nullable: true })
  verificationToken?: string;

  @Column({ default: false })
  isDomainVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  domainVerifiedAt?: Date;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  capabilities!: any[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  securityChecks?: string[];

  /**
   * The staged revision of a live app. Not a column: it lives on the app's
   * DRAFT version row (mini_app_versions.revision). Filled after load from
   * the eager versions (or MiniAppVersionsService.attachRevisions for query
   * builder lists); written with persistRevision after a save.
   * undefined = not loaded, null = none.
   */
  pendingRevision?: any;

  /** Set while availability is SUSPENDED (or the app is ARCHIVED). */
  @Column({ type: 'jsonb', nullable: true })
  suspension?: MiniAppSuspension | null;

  /** An ADMIN asked a SUPER_ADMIN to archive this app; cleared on archive/decline. */
  @Column({ type: 'jsonb', nullable: true })
  archiveRequest?: MiniAppArchiveRequest | null;

  @Column({ nullable: true })
  currentReleaseVersion?: string;

  @Column({ nullable: true })
  activeTestVersion?: string;

  @Column({ nullable: true })
  draftVersion?: string;

  /*
   * Latest scan and build runs, not columns: they live in mini_app_scans and
   * mini_app_builds. MiniAppRunsService.attach() fills them on loaded apps
   * (API responses keep these fields); writers record runs through
   * MiniAppRunsService (syncScan, recordBuild, ...).
   */
  validationStatus?: string;
  validationStages?: any;
  validationReport?: any;
  validationErrors?: any;
  buildStatus?: string;
  buildStages?: any;
  buildError?: string | null;

  @OneToMany(() => MiniAppCollaborator, (collab) => collab.miniApp, {
    cascade: true,
  })
  collaborators!: MiniAppCollaborator[];

  // No cascade: MiniAppVersionsService writes version rows. Saving an app
  // with a stale versions array must never overwrite them.
  @OneToMany(() => MiniAppVersion, (version) => version.miniApp, {
    eager: true,
  })
  versions!: MiniAppVersion[];

  /** Same rule as revisionRowOf() in versions/version-capabilities.ts. */
  @AfterLoad()
  loadPendingRevision(): void {
    if (this.pendingRevision !== undefined || !Array.isArray(this.versions)) return;
    const rows = [...this.versions].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    const live = rows.some((r) => r.status === 'ACTIVE');
    const row = rows.find((r) => r.status === 'DRAFT' || (!live && r.status === 'TESTING'));
    this.pendingRevision = row?.revision ?? null;
  }

  @OneToMany(() => MiniAppBuild, (build) => build.miniApp, {
    cascade: true,
  })
  builds!: MiniAppBuild[];

  @OneToMany(() => MiniAppScan, (scan) => scan.miniApp)
  scans!: MiniAppScan[];

  @OneToMany(() => MiniAppIssue, (issue) => issue.miniApp, {
    cascade: true,
    eager: true,
  })
  issues!: MiniAppIssue[];

  @OneToMany(() => Notification, (notification) => notification.miniApp, {
    cascade: true,
  })
  notifications!: Notification[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
