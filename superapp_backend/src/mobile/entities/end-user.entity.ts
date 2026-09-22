import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Check,
} from 'typeorm';

export enum EndUserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

/**
 * Consumer (mobile app) account. Entirely separate from back-office `users`.
 *
 * Constraint/index names are identical to the migration so that
 * `synchronize: true` recognises them as its own and does not drop them.
 * The CHECK guarantees case-insensitive uniqueness together with the UNIQUE:
 * mixed-case rows cannot exist at all.
 */
@Entity('end_users')
@Unique('UQ_end_users_email', ['email'])
@Check('CHK_end_users_email_lowercase', `"email" = lower("email")`)
export class EndUser {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_end_users_id' })
  id!: string;

  /** Always stored lowercased + trimmed. */
  @Column()
  email!: string;

  @Column()
  name!: string;

  /** Self-describing scrypt string: scrypt$N$r$p$salt$hash. Never returned. */
  @Column()
  passwordHash!: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'varchar', default: EndUserStatus.ACTIVE })
  status!: EndUserStatus;

  @Column({ type: 'int', default: 0 })
  failedLoginCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
