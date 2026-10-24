import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  avatarUrl!: string;

  @Column({ nullable: true, unique: true })
  externalId!: string;

  @Column({ default: 'ACTIVE' })
  status!: string;


  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ nullable: true })
  telegramChatId?: string;

  @Column({ nullable: true })
  telegramUsername?: string;

  @Column({ nullable: true, type: 'timestamp' })
  telegramConnectedAt?: Date;


  // Direct 1-to-1 Role Association
  @Column({ type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'roleId' })
  role!: Role;


  // Direct 1-to-1 Organization Association
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string | null;

  @ManyToOne(() => Organization, (org) => org.users, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization | null;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];

  @OneToMany(() => MiniApp, (miniApp) => miniApp.owner)
  ownedMiniApps!: MiniApp[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
