import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MiniApp } from './miniapp.entity';

@Entity('miniapp_activities')
export class MiniAppActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  miniAppId!: string;

  @ManyToOne(() => MiniApp, miniApp => miniApp.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column({ nullable: true })
  actorId!: string;

  @Column()
  type!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn()
  createdAt!: Date;
}

