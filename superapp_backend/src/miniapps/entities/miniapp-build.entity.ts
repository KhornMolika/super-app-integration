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

/**
 * One test or release build run for a mini app. Scan results live in
 * mini_app_scans. Written by the `mini_app_build_sync` trigger (migration
 * CreateMiniAppScans) whenever the legacy build columns on mini_apps change,
 * until the writers move here.
 */
@Entity('mini_app_builds')
export class MiniAppBuild {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  miniAppId!: string;

  @ManyToOne(() => MiniApp, (miniApp) => miniApp.builds, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  versionId?: string;

  @ManyToOne(() => MiniAppVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'versionId' })
  versionRelation?: MiniAppVersion;

  @Column({ nullable: true })
  version?: string;

  /** debug (test build) or release; null when not known (legacy rows). */
  @Column({ type: 'varchar', nullable: true })
  buildType?: 'debug' | 'release' | null;

  @Column({ default: 'IDLE' })
  buildStatus!: string; // IDLE, QUEUED, BUILDING, COMPLETED, FAILED

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  buildStages?: any;

  @Column({ type: 'text', nullable: true })
  buildError?: string;

  @Column({ nullable: true })
  jenkinsJobUrl?: string;

  @Column({ nullable: true })
  actorId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  toJSON() {
    const clone = { ...this };
    delete (clone as any).miniApp;
    return clone;
  }
}
