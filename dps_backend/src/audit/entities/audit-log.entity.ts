import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  actorId!: string;

  @Column()
  action!: string;

  @Column()
  resourceType!: string;

  @Column({ nullable: true })
  resourceId!: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue!: any;

  @Column({ type: 'jsonb', nullable: true })
  newValue!: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @Column({ nullable: true })
  ipAddress!: string;

  @Column({ nullable: true })
  userAgent!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

