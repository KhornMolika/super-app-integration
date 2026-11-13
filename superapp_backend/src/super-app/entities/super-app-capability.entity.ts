import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('superapp_capabilities')
export class SuperAppCapability {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  superAppVersion!: string;

  @Column({ default: 'android' })
  platform!: string;

  @Column('simple-array')
  capabilities!: string[];

  /**
   * When a build of this version succeeded (its APK was published). A version
   * without it was never published, so a new build may use it again.
   */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
