import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Unique,
  Check,
} from 'typeorm';
import { StaffProfile } from '../../staff/entities/staff-profile.entity';
import { ConsumerProfile } from '../../consumers/entities/consumer-profile.entity';

export enum IdentityStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  PENDING_DELETION = 'PENDING_DELETION',
}

export enum IdentityHonorific {
  MR = 'MR',
  MRS = 'MRS',
  MISS = 'MISS',
  HE = 'HE',
  LOK_CHUMTEAV = 'LOK_CHUMTEAV',
  DR = 'DR',
}

@Entity('identities')
@Unique('UQ_identities_email', ['email'])
@Check('CHK_identities_email_lowercase', '"email" = lower("email")')
export class Identity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_identities_id' })
  id!: string;

  /** Always lowercased + trimmed */
  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  honorific?: IdentityHonorific | string | null;

  /** Object key in private S3/MinIO bucket */
  @Column({ type: 'varchar', nullable: true })
  avatarKey?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  avatarUpdatedAt?: Date | null;

  /**
   * Cryptographic password hash. `select: false`: never loaded by ordinary queries,
   * so it cannot leak through responses. Read it via loadPasswordHash().
   */
  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', default: IdentityStatus.ACTIVE })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  failedLoginCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  sessionsRevokedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deletionRequestedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  purgeAfter?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  telegramChatId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  telegramUsername?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  telegramConnectedAt?: Date | null;

  @OneToOne(() => StaffProfile, (sp) => sp.identity, { cascade: true })
  staffProfile?: StaffProfile;

  @OneToOne(() => ConsumerProfile, (cp) => cp.identity, { cascade: true })
  consumerProfile?: ConsumerProfile;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
