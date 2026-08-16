import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class MiniApp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  appId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  shortDescription!: string;

  @Column({ type: 'text', nullable: true })
  fullDescription!: string;

  @Column({ nullable: true })
  logo!: string;

  @Column({ nullable: true })
  category!: string;

  @Column({ default: 'DRAFT' })
  status!: string;

  @Column({ type: 'boolean', default: false })
  hasUnreadIssues!: boolean;

  @Column({ nullable: true })
  ownerName!: string;

  @Column({ nullable: true })
  ownerEmail!: string;

  @Column({ nullable: true })
  supportEmail!: string;

  @Column({ nullable: true })
  teamName!: string;

  @Column({ nullable: true })
  integrationMethod!: string; // WEBVIEW, FLUTTER_PACKAGE, NATIVE_SDK, DEEP_LINK

  @Column({ type: 'jsonb', nullable: true })
  integrationConfig!: any;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: any;

  // Uses JSON to store an array of objects: [{ type: 'CAMERA', purpose: 'Scan QR' }]
  @Column({ type: 'jsonb', nullable: true })
  permissions!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
