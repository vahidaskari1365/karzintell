import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, User, UserAddress, Wishlist } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';
import { AddressDto, UpdateProfileDto } from './users.dto';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserAddress) private readonly addresses: Repository<UserAddress>,
    @InjectRepository(Wishlist) private readonly wishlists: Repository<Wishlist>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly rbac: RbacService,
  ) {}

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (dto.email) {
      const clash = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
      if (clash && clash.id !== userId)
        throw new DomainException('EMAIL_TAKEN', 'این ایمیل قبلاً ثبت شده است', 409);
    }
    await this.users.update(userId, {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
      ...(dto.email !== undefined ? { email: dto.email.toLowerCase(), emailVerifiedAt: null } : {}),
      ...(dto.nationalCode !== undefined ? { nationalCode: dto.nationalCode } : {}),
      ...(dto.avatarPath !== undefined ? { avatarPath: dto.avatarPath } : {}),
    });
    return this.rbac.buildAuthUser(userId);
  }

  // -------------------------------------------------------------- آدرس‌ها
  listAddresses(userId: number) {
    return this.addresses.find({ where: { userId }, order: { isDefault: 'DESC', id: 'DESC' } });
  }

  async addAddress(userId: number, dto: AddressDto) {
    const entity = this.addresses.create({ ...dto, userId, isDefault: !!dto.isDefault });
    if (dto.isDefault || !(await this.addresses.count({ where: { userId } })))
      entity.isDefault = true;
    if (entity.isDefault) await this.addresses.update({ userId }, { isDefault: false });
    return this.addresses.save(entity);
  }

  async updateAddress(userId: number, id: number, dto: Partial<AddressDto>) {
    const addr = await this.owned(userId, id);
    if (dto.isDefault) await this.addresses.update({ userId }, { isDefault: false });
    Object.assign(addr, dto);
    return this.addresses.save(addr);
  }

  async removeAddress(userId: number, id: number) {
    const addr = await this.owned(userId, id);
    await this.addresses.remove(addr);
    return { deleted: true };
  }

  async setDefaultAddress(userId: number, id: number) {
    await this.owned(userId, id);
    await this.addresses.update({ userId }, { isDefault: false });
    await this.addresses.update({ id, userId }, { isDefault: true });
    return { updated: true };
  }

  private async owned(userId: number, id: number) {
    const addr = await this.addresses.findOne({ where: { id, userId } });
    if (!addr) throw new NotFoundException('آدرس یافت نشد');
    return addr;
  }

  // --------------------------------------------------------- علاقه‌مندی‌ها
  async toggleWishlist(userId: number, productId: number, add: boolean) {
    if (add) {
      const exists = await this.products.findOne({ where: { id: productId, status: 'published' } });
      if (!exists) throw new NotFoundException('محصول یافت نشد');
      await this.wishlists.upsert({ userId, productId } as Wishlist, ['userId', 'productId']);
      return { saved: true };
    }
    await this.wishlists.delete({ userId, productId });
    return { saved: false };
  }

  async wishlist(userId: number, page: number, limit: number) {
    const [rows, total] = await this.wishlists.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    if (!rows.length) return { items: [], total };
    const items = await this.products
      .createQueryBuilder('p')
      .leftJoin('brands', 'b', 'b.id = p.brand_id')
      .leftJoin('product_images', 'img', 'img.product_id = p.id AND img.is_primary = 1')
      .select([
        'p.id AS id', 'p.name AS name', 'p.slug AS slug',
        'b.name AS brand', 'p.min_price AS minPrice', 'img.path AS image',
        'p.rating_avg AS ratingAvg',
      ])
      .where('p.id IN (:...ids) AND p.status = :st', { ids: rows.map((r) => r.productId), st: 'published' })
      .getRawMany();
    return { items, total };
  }
}
