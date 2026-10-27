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
  /** Deletion requested; restorable by signing in until `purgeAfter`. */
  PENDING_DELETION = 'PENDING_DELETION',
}

export enum EndUserHonorific {
  MR = 'MR',
  MRS = 'MRS',
  MISS = 'MISS',
  HE = 'HE',
  LOK_CHUMTEAV = 'LOK_CHUMTEAV',
  DR = 'DR',
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

  @Column({ type: 'varchar', nullable: true })
  honorific!: EndUserHonorific | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  organizationUnit!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  staffId!: string | null;

  /** Object key in the PRIVATE end-user media bucket. Never a public URL. */
  @Column({ type: 'varchar', nullable: true })
  avatarKey!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  avatarUpdatedAt!: Date | null;

  /** Access tokens whose `iat` is before this instant are refused by EndUserAuthGuard. */
  @Column({ type: 'timestamptz', nullable: true })
  sessionsRevokedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deletionRequestedAt!: Date | null;

  /** PENDING_DELETION accounts are hard-deleted by AccountPurgeService after this. */
  @Column({ type: 'timestamptz', nullable: true })
  purgeAfter!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
