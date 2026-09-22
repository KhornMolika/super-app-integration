import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../access-control/entities/user.entity';
import { MiniAppActivity } from './miniapp-activity.entity';
import { MiniAppIssue } from './miniapp-issue.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export enum MiniAppStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('mini_apps')
export class MiniApp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  appId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  shortDescription!: string;

  @Column({ type: 'text', nullable: true })
  fullDescription!: string;

  @Column({ type: 'text', nullable: true })
  logo!: string;

  @Column({ nullable: true })
  category!: string;

  @Column({ nullable: true })
  organization?: string;

  @Column({ nullable: true })
  organizationCode?: string;

  @Column({ default: 'DRAFT' })
  status!: string;

  @Column({ nullable: true })
  termsUrl?: string;

  @Column({ type: 'text', nullable: true })
  termsDescription?: string;

  @Column({ nullable: true })
  privacyPolicyUrl?: string;

  @Column({ type: 'text', nullable: true })
  privacyPolicyDescription?: string;

  @Column({ nullable: true })
  ownerName!: string;

  @Column({ nullable: true })
  ownerEmail!: string;

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
  teamTelegramChatId?: string;

  @Column({ nullable: true })
  teamName!: string;

  @Column({ nullable: true })
  integrationMethod!: string; // WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK

  @Column({ type: 'jsonb', nullable: true })
  integrationConfig!: any;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: any;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  validationStages?: any;

  @Column({ type: 'jsonb', nullable: true })
  validationReport?: any;

  @Column({ default: 'PENDING' })
  validationStatus!: string; // PENDING, RUNNING, PASSED, FAILED

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  buildStages?: any;

  @Column({ nullable: true, default: 'IDLE' })
  buildStatus?: string; // IDLE, BUILDING, COMPLETED, FAILED

  @Column({ type: 'text', nullable: true })
  buildError?: string;

  @Column({ nullable: true })
  verificationToken?: string;

  @Column({ default: false })
  isDomainVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  domainVerifiedAt?: Date;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  permissions!: any[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  securityChecks?: string[];

  @Column({ type: 'jsonb', nullable: true })
  pendingRevision?: any;

  @Column({ nullable: true, default: '1.0.0' })
  version?: string;

  @Column({ nullable: true })
  currentReleaseVersion?: string;

  @Column({ nullable: true })
  activeTestVersion?: string;

  @Column({ nullable: true })
  draftVersion?: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  versionHistory?: {
    version: string;
    gitRef?: string;
    packageName?: string;
    sourceType?: 'GIT' | 'ARTIFACT' | 'WEBVIEW' | string;
    saVersion?: string;
    type: 'PRODUCTION' | 'TEST' | 'DRAFT';
    status:
      | 'ACTIVE'
      | 'TESTING'
      | 'PREVIOUS'
      | 'DEPRECATED'
      | 'SUPERSEDED'
      | 'ARCHIVED'
      | 'IN_REVIEW'
      | 'APPROVED'
      | 'DRAFT';
    changelog?: string;
    artifactUrl?: string;
    apkSize?: string;
    checksum?: string;
    releasedAt: string;
    releasedBy?: string;
    buildNumber?: number;
    jenkinsJobUrl?: string;
    integrationConfig?: Record<string, any>;
    permissions?: string[];
  }[];

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

  @OneToMany(() => MiniAppActivity, (activity) => activity.miniApp)
  activities!: MiniAppActivity[];
}

