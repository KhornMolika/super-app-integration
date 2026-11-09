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
import { Identity } from '../../identities/entities/identity.entity';

@Entity('developer_tokens')
export class AccessToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** DB column "identityId" (schema master plan); property name kept for API compatibility. */
  @Index()
  @Column({ name: 'identityId' })
  userId!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'identityId' })
  user!: Identity;

  @Column()
  name!: string;

  @Column()
  tokenPrefix!: string;

  @Column()
  tokenHash!: string;

  @Column({ type: 'jsonb', default: () => '\'["sdk:read", "packages:read"]\'' })
  scopes!: string[];

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

// Backwards-compatible alias
export { AccessToken as DeveloperToken };
