import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Identity } from '../../identities/entities/identity.entity';

/** Only the sha256 of the emailed token is stored. Single use, 24h expiry. */
@Entity('end_user_email_verification_tokens')
export class EmailVerificationToken {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_end_user_email_verification_tokens_id',
  })
  id!: string;

  @Index('IDX_end_user_evt_userId')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_end_user_evt_userId',
  })
  user?: Identity;

  @Index('IDX_end_user_evt_tokenHash', { unique: true })
  @Column({ select: false }) // lookups use it in WHERE only
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /** Wrong-password attempts against this token; invalidated at the limit. */
  @Column({ type: 'int', default: 0 })
  failedAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
