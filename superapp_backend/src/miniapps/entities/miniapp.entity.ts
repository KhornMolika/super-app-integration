import {
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
import { User } from '../../access-control/entities/user.entity';
import { MiniAppCollaborator } from './miniapp-collaborator.entity';
import { MiniAppIssue } from './miniapp-issue.entity';
import { MiniAppVersion } from './miniapp-version.entity';
import { MiniAppBuild } from './miniapp-build.entity';
import { MiniAppLegal } from './miniapp-legal.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Organization } from '../../organizations/entities/organization.entity';

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
    nullable: true,
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
    default: MiniAppLifecycleStatus.DRAFT,
  })
  lifecycleStatus!: string;

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

  @ManyToOne(() => User, (user) => user.ownedMiniApps, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

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

  @Column({ type: 'jsonb', nullable: true })
  pendingRevision?: any;

  @Column({ nullable: true })
  currentReleaseVersion?: string;

  @Column({ nullable: true })
  activeTestVersion?: string;

  @Column({ nullable: true })
  draftVersion?: string;

  // Pipeline state for build and validation execution
  @Column({ type: 'varchar', nullable: true, default: 'PENDING' })
  validationStatus?: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  validationStages?: any;

  @Column({ type: 'jsonb', nullable: true })
  validationReport?: any;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: any;

  @Column({ type: 'varchar', nullable: true, default: 'IDLE' })
  buildStatus?: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  buildStages?: any;

  @Column({ type: 'text', nullable: true })
  buildError?: string;

  @OneToMany(() => MiniAppCollaborator, (collab) => collab.miniApp, {
    cascade: true,
  })
  collaborators!: MiniAppCollaborator[];

  @OneToMany(() => MiniAppVersion, (version) => version.miniApp, {
    cascade: true,
    eager: true,
  })
  versions!: MiniAppVersion[];

  @OneToMany(() => MiniAppBuild, (build) => build.miniApp, {
    cascade: true,
  })
  builds!: MiniAppBuild[];

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
