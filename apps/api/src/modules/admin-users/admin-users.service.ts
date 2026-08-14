import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Permission, PermissionUser, Role, RoleUser, User } from '../../database/entities';
import { env } from '../../config/configuration';
import { paginate, tempPassword } from '../../common/utils';
import { RbacService } from '../rbac/rbac.service';
import { AdminCreateUserDto, AdminUpdateUserDto } from './admin-users.dto';
import { DomainException } from '../../common/http-exception.filter';
import { AuthUser, isSuper } from '../../common/types';
import { isPrivilegedPermission } from '@karzintell/shared';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(PermissionUser) private readonly permUsers: Repository<PermissionUser>,
    @InjectRepository(RoleUser) private readonly roleUsers: Repository<RoleUser>,
    private readonly rbac: RbacService,
  ) {}

  async list(query: {
    page?: string; limit?: string; q?: string; status?: string; role?: string;
  }) {
    const p = paginate(query.page, query.limit);
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoin('role_user', 'ru', 'ru.user_id = u.id')
      .leftJoin('roles', 'r', 'r.id = ru.role_id')
      .select(['u.id AS id', 'u.fullName AS fullName', 'u.email AS email', 'u.phone AS phone',
        'u.status AS status', 'u.lastLoginAt AS lastLoginAt', 'u.createdAt AS createdAt'])
      .addSelect("GROUP_CONCAT(DISTINCT r.name) AS roleNames")
      .addSelect("GROUP_CONCAT(DISTINCT r.id) AS roleIds")
      .groupBy('u.id')
      .orderBy('u.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);

    if (query.q)
      qb.andWhere('(u.full_name LIKE :q OR u.phone LIKE :q OR u.email LIKE :q)', { q: `%${query.q}%` });
    if (query.status) qb.andWhere('u.status = :st', { st: query.status });
    if (query.role) qb.andWhere('r.name = :rn', { rn: query.role });

    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.users
        .createQueryBuilder('u')
        .leftJoin('role_user', 'ru', 'ru.user_id = u.id')
        .leftJoin('roles', 'r', 'r.id = ru.role_id')
        .select('COUNT(DISTINCT u.id)', 'cnt')
        .where(query.q ? '(u.full_name LIKE :q OR u.phone LIKE :q OR u.email LIKE :q)' : '1=1',
          query.q ? { q: `%${query.q}%` } : {})
        .andWhere(query.status ? 'u.status = :st' : '1=1', query.status ? { st: query.status } : {})
        .andWhere(query.role ? 'r.name = :rn' : '1=1', query.role ? { rn: query.role } : {})
        .getRawOne(),
    ]);
    return {
      items: items.map((i: any) => ({
        ...i,
        roles: (i.roleNames || '').split(',').filter(Boolean),
        roleIds: (i.roleIds || '').split(',').filter(Boolean).map(Number),
        roleNames: undefined, roleIds2: undefined,
      })),
      total: Number(total?.cnt || 0),
      page: p.page,
      limit: p.limit,
    };
  }

  async findOne(id: number) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const overrides = await this.permUsers.find({ where: { userId: id } });
    const permNames = overrides.length
      ? await this.permissions.findBy({ id: In(overrides.map((o) => o.permissionId)) })
      : [];
    const nameById = new Map(permNames.map((p) => [p.id, p.name]));
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      nationalCode: user.nationalCode,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: (user.roles || []).map((r) => ({ id: r.id, name: r.name, label: r.label })),
      permissionOverrides: overrides.map((o) => ({
        permission: nameById.get(o.permissionId) || `#${o.permissionId}`,
        type: o.type,
      })),
    };
  }

  /** ساخت کاربر توسط ادمین → رمز موقت + تخصیص نقش */
  async create(dto: AdminCreateUserDto, admin: AuthUser) {
    const phone = dto.phone.trim();
    const email = dto.email?.trim().toLowerCase() || null;
    const clash = await this.users.findOne({ where: [{ phone }, ...(email ? [{ email }] : [])] });
    if (clash)
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'موبایل یا ایمیل تکراری است' });

    const plainPassword = dto.password || tempPassword();
    const user = await this.users.save(
      this.users.create({
        fullName: dto.fullName,
        phone,
        email,
        passwordHash: await bcrypt.hash(plainPassword, env.bcryptRounds),
        status: 'active',
        mustChangePassword: true,
      } as Partial<User>),
    );

    if (dto.roleIds?.length) {
      const roles = await this.roles.findBy({ id: In(dto.roleIds) });
      this.assertNoSuperGrant(roles.map((r) => r.name), admin);
      await this.rbac.assignRoles(user.id, roles.map((r) => r.id), admin.id);
    }

    return {
      user: { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email },
      // فقط همین‌یک‌بار نمایش داده می‌شود تا ادمین به کاربر اطلاع دهد
      temporaryPassword: dto.password ? undefined : plainPassword,
    };
  }

  async update(id: number, dto: AdminUpdateUserDto, admin: AuthUser) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    // فقط super_admin می‌تواند حساب super_admin (از جمله رمز عبور آن) را تغییر دهد
    if (user.roles?.some((r) => r.name === 'super_admin'))
      this.assertNoSuperGrant(['super_admin'], admin);

    if (dto.phone) {
      const c = await this.users.findOne({ where: { phone: dto.phone } });
      if (c && c.id !== id) throw new ConflictException('شماره موبایل تکراری است');
    }
    await this.users.update(id, {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
      ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.newPassword
        ? { passwordHash: await bcrypt.hash(dto.newPassword, env.bcryptRounds), mustChangePassword: true }
        : {}),
    });
    await this.rbac.invalidateUser(id);
    return this.findOne(id);
  }

  async remove(id: number, admin: AuthUser) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    if (user.roles?.some((r) => r.name === 'super_admin'))
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'حذف super_admin مجاز نیست' });
    if (id === admin.id)
      throw new DomainException('BAD_REQUEST', 'نمی‌توانید حساب خودتان را حذف کنید', 400);
    await this.users.softDelete(id);
    await this.rbac.invalidateUser(id);
    return { deleted: true };
  }

  /** تخصیص نقش‌ها */
  async assignRoles(id: number, roleIds: number[], admin: AuthUser) {
    const target = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');
    // فقط super_admin می‌تواند نقش‌های super_admin را تغییر دهد
    if (target.roles?.some((r) => r.name === 'super_admin'))
      this.assertNoSuperGrant(['super_admin'], admin);
    const roles = roleIds.length ? await this.roles.findBy({ id: In(roleIds) }) : [];
    this.assertNoSuperGrant(roles.map((r) => r.name), admin);
    // جلوگیری از حذف آخرین سوپر ادمین
    const wasSuper = (target.roles || []).some((r) => r.name === 'super_admin');
    const willBeSuper = roles.some((r) => r.name === 'super_admin');
    if (wasSuper && !willBeSuper) {
      const superCount = await this.roleUsers
        .createQueryBuilder('ru')
        .innerJoin('roles', 'r', 'r.id = ru.role_id')
        .where('r.name = :n', { n: 'super_admin' })
        .getCount();
      if (superCount <= 1)
        throw new DomainException('LAST_SUPER_ADMIN', 'حذف آخرین مدیر ارشد مجاز نیست', 409);
    }
    await this.rbac.assignRoles(id, roles.map((r) => r.id), admin.id);
    return this.findOne(id);
  }

  /** override دسترسی‌های موردی (allow/deny) */
  async assignPermissions(id: number, items: Array<{ permission: string; type: 'allow' | 'deny' }>, admin: AuthUser) {
    const target = await this.users.findOne({ where: { id } });
    if (!target) throw new NotFoundException('کاربر یافت نشد');
    // فقط super_admin می‌تواند مجوزهای قدرت را اعطا کند یا حساب super_admin را تغییر دهد
    if (target.roles?.some((r) => r.name === 'super_admin'))
      this.assertNoSuperGrant(['super_admin'], admin);
    this.assertNoPrivilegedGrant(items.map((i) => i.permission), admin);
    const names = items.map((i) => i.permission);
    const perms = names.length ? await this.permissions.findBy({ name: In(names) }) : [];
    await this.permUsers.delete({ userId: id });
    if (perms.length) {
      await this.permUsers.save(
        perms.map((p) => this.permUsers.create({
          userId: id,
          permissionId: p.id,
          type: items.find((i) => i.permission === p.name)?.type || 'allow',
          grantedBy: admin.id,
        })),
      );
    }
    await this.rbac.invalidateUser(id);
    return this.findOne(id);
  }

  /** نقش super_admin فقط توسط super_admin قابل تخصیص است */
  private assertNoSuperGrant(targetRoleNames: string[], admin: AuthUser) {
    if (targetRoleNames.includes('super_admin') && !isSuper(admin)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'فقط مدیر ارشد می‌تواند نقش super_admin را تخصیص دهد یا تغییر دهد',
      });
    }
  }

  /** مجوزهای قدرت فقط توسط super_admin قابل اعطا هستند (جلوگیری از ارتقای سطح دسترسی) */
  private assertNoPrivilegedGrant(permissions: string[], admin: AuthUser) {
    if (!isSuper(admin) && permissions.some((p) => isPrivilegedPermission(p))) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'اعطای این مجوزها فقط توسط مدیر ارشد مجاز است',
      });
    }
  }
}
