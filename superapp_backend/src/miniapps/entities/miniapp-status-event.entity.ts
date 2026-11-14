import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MiniApp } from './miniapp.entity';

/** What happened to a mini app's availability. */
export enum MiniAppStatusEventType {
  SUSPENDED = 'SUSPENDED',
  RESUMED = 'RESUMED',
  ARCHIVE_REQUESTED = 'ARCHIVE_REQUESTED',
  ARCHIVE_DECLINED = 'ARCHIVE_DECLINED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
}

/**
 * One suspend, resume, archive request, decline, archive or restore of a
 * mini app, with who did it and why (Phase 6f). The app's current
 * `suspension` and `archiveRequest` are read from these rows
 * (status/status-events.ts), so the whole history stays instead of only the
 * latest state.
 */
@Entity('mini_app_status_events')
@Index(['miniAppId', 'createdAt'])
export class MiniAppStatusEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  miniAppId!: string;

  @ManyToOne(() => MiniApp, (miniApp) => miniApp.statusEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'miniAppId' })
  miniApp?: MiniApp;

  @Column({ type: 'varchar', length: 30 })
  type!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  /** The acting user's id as the token gave it (no FK: the record outlives the user). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  actorId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  actorName?: string | null;

  /** SUSPENDED / ARCHIVED: the availability before, restored by Resume. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  previousAvailability?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  toJSON() {
    const clone = { ...this };
    delete (clone as any).miniApp;
    return clone;
  }
}
