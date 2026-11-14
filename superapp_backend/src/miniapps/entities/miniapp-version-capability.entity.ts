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
import { MiniAppVersion } from './miniapp-version.entity';

export enum VersionCapabilityStatus {
  /** Declared by the developer, not reviewed yet (or changed since review). */
  REQUESTED = 'REQUESTED',
  /** Accepted by the Super Admin who approved or published this version. */
  APPROVED = 'APPROVED',
}

/**
 * One capability a mini app version asks for. Replaces the capabilities JSON
 * on mini_apps / pendingRevision / mini_app_versions.permissions, one row per
 * key per version, so each release keeps what it was approved with.
 *
 * capabilityKey is the declared key lowercased (matched case-insensitively
 * against capability_definitions.key, no FK: unknown keys are allowed and
 * stay disabled, see the master plan section 4). declaration keeps the entry
 * exactly as declared, so API responses can be rebuilt unchanged.
 */
@Entity('mini_app_version_capabilities')
@Index('UQ_mini_app_version_capabilities_version_key', ['versionId', 'capabilityKey'], { unique: true })
export class MiniAppVersionCapability {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  miniAppId!: string;

  @ManyToOne(() => MiniApp, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'miniAppId' })
  miniApp?: MiniApp;

  @Column({ type: 'uuid' })
  versionId!: string;

  @ManyToOne(() => MiniAppVersion, (v) => v.capabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'versionId' })
  version?: MiniAppVersion;

  @Column({ type: 'varchar', length: 100 })
  capabilityKey!: string;

  @Column({ default: false })
  required!: boolean;

  @Column({ type: 'text', nullable: true })
  purpose?: string | null;

  /** The entry as declared: a key string or { type, purpose, required, ... }. */
  @Column({ type: 'jsonb' })
  declaration!: any;

  /** Order in the declared list. */
  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({ type: 'varchar', length: 20, default: VersionCapabilityStatus.REQUESTED })
  status!: VersionCapabilityStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedById?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
