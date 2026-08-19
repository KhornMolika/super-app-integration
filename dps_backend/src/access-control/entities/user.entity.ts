import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Role } from './role.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';

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

  @Column({ default: true })
  isActive!: boolean;

  @ManyToMany(() => Role, role => role.users, { cascade: true, eager: true })
  @JoinTable({ name: 'user_roles' })
  roles!: Role[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications!: Notification[];

  @OneToMany(() => MiniApp, miniApp => miniApp.owner)
  ownedMiniApps!: MiniApp[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}