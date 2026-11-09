import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Identity } from '../../identities/entities/identity.entity';

@Entity('consumer_profiles')
export class ConsumerProfile {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_consumer_profiles_id' })
  id!: string;

  @Column({ type: 'uuid', unique: true })
  identityId!: string;

  @OneToOne(() => Identity, (identity) => identity.consumerProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'identityId' })
  identity!: Identity;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string | null;

  /** Apple / Google App Store mandatory account deletion grace period */
  @Column({ type: 'timestamptz', nullable: true })
  deletionRequestedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  purgeAfter?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
