import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EndUser } from './end-user.entity';

/**
 * Opaque refresh token, stored only as sha256. Single use: rotation sets
 * `rotatedAt` and issues a successor in the same `familyId`. Presenting a
 * rotated token again (outside the grace window) revokes the whole family.
 */
@Entity('end_user_refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_end_user_refresh_tokens_id',
  })
  id!: string;

  @Index('IDX_end_user_rt_familyId')
  @Column({ type: 'uuid' })
  familyId!: string;

  @Index('IDX_end_user_rt_tokenHash', { unique: true })
  @Column()
  tokenHash!: string;

  @Index('IDX_end_user_rt_endUserId')
  @Column({ name: 'endUserId', type: 'uuid' })
  endUserId!: string;

  // Backwards compatibility for userId
  get userId(): string {
    return this.endUserId;
  }
  set userId(val: string) {
    this.endUserId = val;
  }

  @ManyToOne(() => EndUser, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'endUserId',
    foreignKeyConstraintName: 'FK_end_user_rt_userId',
  })
  user?: EndUser;

  @Column({ type: 'varchar', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rotatedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
