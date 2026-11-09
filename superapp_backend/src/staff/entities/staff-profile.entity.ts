import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Identity } from '../../identities/entities/identity.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Role } from '../../access-control/entities/role.entity';

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

@Entity('staff_profiles')
@Unique('UQ_staff_agency_staffId', ['organizationId', 'staffId'])
export class StaffProfile {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_staff_profiles_id' })
  id!: string;

  @Column({ type: 'uuid', unique: true })
  identityId!: string;

  @OneToOne(() => Identity, (identity) => identity.staffProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'identityId' })
  identity!: Identity;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => Organization, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => Role, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @Column({ type: 'varchar', length: 50, nullable: true })
  staffId?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalId?: string | null;

  @Column({ type: 'varchar', default: StaffStatus.ACTIVE })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
