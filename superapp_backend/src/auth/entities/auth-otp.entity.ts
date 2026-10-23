import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type OtpPurpose = 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';

@Entity('auth_otps')
export class AuthOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_auth_otps_email')
  @Column()
  email!: string;

  @Column({ length: 6 })
  code!: string;

  @Column({ default: 'PASSWORD_RESET' })
  purpose!: OtpPurpose;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ default: false })
  isUsed!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @Column({ default: 0 })
  attempts!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
