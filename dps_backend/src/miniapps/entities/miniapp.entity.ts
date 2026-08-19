import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../access-control/entities/user.entity';
import { MiniAppPermissionRequest } from './miniapp-permission-request.entity';
import { MiniAppIssue } from './miniapp-issue.entity';
import { Notification } from '../../notifications/entities/notification.entity';

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

  @Column({ default: 'Draft' })
  status!: string;



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

  @OneToMany(() => MiniAppPermissionRequest, permission => permission.miniApp, { cascade: true, eager: true, orphanedRowAction: 'delete' })
  permissionRequests!: MiniAppPermissionRequest[];

  @OneToMany(() => MiniAppIssue, issue => issue.miniApp, { cascade: true, eager: true })
  issues!: MiniAppIssue[];

  @OneToMany(() => Notification, notification => notification.miniApp, { cascade: true })
  notifications!: Notification[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
