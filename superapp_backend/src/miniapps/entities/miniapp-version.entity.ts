import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MiniApp } from './miniapp.entity';

/**
 * Version-Level Lifecycle Status Taxonomy (MiniAppVersion Entity)
 */
export enum MiniAppVersionStatus {
  /** Staged new version in active development or awaiting review. */
  DRAFT = 'DRAFT',

  /** Active test version deployed in sandbox for QA validation and regression verification. */
  TESTING = 'TESTING',

  /** Current live production version published to end users in the SuperApp catalog. */
  ACTIVE = 'ACTIVE',

  /** Prior live production release displaced by a newly published active version. Preserved for instant rollback capability. */
  PREVIOUS = 'PREVIOUS',

  /** Deprecated version scheduled for end-of-life / sunset. Preserved for historical traceability. */
  DEPRECATED = 'DEPRECATED',
}

@Entity('mini_app_versions')
export class MiniAppVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  miniAppId!: string;

  @ManyToOne(() => MiniApp, (miniApp) => miniApp.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column()
  version!: string;

  @Column({ default: MiniAppVersionStatus.DRAFT })
  status!: string; // ACTIVE, TESTING, PREVIOUS, DEPRECATED, DRAFT

  @Column({ nullable: true })
  gitRef?: string;

  @Column({ nullable: true })
  packageName?: string;

  @Column({ nullable: true })
  sourceType?: string; // GIT, ARTIFACT, WEBVIEW

  @Column({ nullable: true })
  saVersion?: string;

  @Column({ type: 'text', nullable: true })
  changelog?: string;

  @Column({ type: 'text', nullable: true })
  artifactUrl?: string;

  @Column({ nullable: true })
  apkSize?: string;

  @Column({ nullable: true })
  checksum?: string;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt?: Date;

  @Column({ nullable: true })
  releasedBy?: string;

  @Column({ type: 'int', nullable: true })
  buildNumber?: number;

  @Column({ nullable: true })
  jenkinsJobUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  integrationConfig?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  permissions?: string[];

  /**
   * DRAFT row of a live app: the whole staged revision (branding, legal,
   * integration, scan state). Mirrors mini_apps.pendingRevision until that
   * column goes (step 3b). Never serialized: it can hold integration secrets.
   */
  @Column({ type: 'jsonb', nullable: true })
  revision?: Record<string, any> | null;

  /** The revision's review state: IN_REVIEW, DRAFT (changes requested), TESTING, ... */
  @Column({ type: 'varchar', length: 30, nullable: true })
  reviewStatus?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  toJSON() {
    const clone = { ...this };
    delete (clone as any).miniApp;
    delete (clone as any).revision;
    return clone;
  }
}
