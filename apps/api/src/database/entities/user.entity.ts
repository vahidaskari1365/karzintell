import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from "typeorm";

export const numericTransformer = { to: (v?: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) };

@Entity("users")
export class User {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true }) id: number;
  @Column({ name: "full_name", length: 120 }) fullName: string;
  @Column({ length: 190, nullable: true, unique: true }) email: string | null;
  @Index({ unique: true }) @Column({ length: 15 }) phone: string;
  @Column({ name: "password_hash", select: false }) passwordHash: string;
  @Column({ name: "national_code", length: 10, nullable: true }) nationalCode: string | null;
  @Column({ name: "avatar_path", length: 500, nullable: true }) avatarPath: string | null;
  @Column({ type: "enum", enum: ["active", "pending", "suspended"], default: "pending" })
  status: "active" | "pending" | "suspended";
  @Column({ name: "must_change_password", type: "tinyint", width: 1, default: 0, transformer: { to: (v) => (v ? 1 : 0), from: (v) => !!v } })
  mustChangePassword: boolean;
  @Column({ name: "email_verified_at", type: "datetime", nullable: true }) emailVerifiedAt: Date | null;
  @Column({ name: "phone_verified_at", type: "datetime", nullable: true }) phoneVerifiedAt: Date | null;
  @Column({ name: "last_login_at", type: "datetime", nullable: true }) lastLoginAt: Date | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime" }) updatedAt: Date;
  @DeleteDateColumn({ name: "deleted_at", type: "datetime", nullable: true }) deletedAt: Date | null;
}

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn({ type: "int", unsigned: true }) id: number;
  @Index({ unique: true }) @Column({ length: 50 }) name: string;
  @Column({ length: 100 }) label: string;
  @Column({ length: 255, nullable: true }) description: string | null;
  @Column({ name: "is_system", type: "tinyint", width: 1, default: 0, transformer: { to: (v) => (v ? 1 : 0), from: (v) => !!v } })
  isSystem: boolean;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime" }) updatedAt: Date;
}

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn({ type: "int", unsigned: true }) id: number;
  @Index({ unique: true }) @Column({ length: 100 }) name: string;
  @Column({ length: 150 }) label: string;
  @Column({ name: "group_name", length: 50 }) group: string;
}

@Entity("role_user")
export class RoleUser {
  @Column({ name: "role_id", type: "int", unsigned: true, primary: true }) roleId: number;
  @Column({ name: "user_id", type: "bigint", unsigned: true, primary: true }) userId: number;
  @Column({ name: "assigned_by", type: "bigint", unsigned: true, nullable: true }) assignedBy: number | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
}

@Entity("permission_role")
export class PermissionRole {
  @Column({ name: "permission_id", type: "int", unsigned: true, primary: true }) permissionId: number;
  @Column({ name: "role_id", type: "int", unsigned: true, primary: true }) roleId: number;
}

@Entity("permission_user")
export class PermissionUser {
  @Column({ name: "permission_id", type: "int", unsigned: true, primary: true }) permissionId: number;
  @Column({ name: "user_id", type: "bigint", unsigned: true, primary: true }) userId: number;
  @Column({ type: "enum", enum: ["allow", "deny"], default: "allow" }) type: "allow" | "deny";
  @Column({ name: "granted_by", type: "bigint", unsigned: true, nullable: true }) grantedBy: number | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
}

@Entity("user_addresses")
export class UserAddress {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true }) id: number;
  @Index() @Column({ name: "user_id", type: "bigint", unsigned: true }) userId: number;
  @Column({ length: 50, default: "آدرس من" }) title: string;
  @Column({ name: "receiver_name", length: 120 }) receiverName: string;
  @Column({ name: "receiver_phone", length: 15 }) receiverPhone: string;
  @Column({ length: 50 }) province: string;
  @Column({ length: 50 }) city: string;
  @Column({ name: "postal_code", length: 10, nullable: true }) postalCode: string | null;
  @Column({ type: "text" }) address: string;
  @Column({ length: 20, nullable: true }) plaque: string | null;
  @Column({ length: 20, nullable: true }) unit: string | null;
  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true, transformer: numericTransformer }) latitude: number | null;
  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true, transformer: numericTransformer }) longitude: number | null;
  @Column({ name: "is_default", type: "tinyint", width: 1, default: 0, transformer: { to: (v) => (v ? 1 : 0), from: (v) => !!v } })
  isDefault: boolean;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
  @UpdateDateColumn({ name: "updated_at", type: "datetime" }) updatedAt: Date;
  @DeleteDateColumn({ name: "deleted_at", type: "datetime", nullable: true }) deletedAt: Date | null;
}

@Entity("verification_codes")
export class VerificationCode {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true }) id: number;
  @Column({ type: "enum", enum: ["phone", "email"] }) channel: "phone" | "email";
  @Index() @Column({ length: 190 }) target: string;
  @Column({ name: "code_hash", select: false }) codeHash: string;
  @Column({ type: "enum", enum: ["register", "login", "reset_password", "verify_contact"], default: "login" })
  purpose: "register" | "login" | "reset_password" | "verify_contact";
  @Column({ type: "tinyint", default: 0 }) attempts: number;
  @Column({ name: "expires_at", type: "datetime" }) expiresAt: Date;
  @Column({ name: "consumed_at", type: "datetime", nullable: true }) consumedAt: Date | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
}

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true }) id: number;
  @Index() @Column({ name: "user_id", type: "bigint", unsigned: true }) userId: number;
  @Index({ unique: true }) @Column({ name: "token_hash", length: 64 }) tokenHash: string;
  @Column({ name: "user_agent", length: 255, nullable: true }) userAgent: string | null;
  @Column({ length: 45, nullable: true }) ip: string | null;
  @Column({ name: "expires_at", type: "datetime" }) expiresAt: Date;
  @Column({ name: "revoked_at", type: "datetime", nullable: true }) revokedAt: Date | null;
  @CreateDateColumn({ name: "created_at", type: "datetime" }) createdAt: Date;
}
