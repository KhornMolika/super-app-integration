import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MiniApp } from './miniapp.entity';

@Entity()
export class MiniAppIssue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  type!: string;

  @Column({ default: 'HIGH' })
  severity!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ default: 'OPEN' })
  status!: string;

  @Column({ default: 'MINI_APP_ISSUE' })
  classification!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @ManyToOne(() => MiniApp, miniApp => miniApp.issues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column()
  miniAppId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}