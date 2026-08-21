import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../access-control/entities/user.entity';
import { MiniAppActivity } from './miniapp-activity.entity';
import { MiniAppIssue } from './miniapp-issue.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export enum MiniAppStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('mini_apps')
export class MiniApp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  appId!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  shortDescription!: string;

  @Column({ type: 'text', nullable: true })
  fullDescription!: string;

  @Column({ nullable: true })
  logo!: string;

  @Column({ nullable: true })
  category!: string;

  @Column({ default: 'DRAFT' })
  status!: string;

  @Column({ nullable: true })
  termsUrl?: string;

  @Column({ nullable: true })
  ownerName!: string;

  @Column({ nullable: true })
  ownerEmail!: string;

  @ManyToOne(() => User, user => user.ownedMiniApps, { nullable: true, eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Column({ nullable: true })
  ownerId!: string;

  @Column({ nullable: true })
  supportEmail!: string;

  @Column({ nullable: true })
  teamName!: string;

  @Column({ nullable: true })
  integrationMethod!: string; // WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK

  @Column({ type: 'jsonb', nullable: true })
  integrationConfig!: any;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: any;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  permissions!: any[];

  @OneToMany(() => MiniAppIssue, issue => issue.miniApp, { cascade: true, eager: true })
  issues!: MiniAppIssue[];

  @OneToMany(() => Notification, notification => notification.miniApp, { cascade: true })
  notifications!: Notification[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => MiniAppActivity, activity => activity.miniApp)
  activities!: MiniAppActivity[];
}
