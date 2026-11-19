import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BannerActionType {
  NONE = 'NONE',
  MINI_APP = 'MINI_APP',
  EXTERNAL_URL = 'EXTERNAL_URL',
  IN_APP_ROUTE = 'IN_APP_ROUTE',
}

export enum BannerAudience {
  PUBLIC = 'PUBLIC',
  ALL_FSA_STAFF = 'ALL_FSA_STAFF',
}

@Entity('superapp_banners')
export class SuperAppBanner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: BannerActionType.NONE,
  })
  actionType!: BannerActionType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionValue?: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  startDate?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endDate?: Date | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: BannerAudience.PUBLIC,
  })
  targetAudience!: BannerAudience;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
