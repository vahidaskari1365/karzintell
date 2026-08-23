import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponUsage } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';
import { paginate } from '../../common/utils';
import { computeCouponDiscount } from './coupon-math';

/** یک قلم سبد برای محاسبه دامنه کوپن (محصول/دسته) */
export interface CouponLine {
  productId: number;
  categoryId: number | null;
  amount: number; // unitPrice * quantity
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(CouponUsage) private readonly usages: Repository<CouponUsage>,
  ) {}

  async validate(
    code: string,
    userId: number,
    subtotal: number,
    lines: CouponLine[] = [],
  ): Promise<{ coupon: Coupon; discount: number }> {
    const coupon = await this.coupons.findOne({ where: { code: code.trim().toUpperCase() } });
    const now = new Date();

    if (!coupon || !coupon.isActive)
      throw new DomainException('COUPON_INVALID', 'کد تخفیف معتبر نیست', 400);
    if (coupon.startsAt && coupon.startsAt > now)
      throw new DomainException('COUPON_INVALID', 'این کد هنوز فعال نشده است', 400);
    if (coupon.expiresAt && coupon.expiresAt < now)
      throw new DomainException('COUPON_EXPIRED', 'کد تخفیف منقضی شده است', 400);
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      throw new DomainException('COUPON_EXPIRED', 'ظرفیت استفاده از این کد تمام شده است', 400);
    if (subtotal < coupon.minCartAmount)
      throw new DomainException('COUPON_INVALID', `حداقل سبد برای این کد ${coupon.minCartAmount} ریال است`, 400);

    const userUsages = await this.usages.count({ where: { couponId: coupon.id, userId } });
    if (userUsages >= coupon.perUserLimit)
      throw new DomainException('COUPON_INVALID', 'شما قبلاً از این کد استفاده کرده‌اید', 400);

    // دامنه کوپن: محصول/دسته مشخص → تخفیف فقط روی همان اقلام
    let base = subtotal;
    const productIds = Array.isArray(coupon.productIds) ? coupon.productIds.map(Number) : [];
    const categoryIds = Array.isArray(coupon.categoryIds) ? coupon.categoryIds.map(Number) : [];
    if (productIds.length || categoryIds.length) {
      base = lines
        .filter(
          (l) =>
            productIds.includes(l.productId) ||
            (l.categoryId != null && categoryIds.includes(l.categoryId)),
        )
        .reduce((s, l) => s + l.amount, 0);
      if (base <= 0)
        throw new DomainException('COUPON_INVALID', 'این کد روی اقلام سبد شما قابل اعمال نیست', 400);
    }

    const discount = this.computeDiscount(coupon, base);
    if (discount <= 0) throw new DomainException('COUPON_INVALID', 'کد تخفیف برای این سبد قابل اعمال نیست', 400);
    return { coupon, discount };
  }

  computeDiscount(coupon: Coupon, subtotal: number): number {
    return computeCouponDiscount(coupon, subtotal);
  }

  /** ثبت مصرف کوپن — باید داخل تراکنش سفارش صدا زده شود */
  async consume(coupon: Coupon, userId: number, orderId: number, discount: number, manager: import('typeorm').EntityManager) {
    await manager.getRepository(CouponUsage).save(
      manager.getRepository(CouponUsage).create({ couponId: coupon.id, userId, orderId, discountAmount: discount }),
    );
    await manager.getRepository(Coupon).increment({ id: coupon.id }, 'usedCount', 1);
  }

  // ---------------------------------------------------------------- ادمین
  async adminList(page?: string, limit?: string, q?: string) {
    const p = paginate(page, limit);
    const qb = this.coupons.createQueryBuilder('c').orderBy('c.id', 'DESC').offset(p.skip).limit(p.limit);
    if (q) qb.where('c.code LIKE :q OR c.title LIKE :q', { q: `%${q}%` });
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: p.page, limit: p.limit };
  }

  async save(dto: Partial<Coupon> & { id?: number }) {
    const code = (dto.code || '').trim().toUpperCase();
    if (!code) throw new ConflictException({ code: 'BAD_REQUEST', message: 'کد الزامی است' });
    const clash = await this.coupons.findOne({ where: { code } });
    if (clash && clash.id !== dto.id)
      throw new ConflictException({ code: 'CODE_TAKEN', message: 'این کد قبلاً تعریف شده است' });
    if (dto.id) {
      await this.coupons.update(dto.id, { ...dto, code });
      return this.coupons.findOne({ where: { id: dto.id } });
    }
    return this.coupons.save(this.coupons.create({ ...dto, code } as Coupon));
  }

  async remove(id: number) {
    const usage = await this.usages.count({ where: { couponId: id } });
    if (usage) {
      await this.coupons.update(id, { isActive: false });
      return { archived: true };
    }
    await this.coupons.delete(id);
    return { deleted: true };
  }
}
