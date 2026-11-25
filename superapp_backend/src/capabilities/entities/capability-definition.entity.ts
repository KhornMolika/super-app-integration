import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface CapabilityDetectionRules {
  pubspecPackages?: string[];
  androidPermissions?: string[];
  iosPlistKeys?: string[];
  jsBridgeKeywords?: string[];
  defaultPurpose?: string;
}

export interface CapabilityStoreMapping {
  iosKey?: string;
  androidPermission?: string;
  defaultAction?: string;
}

@Entity('capability_definitions')
export class CapabilityDefinition {
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

  @Column({ default: true })
  isAllowed!: boolean;

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

  @Column({ type: 'jsonb', default: () => "'[]'" })
  aliases!: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  detectionRules!: CapabilityDetectionRules;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  storeMapping!: CapabilityStoreMapping;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

// Backwards-compatible alias
export { CapabilityDefinition as PermissionDefinition };
