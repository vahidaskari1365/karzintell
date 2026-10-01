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
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  @Index()
  userId: number;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 190 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  body: string | null;

  // MySQL uses json instead of jsonb
  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'database' })
  channel: 'database' | 'sms' | 'email' | 'push';

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('settings')
export class Setting {
  @PrimaryColumn({ name: 'setting_key', length: 100 })
  key: string;

  @Column({ name: 'setting_value', type: 'text', nullable: true })
  value: string | null;

  @Column({ name: 'setting_group', length: 50, default: 'general' })
  group: string;

  @Column({ name: 'setting_type', type: 'varchar', length: 20, default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ name: 'is_public', type: 'tinyint', width: 1, default: 0, transformer: {
    to: (v: boolean) => v ? 1 : 0,
    from: (v: number) => !!v
  }})
  isPublic: boolean;

  @Column({ name: 'updated_by', type: 'bigint', unsigned: true, nullable: true })
  updatedBy: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  @Index()
  userId: number | null;

  @Column({ length: 100 })
  action: string;

  @Column({ type: 'varchar', name: 'subject_type', length: 50, nullable: true })
  subjectType: string | null;

  @Column({ name: 'subject_id', type: 'bigint', unsigned: true, nullable: true })
  @Index()
  subjectId: number | null;

  // MySQL uses json instead of jsonb
  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('files')
export class FileRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 20, default: 'local' })
  disk: string;

  @Column({ length: 500 })
  path: string;

  @Column({ type: 'varchar', name: 'original_name', length: 255, nullable: true })
  originalName: string | null;

  @Column({ type: 'varchar', name: 'mime_type', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  purpose: string | null;

  @Column({ name: 'owner_id', type: 'bigint', unsigned: true, nullable: true })
  ownerId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  @Index()
  userId: number;

  @Column({ length: 500 })
  endpoint: string;

  @Column({ length: 255 })
  p256dh: string;

  @Column({ length: 255 })
  auth: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
