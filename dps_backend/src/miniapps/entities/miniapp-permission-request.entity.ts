import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MiniApp } from './miniapp.entity';
import { PermissionDefinition } from '../../permissions/entities/permission-definition.entity';

@Entity('mini_app_permission_requests')
export class MiniAppPermissionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MiniApp, miniApp => miniApp.permissionRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column()
  miniAppId!: string;

  @ManyToOne(() => PermissionDefinition, permission => permission.miniAppRequests, { nullable: true })
  @JoinColumn({ name: 'permissionId' })
  permission!: PermissionDefinition;

  @Column({ nullable: true })
  permissionId!: string;

  @Column({ type: 'text', nullable: true })
  purpose!: string;

  @Column({ nullable: true })
  termsUrl!: string;

  @Column({ nullable: true })
  requestedVersion!: string;

  @Column({ default: false })
  required!: boolean;

  @Column({ default: 'PENDING' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}