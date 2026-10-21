import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MiniApp } from './miniapp.entity';

@Entity('miniapp_legal')
export class MiniAppLegal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  miniAppId!: string;

  @OneToOne(() => MiniApp, (miniApp) => miniApp.legal, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'miniAppId' })
  miniApp!: MiniApp;

  @Column({ nullable: true })
  termsUrl?: string;

  @Column({ type: 'text', nullable: true })
  termsDescription?: string;

  @Column({ nullable: true })
  privacyPolicyUrl?: string;

  @Column({ type: 'text', nullable: true })
  privacyPolicyDescription?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
