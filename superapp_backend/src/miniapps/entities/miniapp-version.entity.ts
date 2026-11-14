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
import type { MiniAppCapabilityDeclaration } from './miniapp.entity';
import type { IntegrationConfig } from '../integration-config';

/**
 * Version-Level Lifecycle Status Taxonomy (MiniAppVersion Entity)
 */
export enum MiniAppVersionStatus {
  /*
   * Stages of the version being worked on (see status/app-status.ts,
   * VersionStage): an unreleased app's row, or a live app's revision row.
   */
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
  /** In the Super App test build, with testers. */
  TESTING = 'TESTING',
  TEST_PASSED = 'TEST_PASSED',

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
  integrationConfig?: IntegrationConfig | null;

  /** This version's Home widget; null = none. */
  @Column({ type: 'jsonb', nullable: true })
  homeWidget?: Record<string, any> | null;

  /** What this version asks for, one row per capability (loaded with the version). */
  @OneToMany(() => MiniAppVersionCapability, (c) => c.version, { eager: true })
  capabilityRows?: MiniAppVersionCapability[];

  /**
   * The capabilities as declared, in order (each row's declaration). Not a
   * column: filled after load from capabilityRows. Same list as
   * MiniApp.capabilities for the version an app serves.
   */
  capabilities?: MiniAppCapabilityDeclaration[];

  /** API name of `capabilities` (the old column); kept so responses do not change. */
  permissions?: MiniAppCapabilityDeclaration[];

  /**
   * DRAFT row of a live app: the whole staged revision (branding, legal,
   * integration, scan state); MiniApp.pendingRevision is filled from it.
   * Never serialized: it can hold integration secrets.
   */
  @Column({ type: 'jsonb', nullable: true })
  revision?: Record<string, any> | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @AfterLoad()
  loadPermissions(): void {
    if (!Array.isArray(this.capabilityRows)) return;
    this.capabilities = [...this.capabilityRows]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((c) => c.declaration);
    this.permissions = this.capabilities;
  }

  toJSON() {
    const clone = { ...this };
    delete (clone as any).miniApp;
    delete (clone as any).capabilityRows;
    delete (clone as any).capabilities; // sent as permissions
    delete (clone as any).revision;
    return clone;
  }
}
