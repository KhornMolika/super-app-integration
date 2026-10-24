import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MiniApp } from './miniapp.entity';
import { User } from '../../access-control/entities/user.entity';

export enum CollaboratorRole {
  DEVELOPER = 'DEVELOPER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

@Entity('mini_app_collaborators')
@Unique(['miniAppId', 'userId'])
export class MiniAppCollaborator {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  miniAppId!: string;

  @ManyToOne(() => MiniApp, (miniApp) => miniApp.collaborators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ default: CollaboratorRole.DEVELOPER })
  role!: CollaboratorRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  toJSON() {
    const clone = { ...this };
    delete (clone as any).miniApp;
    return clone;
  }
}
