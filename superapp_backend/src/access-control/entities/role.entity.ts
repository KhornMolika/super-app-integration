import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { StaffProfile } from '../../staff/entities/staff-profile.entity';
import { Permission } from './permission.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => StaffProfile, (sp) => sp.role)
  staffProfiles!: StaffProfile[];

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    cascade: true,
    eager: true,
  })
  @JoinTable({ name: 'role_permissions' })
  permissions!: Permission[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
