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

export enum MiniAppLifecycleStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  TERMINATED = 'TERMINATED',
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
