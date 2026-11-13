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
import { Identity } from '../../identities/entities/identity.entity';

/**
 * A collaborator's rights on one Mini App (see miniapps/access/miniapp-access.policy.ts).
 * MAINTAINER was called ADMIN before migration 1794800000000; renamed so it is
 * not confused with the organization ADMIN platform role.
 */
export enum CollaboratorRole {
  VIEWER = 'VIEWER',
  DEVELOPER = 'DEVELOPER',
  MAINTAINER = 'MAINTAINER',
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

  /** DB column "identityId" (schema master plan); property name kept for API compatibility. */
  @Column({ name: 'identityId', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Identity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'identityId' })
  user!: Identity;

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
