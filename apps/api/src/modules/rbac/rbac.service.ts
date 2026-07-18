import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PermissionUser, RoleUser, User } from '../../database/entities';
import { RedisService } from '../../common/redis.service';
import { AuthUser } from '../../common/types';

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
      .select(['r.name AS roleName', 'p.name AS permName'])
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
    const rows = await this.permUsers.manager.query(
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
}
