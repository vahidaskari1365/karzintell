import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  @Index()
  userId: number;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 190 })
  title: string;

  @Column({ length: 500, nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: ['database', 'sms', 'email', 'push'], default: 'database' })
  channel: 'database' | 'sms' | 'email' | 'push';

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ length: 50, default: 'general' })
  group: string;

  @Column({ type: 'enum', enum: ['string', 'number', 'boolean', 'json'], default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index()
  userId: number | null;

  @Column({ length: 100 })
  action: string;

  @Column({ name: 'subject_type', length: 50, nullable: true })
  subjectType: string | null;

  @Column({ name: 'subject_id', type: 'bigint', nullable: true })
  @Index()
  subjectId: number | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('files')
export class FileRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 20, default: 's3' })
  disk: string;

  @Column({ length: 500 })
  path: string;

  @Column({ name: 'original_name', length: 255, nullable: true })
  originalName: string | null;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: number | null;

  @Column({ length: 50, nullable: true })
  purpose: string | null;

  @Column({ name: 'owner_id', type: 'bigint', nullable: true })
  ownerId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  @Index()
  userId: number;

  @Column({ length: 500 })
  endpoint: string;

  @Column({ length: 255 })
  p256dh: string;

  @Column({ length: 255 })
  auth: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
