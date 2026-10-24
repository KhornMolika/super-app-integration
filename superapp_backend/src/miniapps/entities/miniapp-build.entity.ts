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

@Entity('miniapp_builds')
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

  @Column({ default: 'IDLE' })
  buildStatus!: string; // IDLE, BUILDING, COMPLETED, FAILED

  @Column({ default: 'PENDING' })
  validationStatus!: string; // PENDING, RUNNING, PASSED, FAILED

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  validationStages?: any;

  @Column({ type: 'jsonb', nullable: true })
  validationReport?: any;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: any;

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
