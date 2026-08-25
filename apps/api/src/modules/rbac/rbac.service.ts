import { dbQuery } from '../../common/utils';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission, PermissionUser, Role, RoleUser, User } from '../../database/entities';
import { RedisService } from '../../common/redis.service';
import { AuthUser, isSuper } from '../../common/types';
import { PERMISSIONS, isPrivilegedPermission } from '@karzintell/shared';

/**
 * محاسبه دسترسی مؤثر کاربر:
 *  ⋃ مجوزهای نقش‌ها  −  denyهای مستقیم  +  allowهای مستقیم
 * اگر کاربر نقش super_admin داشته باشد → '*'
 */
@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RoleUser) private readonly roleUsers: Repository<RoleUser>,
    @InjectRepository(PermissionUser) private readonly permUsers: Repository<PermissionUser>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly perms: Repository<Permission>,
    private readonly redis: RedisService,
  ) {}

  private cacheKey = (userId: number) => `perm:user:${userId}`;

  async buildAuthUser(userId: number): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: userId }, relations: { roles: true } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const roleNames = (user.roles || []).map((r) => r.name);
    const permissions = await this.getEffectivePermissions(userId);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles: roleNames,
      permissions,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async getEffectivePermissions(userId: number): Promise<string[] | '*'> {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) return cached === '*' ? '*' : (JSON.parse(cached) as string[]);

    const result = await this.computePermissions(userId);
    await this.redis.set(
      this.cacheKey(userId),
      result === '*' ? '*' : JSON.stringify(result),
      60,
    );
    return result;
  }

  private async computePermissions(userId: number): Promise<string[] | '*'> {
    const rows = await this.roleUsers
      .createQueryBuilder('ru')
      .innerJoin('roles', 'r', 'r.id = ru.role_id')
      .innerJoin('permission_role', 'pr', 'pr.role_id = r.id')
      .innerJoin('permissions', 'p', 'p.id = pr.permission_id')
      .select(['r.name AS "roleName"', 'p.name AS "permName"'])
      .where('ru.user_id = :userId', { userId })
      .getRawMany<{ roleName: string; permName: string }>();

    if (rows.some((r) => r.roleName === 'super_admin')) return '*';

    const perms = new Set(rows.map((r) => r.permName));
    const overrides = await this.permUsers.find({
      where: { userId },
      relations: {},
    });
    if (overrides.length) {
      const names = await this.resolvePermissionNames(overrides.map((o) => o.permissionId));
      for (const o of overrides) {
        const name = names.get(o.permissionId);
        if (!name) continue;
        if (o.type === 'deny') perms.delete(name);
        else perms.add(name);
      }
    }
    return [...perms];
  }

  private async resolvePermissionNames(ids: number[]): Promise<Map<number, string>> {
    if (!ids.length) return new Map();
    const rows = await dbQuery(this.permUsers.manager,
      `SELECT id, name FROM permissions WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    return new Map(rows.map((r: any) => [Number(r.id), r.name as string]));
  }

  async invalidateUser(userId: number): Promise<void> {
    await this.redis.del(this.cacheKey(userId));
  }

  async invalidateAll(): Promise<void> {
    await this.redis.delByPattern('perm:user:*');
  }

  async assignRoles(userId: number, roleIds: number[], assignedBy: number): Promise<void> {
    await this.roleUsers.delete({ userId });
    if (roleIds.length) {
      await this.roleUsers
        .createQueryBuilder()
        .insert()
        .values(roleIds.map((roleId) => ({ roleId, userId, assignedBy })))
        .orIgnore()
        .execute();
    }
    await this.invalidateUser(userId);
  }

  /** نقش پیش‌فرض «مشتری» را به کاربر می‌دهد */
  async assignCustomerRole(userId: number): Promise<void> {
    await this.roleUsers
      .createQueryBuilder()
      .insert()
      .values({ roleId: 7, userId })
      .orIgnore()
      .execute();
    await this.invalidateUser(userId);
  }

  /* ------------------------------------------------------------ */
  /*  مدیریت نقش‌ها و مجوزها (پنل اپراتور)                          */
  /* ------------------------------------------------------------ */

  /** همه مجوزهای سیستم (از دیتابیس؛ با برچسب‌های پکیج shared هماهنگ است) */
  async allPermissions() {
    const rows = await this.perms.find({ order: { groupName: 'ASC', id: 'ASC' } });
    return rows.map((p) => ({ key: p.name, title: p.label, group: p.groupName }));
  }

  async listRoles() {
    const roles = await this.roles
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.permissions', 'p')
      .orderBy('r.id', 'ASC')
      .getMany();
    const counts: { role_id: number; c: number }[] = await this.roleUsers
      .createQueryBuilder('ru')
      .select('ru.role_id', 'role_id')
      .addSelect('COUNT(*)', 'c')
      .groupBy('ru.role_id')
      .getRawMany();
    const countMap = new Map(counts.map((c) => [Number(c.role_id), Number(c.c)]));
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      title: r.label,
      description: r.description,
      isSystem: r.isSystem,
      userCount: countMap.get(r.id) ?? 0,
      permissions: r.name === 'super_admin' ? '*' : r.permissions.map((p) => p.name),
    }));
  }

  async createRole(name: string, title: string, permissions: string[], admin: AuthUser) {
    const exists = await this.roles.findOne({ where: { name } });
    if (exists) throw new BadRequestException('نام ماشینی نقش تکراری است');
    this.assertValidPermissions(permissions);
    this.assertNoPrivilegedGrant(permissions, admin);
    const role = await this.roles.save(this.roles.create({ name, label: title, isSystem: false }));
    await this.setRolePermissions(role.id, permissions);
    await this.invalidateAll();
    return { id: role.id };
  }

  async updateRole(id: number, dto: { title?: string; description?: string; permissions?: string[] }, admin: AuthUser) {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('نقش یافت نشد');
    if (role.name === 'super_admin' && dto.permissions) {
      throw new BadRequestException('مجوزهای نقش مدیر ارشد قابل تغییر نیست');
    }
    if (dto.permissions) {
      this.assertValidPermissions(dto.permissions);
      this.assertNoPrivilegedGrant(dto.permissions, admin);
    }
    if (dto.title) role.label = dto.title;
    if (dto.description !== undefined) role.description = dto.description;
    await this.roles.save(role);
    if (dto.permissions) {
      await this.setRolePermissions(role.id, dto.permissions);
    }
    await this.invalidateRoleUsers(role.id);
    return { ok: true };
  }

  /** اعطای مجوزهای قدرت فقط توسط super_admin مجاز است */
  private assertNoPrivilegedGrant(permissions: string[], admin: AuthUser) {
    if (!isSuper(admin) && permissions.some((p) => isPrivilegedPermission(p))) {
      throw new BadRequestException('اعطای این مجوزها فقط توسط مدیر ارشد مجاز است');
    }
  }

  async deleteRole(id: number) {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('نقش یافت نشد');
    if (role.isSystem) throw new BadRequestException('نقش سیستمی قابل حذف نیست');
    const inUse = await this.roleUsers.count({ where: { roleId: id } });
    if (inUse > 0) throw new BadRequestException(`${inUse} کاربر این نقش را دارند؛ ابتدا نقش آن‌ها را تغییر دهید`);
    await this.roles.delete(id);
    await this.invalidateAll();
    return { ok: true };
  }

  private assertValidPermissions(keys: string[]) {
    const valid = new Set(PERMISSIONS.map((p) => p.key));
    const bad = keys.filter((k) => !valid.has(k as never));
    if (bad.length) throw new BadRequestException(`مجوز نامعتبر: ${bad.join('، ')}`);
  }

  private async setRolePermissions(roleId: number, keys: string[]) {
    const ids = await this.perms.find({ where: { name: In(keys) }, select: { id: true } });
    const manager = this.roles.manager;
    await dbQuery(manager, 'DELETE FROM permission_role WHERE role_id = ?', [roleId]);
    if (ids.length) {
      const values = ids.map((p) => `(${p.id}, ${roleId})`).join(',');
      await dbQuery(manager, `INSERT INTO permission_role (permission_id, role_id) VALUES ${values}`);
    }
  }

  private async invalidateRoleUsers(roleId: number) {
    const rows = await this.roleUsers.find({ where: { roleId } });
    await Promise.all(rows.map((r) => this.invalidateUser(r.userId)));
  }
}
