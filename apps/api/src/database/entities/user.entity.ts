import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './rbac.entity';

export const numericTransformer = {
  to: (v?: number | null) => v,
  from: (v: string | null) => (v === null ? null : Number(v)),
};

const boolTransformer = {
  to: (v?: boolean | null) => !!v,
  from: (v: boolean | number | null) => !!v,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'auth_user_id', type: 'uuid', nullable: true, unique: true })
  authUserId: string | null;

  @Column({ name: 'full_name', length: 120 })
  fullName: string;

  @Column({ length: 190, nullable: true, unique: true })
  email: string | null;

  @Index({ unique: true })
  @Column({ length: 15 })
  phone: string;

  @Column({ name: 'password_hash', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ name: 'national_code', length: 10, nullable: true })
  nationalCode: string | null;

  @Column({ name: 'avatar_path', length: 500, nullable: true })
  avatarPath: string | null;

  @Column({ type: 'enum', enum: ['active', 'pending', 'suspended'], default: 'pending' })
  status: 'active' | 'pending' | 'suspended';

  @Column({ name: 'must_change_password', default: false, transformer: boolTransformer })
  mustChangePassword: boolean;

  @Column({ name: 'two_factor_enabled', default: false, transformer: boolTransformer })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', length: 64, nullable: true, select: false })
  twoFactorSecret: string | null;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'phone_verified_at', type: 'timestamptz', nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @ManyToMany(() => Role, (r) => r.users, { createForeignKeyConstraints: false })
  @JoinTable({
    name: 'role_user',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ length: 50, default: 'آدرس من' })
  title: string;

  @Column({ name: 'receiver_name', length: 120 })
  receiverName: string;

  @Column({ name: 'receiver_phone', length: 15 })
  receiverPhone: string;

  @Column({ length: 50 })
  province: string;

  @Column({ length: 50 })
  city: string;

  @Column({ name: 'postal_code', length: 10, nullable: true })
  postalCode: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ length: 20, nullable: true })
  plaque: string | null;

  @Column({ length: 20, nullable: true })
  unit: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: numericTransformer })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: numericTransformer })
  longitude: number | null;

  @Column({ name: 'is_default', default: false, transformer: boolTransformer })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'enum', enum: ['phone', 'email'] })
  channel: 'phone' | 'email';

  @Index()
  @Column({ length: 190 })
  target: string;

  @Column({ name: 'code_hash', select: false })
  codeHash: string;

  @Column({
    type: 'enum',
    enum: ['register', 'login', 'reset_password', 'verify_contact'],
    default: 'login',
  })
  purpose: 'register' | 'login' | 'reset_password' | 'verify_contact';

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Index({ unique: true })
  @Column({ name: 'token_hash', length: 64 })
  tokenHash: string;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
