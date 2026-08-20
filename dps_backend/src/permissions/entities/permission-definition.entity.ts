import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('permission_definitions')
export class PermissionDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ nullable: true })
  category!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isDeprecated!: boolean;

  @Column({ nullable: true })
  introducedInVersion!: string;

  @Column({ nullable: true })
  deprecatedInVersion!: string;

  @Column({ nullable: true })
  minSuperAppVersion!: string;

  @Column({ nullable: true })
  maxSuperAppVersion!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}