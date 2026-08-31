import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 50, unique: true })
  name: string;

  @Column({ length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'is_system', type: 'tinyint', width: 1, default: 0 })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToMany(() => Permission, (p) => p.roles, { createForeignKeyConstraints: false })
  @JoinTable({
    name: 'permission_role',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ManyToMany(() => User, (u) => u.roles, { createForeignKeyConstraints: false })
  users: User[];
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 150 })
  label: string;

  @Column({ name: 'group_name', length: 50 })
  groupName: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToMany(() => Role, (r) => r.permissions, { createForeignKeyConstraints: false })
  roles: Role[];
}

/** override دسترسی برای یک کاربر خاص (allow/deny) */
@Entity('permission_user')
export class PermissionUser {
  @PrimaryColumn({ name: 'permission_id', type: 'int', unsigned: true })
  permissionId: number;

  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ type: 'varchar', length: 10, default: 'allow' })
  type: 'allow' | 'deny';

  @Column({ name: 'granted_by', type: 'bigint', unsigned: true, nullable: true })
  grantedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

/** اتصال مجوز به نقش */
@Entity('permission_role')
export class PermissionRole {
  @PrimaryColumn({ name: 'permission_id', type: 'int', unsigned: true })
  permissionId: number;

  @PrimaryColumn({ name: 'role_id', type: 'int', unsigned: true })
  roleId: number;
}

/** ردیف pivot نقش-کاربر (برای خواندن assigned_by) */
@Entity('role_user')
export class RoleUser {
  @PrimaryColumn({ name: 'role_id', type: 'int', unsigned: true })
  roleId: number;

  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'assigned_by', type: 'bigint', unsigned: true, nullable: true })
  assignedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
