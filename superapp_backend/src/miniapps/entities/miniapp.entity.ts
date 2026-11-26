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
import { MiniAppStatusEvent } from './miniapp-status-event.entity';
import { retirementStateOf } from '../status/status-events';
import { Notification } from '../../notifications/entities/notification.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import type { HomeWidget } from '../home-widget';
import { appIntegrationFields } from '../versions/integration-fields';
import type { IntegrationConfig } from '../integration-config';
import {
  AppStatus,
  appStatusOf,
  availabilityOf,
  lifecycleOf,
  revisionRowOf,
  servingRowOf,
  stageOfLifecycle,
} from '../status/app-status';

// =========================================================================
// ZONE 1: PRIMARY DOMAIN TYPES & CANONICAL ENUMS
// =========================================================================

export { AppStatus, VersionStage } from '../status/app-status';

/**
 * @deprecated Legacy monolithic status taxonomy (Phase 1-5).
 * - For application catalog presence (live on phones), use `AppStatus` (stored in mini_apps.status).
 * - For version review & governance stages, use `VersionStage` (stored in mini_app_versions.status).
 * - For transient CI/CD execution, inspect `MiniAppBuild.status` (in mini_app_builds).
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

  /** Permanently decommissioned and delisted from mobile catalog. Maintained as read-only historical audit record. */
  ARCHIVED = 'ARCHIVED',
}

/**
 * @deprecated Legacy availability taxonomy. Use `AppStatus` (mini_apps.status).
 */
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

/** A declared capability: a key string, or { type | key | name, required, purpose, ... }. */
export type MiniAppCapabilityDeclaration = string | Record<string, any>;

/** A staged change set of a live app (the fields it changes, e.g. integrationConfig). */
export type MiniAppRevision = Record<string, any>;

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

/**
 * Live on phones (mini_apps.status LIVE). An object without appStatus (a
 * plain object in older code or tests) is read from the old pair: ACTIVE, or
 * older rows activated as APPROVED + PRODUCTION, and not suspended.
 */
export function isMiniAppLive(app: {
  appStatus?: string | null;
  lifecycleStatus?: string | null;
  availabilityStatus?: string | null;
}): boolean {
  if (app.appStatus) return app.appStatus === AppStatus.LIVE;
  return (
    app.availabilityStatus !== 'SUSPENDED' &&
    (app.lifecycleStatus === 'ACTIVE' ||
      app.availabilityStatus === 'PRODUCTION')
  );
}

/**
 * Storage for transient legacy status writes in current process execution (Phase 6 compatibility shim).
 */
const writtenStatus = new WeakMap<object, { lifecycle?: string; availability?: string }>();

/** @deprecated Use app.appStatus directly. */
export function writtenLifecycle(app: object | null | undefined): string | undefined {
  return app ? writtenStatus.get(app)?.lifecycle : undefined;
}

@Entity('mini_apps')
export class MiniApp {
  // =========================================================================
  // ZONE 2: PERSISTENT DATABASE COLUMNS (mini_apps table)
  // =========================================================================

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

  @Column({ nullable: true })
  ownerId!: string;

  @Column({ nullable: true })
  supportEmail!: string;

  @Column({ nullable: true })
  alertTelegramChatId?: string;

  @Column({
    type: 'varchar',
    default: MiniAppTargetAudience.PUBLIC,
  })
  targetAudience!: string;

  /**
   * Can users get the app? DRAFT (never released), LIVE, SUSPENDED or
   * ARCHIVED (AppStatus). Column "status"; property name is appStatus because
   * `status` is the backward-compatible getter/setter shim.
   */
  @Column({ name: 'status', type: 'varchar', length: 20, default: AppStatus.DRAFT })
  appStatus!: string;

  /** The version phones get (its ACTIVE mini_app_versions row); null before the first release. */
  @Column({ type: 'uuid', nullable: true })
  liveVersionId?: string | null;

  /** The Super App test build (e.g. v0.2.1) this app was last put in. */
  @Column({ nullable: true })
  activeTestVersion?: string;

  /** WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK or DEEP_LINK (IntegrationMethod); decides shape of integrationConfig. */
  @Column({ nullable: true })
  integrationMethod!: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  securityChecks?: string[];

  /** Structured review feedback (rejection reason, category, remediation checklist, reviewer notes) */
  @Column({ type: 'jsonb', nullable: true })
  structuredFeedback?: {
    category?: string;
    checklist?: Array<{
      id: string;
      description: string;
      resolved?: boolean;
      resolutionNote?: string;
    }>;
    notes?: string;
    reviewerId?: string;
    createdAt?: string;
    targetFiles?: string[];
  } | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  // =========================================================================
  // ZONE 3: TYPEORM ENTITY RELATIONS
  // =========================================================================

  @ManyToOne(() => Organization, (org) => org.miniApps, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'organizationId' })
  organizationRelation?: Organization;

  @ManyToOne(() => Identity, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'ownerId' })
  owner!: Identity;

  @OneToOne(() => MiniAppLegal, (legal) => legal.miniApp, {
    cascade: true,
    eager: true,
  })
  legal?: MiniAppLegal;

  // No cascade: MiniAppVersionsService writes version rows. Saving an app
  // with a stale versions array must never overwrite them.
  @OneToMany(() => MiniAppVersion, (version) => version.miniApp, {
    eager: true,
  })
  versions!: MiniAppVersion[];

  @OneToMany(() => MiniAppBuild, (build) => build.miniApp, {
    cascade: true,
  })
  builds!: MiniAppBuild[];

  @OneToMany(() => MiniAppScan, (scan) => scan.miniApp)
  scans!: MiniAppScan[];

  @OneToMany(() => MiniAppCollaborator, (collab) => collab.miniApp, {
    cascade: true,
  })
  collaborators!: MiniAppCollaborator[];

  @OneToMany(() => MiniAppIssue, (issue) => issue.miniApp, {
    cascade: true,
    eager: true,
  })
  issues!: MiniAppIssue[];

  @OneToMany(() => Notification, (notification) => notification.miniApp, {
    cascade: true,
  })
  notifications!: Notification[];

  /** Every suspend, resume, archive request, decline, archive and restore, oldest first after load. */
  @OneToMany(() => MiniAppStatusEvent, (event) => event.miniApp, { eager: true })
  statusEvents?: MiniAppStatusEvent[];

  // =========================================================================
  // ZONE 4: VIRTUAL RUNTIME FIELDS & COMPUTED HELPERS (Not DB Columns)
  // =========================================================================

  /**
   * The version the app is on: its live (ACTIVE) row's version, else the
   * version being prepared. Filled after load from version rows.
   */
  currentReleaseVersion?: string;

  /**
   * Stage of the version being worked on (DRAFT ... TEST_PASSED):
   * an unreleased app's row, or a live app's revision row; null when nothing in progress.
   */
  versionStage?: string | null;

  /**
   * The staged revision of a live app. Lives on mini_app_versions.revision.
   */
  pendingRevision?: MiniAppRevision | null;

  /**
   * What the app asks for: capabilities of the version it serves.
   */
  capabilities!: MiniAppCapabilityDeclaration[];

  /**
   * Active integration config belonging to the version the app serves.
   */
  integrationConfig!: IntegrationConfig | null;

  /** Home widget the app declares for the Widget Slot; null = no widget. */
  homeWidget?: HomeWidget | null;

  verificationToken?: string | null;

  isDomainVerified!: boolean;

  domainVerifiedAt?: Date | null;

  /** Set while app is SUSPENDED or ARCHIVED (replayed from statusEvents). */
  suspension?: MiniAppSuspension | null;

  /** An ADMIN requested archive; cleared on archive/decline. */
  archiveRequest?: MiniAppArchiveRequest | null;

  /*
   * Latest scan and build runs filled by MiniAppRunsService.attach().
   */
  validationStatus?: string;
  validationStages?: Record<string, any> | null;
  validationReport?: Record<string, any> | null;
  validationErrors?: any[] | Record<string, any> | null;
  buildStatus?: string;
  buildStages?: Record<string, any> | null;
  buildError?: string | null;

  /**
   * Fills pendingRevision, versionStage, integration, and capabilities
   * from the eager versions (revisionRowOf / servingRowOf).
   */
  @AfterLoad()
  loadPendingRevision(): void {
    if (Array.isArray(this.statusEvents)) {
      const state = retirementStateOf(this.statusEvents);
      if (this.suspension === undefined) this.suspension = state.suspension;
      if (this.archiveRequest === undefined) this.archiveRequest = state.archiveRequest;
    }
    if (!Array.isArray(this.versions)) return;
    const rows = [...this.versions].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    const working = revisionRowOf(rows);
    const activeRow = rows.find((r) => r.status === 'ACTIVE');
    if (this.pendingRevision === undefined) {
      this.pendingRevision = working?.revision ?? null;
    }
    if (this.versionStage === undefined) {
      this.versionStage = working?.status ?? (activeRow ? 'ACTIVE' : null);
    }
    const serving = servingRowOf(rows);
    if (serving && this.currentReleaseVersion === undefined) this.currentReleaseVersion = serving.version;
    if (serving && this.integrationConfig === undefined) {
      const f = appIntegrationFields(serving.integrationConfig);
      this.integrationConfig = f.integrationConfig;
      this.verificationToken = f.verificationToken ?? undefined;
      this.isDomainVerified = Boolean(f.isDomainVerified);
      this.domainVerifiedAt = (f.domainVerifiedAt as Date) ?? undefined;
    }
    if (serving && this.homeWidget === undefined) {
      this.homeWidget = (serving.homeWidget as HomeWidget | null) ?? null;
    }
    if (this.capabilities === undefined) {
      this.capabilities = Array.isArray(serving?.capabilityRows)
        ? [...serving!.capabilityRows]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((c) => c.declaration)
        : [];
    }
  }

  /** Serializes canonical entity fields while preserving backward-compatible status aliases. */
  toJSON() {
    return {
      ...this,
      lifecycleStatus: this.lifecycleStatus,
      availabilityStatus: this.availabilityStatus,
    };
  }

  // =========================================================================
  // ZONE 5: DEPRECATED BACKWARD-COMPATIBILITY SHIMS (Legacy Ph 1-5 Emulation)
  // =========================================================================

  /**
   * @deprecated Legacy monolithic lifecycle getter/setter.
   * - Read: computed from `appStatus`, `versionStage`, and latest `buildStatus`.
   * - Write: sets `appStatus` and working `versionStage`.
   * Migrate backend callers to write directly to `app.appStatus` and `version.status`.
   */
  get lifecycleStatus(): string {
    return (
      writtenStatus.get(this)?.lifecycle ??
      lifecycleOf({
        appStatus: this.appStatus,
        stage: this.versionStage,
        everLive: this.everLive(),
        buildStatus: this.buildStatus,
      })
    );
  }
  set lifecycleStatus(value: string) {
    this.writeStatus({ lifecycle: value });
  }

  /**
   * @deprecated Legacy availability getter/setter.
   * Computed from `appStatus`. Migrate callers to `app.appStatus`.
   */
  get availabilityStatus(): string {
    return writtenStatus.get(this)?.availability ?? availabilityOf(this.appStatus);
  }
  set availabilityStatus(value: string) {
    this.writeStatus({ availability: value });
  }

  /**
   * @deprecated Alias for legacy `lifecycleStatus`.
   */
  get status(): string {
    return this.lifecycleStatus;
  }
  set status(val: string) {
    this.lifecycleStatus = val;
  }

  /** A version of this app was released (it has, or had, a live row). */
  private everLive(): boolean {
    return (
      Boolean(this.liveVersionId) ||
      (Array.isArray(this.versions) && this.versions.some((v) => v?.status === 'ACTIVE'))
    );
  }

  /**
   * Translates legacy lifecycle/availability writes into modern appStatus & versionStage.
   */
  private writeStatus(patch: { lifecycle?: string; availability?: string }): void {
    const lifecycleBefore = this.lifecycleStatus;
    const availabilityBefore = this.availabilityStatus;
    const next = { ...(writtenStatus.get(this) ?? {}), ...patch };
    writtenStatus.set(this, next);
    this.appStatus = appStatusOf(next.lifecycle ?? lifecycleBefore, next.availability ?? availabilityBefore);
    if (patch.lifecycle !== undefined && !this.everLive()) {
      const stage = stageOfLifecycle(patch.lifecycle);
      if (stage && stage !== 'ACTIVE') this.versionStage = stage;
    }
    // A save then always writes a row so subscribers see it
    this.updatedAt = new Date();
  }
}
