import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission, Role } from '../../database/entities';
import { RbacService } from './rbac.service';
import { slugify } from '../../common/utils';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    private readonly rbac: RbacService,
  ) {}

  listRoles() {
    return this.roles.find({ relations: { permissions: true }, order: { id: 'ASC' } });
  }

  async listPermissionsGrouped() {
    const all = await this.permissions.find({ order: { groupName: 'ASC', name: 'ASC' } });
    const groups: Record<string, Array<{ id: number; name: string; label: string }>> = {};
    for (const p of all) {
      groups[p.groupName] ||= [];
      groups[p.groupName].push({ id: p.id, name: p.name, label: p.label });
    }
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  }

  async create(dto: { name: string; label: string; description?: string; permissionIds?: number[] }) {
    const name = slugify(dto.name).replace(/-/g, '_');
    if (await this.roles.findOne({ where: [{ name }, { name: dto.name }] }))
      throw new ConflictException({ code: 'ROLE_TAKEN', message: 'نام نقش تکراری است' });
    const perms = dto.permissionIds?.length
      ? await this.permissions.findBy({ id: In(dto.permissionIds) })
      : [];
    const role = await this.roles.save(
      this.roles.create({ name, label: dto.label, description: dto.description ?? null, permissions: perms }),
    );
    return role;
  }

  async update(id: number, dto: { label?: string; description?: string; permissionIds?: number[] }) {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) throw new NotFoundException('نقش یافت نشد');
    if (role.name === 'super_admin' && dto.permissionIds)
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'مجوزهای نقش super_admin قابل تغییر نیست' });

    if (dto.label !== undefined) role.label = dto.label;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissionIds) {
      role.permissions = dto.permissionIds.length
        ? await this.permissions.findBy({ id: In(dto.permissionIds) })
        : [];
    }
    await this.roles.save(role);
    await this.rbac.invalidateAll();
    return this.roles.findOne({ where: { id }, relations: { permissions: true } });
  }

  async remove(id: number) {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('نقش یافت نشد');
    if (role.isSystem)
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'نقش سیستمی قابل حذف نیست' });
    const userCount = await this.roles.manager.count('role_user', { where: { roleId: id } as any });
    if (userCount > 0)
      throw new ConflictException({ code: 'ROLE_IN_USE', message: 'این نقش به کاربرانی تخصیص داده شده است' });
    await this.roles.delete(id);
    await this.rbac.invalidateAll();
    return { deleted: true };
  }
}
