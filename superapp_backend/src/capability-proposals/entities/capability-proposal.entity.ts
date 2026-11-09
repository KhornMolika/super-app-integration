import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { Identity } from '../../identities/entities/identity.entity';

@Entity('capability_proposals')
export class CapabilityProposal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  capabilityKey!: string;

  @Column({ nullable: true })
  capabilityName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @ManyToOne(() => MiniApp, { nullable: true, onDelete: 'CASCADE' })
  miniApp!: MiniApp;

  @ManyToOne(() => Identity, { nullable: true, onDelete: 'SET NULL' })
  requestedBy!: Identity;

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

// Backwards-compatible alias
export { CapabilityProposal as PermissionProposal };
