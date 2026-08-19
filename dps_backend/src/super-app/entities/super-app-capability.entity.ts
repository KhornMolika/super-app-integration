import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}