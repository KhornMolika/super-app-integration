import {
  AfterLoad,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MiniApp } from './miniapp.entity';
import { MiniAppVersionCapability } from './miniapp-version-capability.entity';

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

  @Column({ type: 'text', nullable: true })
  changelog?: string;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt?: Date;

  @Column({ nullable: true })
  releasedBy?: string;

  /** How this version runs: WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  integrationMethod?: string | null;

  /** This version's integration (URL, package, SDK, deep link). Phones get the live one. */
  @Column({ type: 'jsonb', nullable: true })
  integrationConfig?: Record<string, any> | null;

  /** This version's Home widget; null = none. */
  @Column({ type: 'jsonb', nullable: true })
  homeWidget?: Record<string, any> | null;

  /** What this version asks for, one row per capability (loaded with the version). */
  @OneToMany(() => MiniAppVersionCapability, (c) => c.version, { eager: true })
  capabilities?: MiniAppVersionCapability[];

  /**
   * The capabilities as declared, in order. Not a column: filled after load
   * from the capability rows (mini_app_version_capabilities).
   */
  permissions?: any[];

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

  @AfterLoad()
  loadPermissions(): void {
    if (!Array.isArray(this.capabilities)) return;
    this.permissions = [...this.capabilities]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((c) => c.declaration);
  }

  toJSON() {
    const clone = { ...this };
    delete (clone as any).miniApp;
    delete (clone as any).capabilities;
    delete (clone as any).revision;
    return clone;
  }
}
