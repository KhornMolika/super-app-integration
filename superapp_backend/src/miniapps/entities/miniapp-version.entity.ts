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

@Entity('miniapp_versions')
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

  @Column({ default: 'PRODUCTION' })
  type!: string; // PRODUCTION, TEST, DRAFT

  @Column({ default: 'DRAFT' })
  status!: string; // ACTIVE, TESTING, PREVIOUS, DEPRECATED, SUPERSEDED, ARCHIVED, IN_REVIEW, APPROVED, DRAFT

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
