import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MiniApp } from '../../miniapps/entities/miniapp.entity';
import { Identity } from '../../identities/entities/identity.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  type!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @ManyToOne(() => Identity, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: Identity;

  @Column({ nullable: true })
  userId!: string;

  @ManyToOne(() => MiniApp, (miniApp) => miniApp.notifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'miniAppId' })
  miniApp?: MiniApp;

  @Column({ nullable: true })
  miniAppId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
