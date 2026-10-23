import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../access-control/entities/user.entity';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  code?: string;

  @Column({
    type: 'varchar',
    default: 'Non-Bank Financial Services Authority',
  })
  parentAuthority!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status!: OrganizationStatus;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => MiniApp, (miniApp) => miniApp.organizationRelation)
  miniApps!: MiniApp[];


  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
