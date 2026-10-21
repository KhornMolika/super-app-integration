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
import { MiniAppActivity } from './miniapp-activity.entity';
import { MiniAppIssue } from './miniapp-issue.entity';
import { MiniAppVersion } from './miniapp-version.entity';
import { MiniAppBuild } from './miniapp-build.entity';
import { MiniAppLegal } from './miniapp-legal.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export enum MiniAppStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
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

  @Column({ unique: true, nullable: true })
  slug?: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  shortDescription!: string;

  @Column({ type: 'text', nullable: true })
  fullDescription!: string;

  @Column({ type: 'text', nullable: true })
  logo!: string;

  @Column({ nullable: true })
  organization?: string;

  @Column({ nullable: true })
  organizationCode?: string;

  @Column({ default: 'DRAFT' })
  status!: string;

  @OneToOne(() => MiniAppLegal, (legal) => legal.miniApp, {
    cascade: true,
    eager: true,
  })
  legal?: MiniAppLegal;

  // Virtual accessors for legal & compliance terms delegating to MiniAppLegal
  get termsUrl(): string | undefined {
    return this.legal?.termsUrl;
  }
  set termsUrl(val: string | undefined) {
    if (!this.legal) {
      this.legal = new MiniAppLegal();
      this.legal.miniApp = this;
      this.legal.miniAppId = this.id;
    }
    this.legal.termsUrl = val;
  }

  get termsDescription(): string | undefined {
    return this.legal?.termsDescription;
  }
  set termsDescription(val: string | undefined) {
    if (!this.legal) {
      this.legal = new MiniAppLegal();
      this.legal.miniApp = this;
      this.legal.miniAppId = this.id;
    }
    this.legal.termsDescription = val;
  }

  get privacyPolicyUrl(): string | undefined {
    return this.legal?.privacyPolicyUrl;
  }
  set privacyPolicyUrl(val: string | undefined) {
    if (!this.legal) {
      this.legal = new MiniAppLegal();
      this.legal.miniApp = this;
      this.legal.miniAppId = this.id;
    }
    this.legal.privacyPolicyUrl = val;
  }

  get privacyPolicyDescription(): string | undefined {
    return this.legal?.privacyPolicyDescription;
  }
  set privacyPolicyDescription(val: string | undefined) {
    if (!this.legal) {
      this.legal = new MiniAppLegal();
      this.legal.miniApp = this;
      this.legal.miniAppId = this.id;
    }
    this.legal.privacyPolicyDescription = val;
  }

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

  // Virtual accessors for normalized user ownership and backwards compatibility
  get ownerEmail(): string | undefined {
    return this.owner?.email;
  }
  set ownerEmail(val: string | undefined) {
    if (this.owner && val) {
      this.owner.email = val;
    }
  }

  get ownerName(): string | undefined {
    return this.owner?.name;
  }
  set ownerName(val: string | undefined) {
    if (this.owner && val) {
      this.owner.name = val;
    }
  }

  get category(): string | undefined {
    return this.organization;
  }
  set category(val: string | undefined) {
    if (val && !this.organization) {
      this.organization = val;
    }
  }

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

  @OneToMany(() => MiniAppVersion, (version) => version.miniApp, {
    cascade: true,
    eager: true,
  })
  versions!: MiniAppVersion[];

  @OneToMany(() => MiniAppBuild, (build) => build.miniApp, {
    cascade: true,
  })
  builds!: MiniAppBuild[];

  // Virtual accessor for backwards compatibility with legacy versionHistory callers
  get versionHistory(): any[] {
    if (this.versions && Array.isArray(this.versions) && this.versions.length > 0) {
      return this.versions.map((v) => ({
        version: v.version,
        gitRef: v.gitRef,
        packageName: v.packageName,
        sourceType: v.sourceType,
        saVersion: v.saVersion,
        type: v.type,
        status: v.status,
        changelog: v.changelog,
        artifactUrl: v.artifactUrl,
        apkSize: v.apkSize,
        checksum: v.checksum,
        releasedAt: v.releasedAt
          ? typeof v.releasedAt === 'string'
            ? v.releasedAt
            : v.releasedAt.toISOString()
          : '',
        releasedBy: v.releasedBy,
        buildNumber: v.buildNumber,
        jenkinsJobUrl: v.jenkinsJobUrl,
        integrationConfig: v.integrationConfig,
        permissions: v.permissions,
      }));
    }
    return [];
  }
  set versionHistory(val: any[] | undefined) {
    if (Array.isArray(val)) {
      this.versions = val.map((item) => {
        const v = new MiniAppVersion();
        v.miniApp = this;
        v.miniAppId = this.id;
        v.version = item.version || '1.0.0';
        v.gitRef = item.gitRef;
        v.packageName = item.packageName;
        v.sourceType = item.sourceType;
        v.saVersion = item.saVersion;
        v.type = item.type || 'PRODUCTION';
        v.status = item.status || 'DRAFT';
        v.changelog = item.changelog;
        v.artifactUrl = item.artifactUrl;
        v.apkSize = item.apkSize;
        v.checksum = item.checksum;
        v.releasedAt = item.releasedAt ? new Date(item.releasedAt) : new Date();
        v.releasedBy = item.releasedBy;
        v.buildNumber = item.buildNumber;
        v.jenkinsJobUrl = item.jenkinsJobUrl;
        v.integrationConfig = item.integrationConfig;
        v.permissions = item.permissions;
        return v;
      });
    }
  }

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

