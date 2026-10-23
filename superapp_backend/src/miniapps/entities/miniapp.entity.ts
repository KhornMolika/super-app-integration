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

  // Backwards compatibility for shortDescription & fullDescription
  get shortDescription(): string {
    return this.tagline;
  }
  set shortDescription(val: string) {
    this.tagline = val;
  }

  get fullDescription(): string {
    return this.description;
  }
  set fullDescription(val: string) {
    this.description = val;
  }

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

  // Backwards compatibility accessor for string organization and organizationCode
  get organization(): string | undefined {
    return this.organizationRelation?.name;
  }
  set organization(_val: string | undefined) {}

  get organizationCode(): string | undefined {
    return this.organizationRelation?.code;
  }
  set organizationCode(_val: string | undefined) {}

  get teamName(): string | undefined {
    return this.organizationRelation?.name || this.owner?.name;
  }
  set teamName(_val: string | undefined) {}

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

  // Backwards compatibility for status
  get status(): string {
    return this.lifecycleStatus;
  }
  set status(val: string) {
    if (val === 'ACTIVE' || val === 'PRODUCTION') {
      this.lifecycleStatus = MiniAppLifecycleStatus.APPROVED;
      this.availabilityStatus = MiniAppAvailabilityStatus.PRODUCTION;
    } else if (val === 'TESTING') {
      this.availabilityStatus = MiniAppAvailabilityStatus.TESTING;
    } else if (val === 'SUSPENDED') {
      this.availabilityStatus = MiniAppAvailabilityStatus.SUSPENDED;
    } else if (Object.values(MiniAppLifecycleStatus).includes(val as any)) {
      this.lifecycleStatus = val;
    } else {
      this.lifecycleStatus = val;
    }
  }

  @OneToOne(() => MiniAppLegal, (legal) => legal.miniApp, {
    cascade: true,
    eager: true,
  })
  legal?: MiniAppLegal;

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
  alertTelegramChatId?: string;

  get teamTelegramChatId(): string | undefined {
    return this.alertTelegramChatId;
  }
  set teamTelegramChatId(val: string | undefined) {
    this.alertTelegramChatId = val;
  }

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
  set category(val: string | undefined) {}

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

  // Backwards compatibility for permissions
  get permissions(): any[] {
    return this.capabilities || [];
  }
  set permissions(val: any[]) {
    this.capabilities = val;
  }

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

  // Transient pipeline state for build and validation execution (persisted to miniapp_builds)
  validationStatus?: string;
  validationStages?: any;
  validationReport?: any;
  validationErrors?: any;
  buildStatus?: string;
  buildStages?: any;
  buildError?: string;

  get version(): string | undefined {
    return this.currentReleaseVersion || this.draftVersion || '1.0.0';
  }
  set version(val: string | undefined) {
    this.draftVersion = val;
  }

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
}
