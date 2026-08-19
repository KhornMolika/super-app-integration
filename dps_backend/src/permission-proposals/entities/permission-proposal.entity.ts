import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { User } from '../../access-control/entities/user.entity';

@Entity('permission_proposals')
export class PermissionProposal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  permissionKey!: string;

  @Column({ nullable: true })
  permissionName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @ManyToOne(() => MiniApp, { nullable: true, onDelete: 'CASCADE' })
  miniApp!: MiniApp;

  @ManyToOne(() => User, { nullable: true })
  requestedBy!: User;

  @Column({ default: 'PENDING_REVIEW' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  adminDecisionReason!: string;

  @Column({ nullable: true })
  targetSuperAppVersion!: string;

  @Column({ nullable: true })
  implementedInSuperAppVersion!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}