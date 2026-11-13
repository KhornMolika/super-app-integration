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

export type MiniAppScanScope = 'APP' | 'REVISION';
export type MiniAppScanStatus =
  'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED';

/**
 * One security scan run (Jenkins `miniapp-validation` or the local scanner) of
 * one version of a mini app. Kept per run, so the history stays and a failed
 * scan of a pending revision is never mistaken for the live version's result.
 *
 * Phase 1 of moving scan state off `mini_apps`: rows are written by the
 * `mini_app_scan_sync` trigger (migration CreateMiniAppScans) whenever the
 * legacy columns change, until the writers move here.
 */
@Entity('mini_app_scans')
@Index(['miniAppId', 'createdAt'])
export class MiniAppScan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  miniAppId!: string;

  @ManyToOne(() => MiniApp, (miniApp) => miniApp.scans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column({ type: 'uuid', nullable: true })
  versionId?: string | null;

  @ManyToOne(() => MiniAppVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'versionId' })
  versionRelation?: MiniAppVersion | null;

  /** Version label scanned (the revision's version for a REVISION scan). */
  @Column({ type: 'varchar', nullable: true })
  version?: string | null;

  /** APP: the app's own config. REVISION: a pending revision of a live app. */
  @Column({ type: 'varchar', default: 'APP' })
  scope!: MiniAppScanScope;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: MiniAppScanStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  stages!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  report?: any;

  @Column({ type: 'jsonb', nullable: true })
  errors?: any;

  /** Security checks this run was asked to perform. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  checks!: string[];

  /** Who started the run (null for rows written by the sync trigger). */
  @Column({ type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
