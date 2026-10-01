import { dbQuery } from '../../common/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Cart, CartItem, Coupon, Product, ProductVariant } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';
import { FilesService } from '../files/files.service';
import { CouponsService } from '../coupons/coupons.service';
import { SettingsService } from '../settings/settings.service';
import { RedisService } from '../../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { env } from '../../config/configuration';

export interface CartView {
  id: number;
  items: Array<{
    id: number; variantId: number; quantity: number; unitPrice: number;
    productId: number; categoryId: number | null; productName: string; variantTitle: string | null;
    image: string | null; sku: string; available: number;
  }>;
  couponCode: string | null;
  couponDiscount: number;
  subtotal: number;
  discountTotal: number;
  tax: number;
  shipping: number;
  grandTotal: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly items: Repository<CartItem>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly files: FilesService,
    private readonly coupons: CouponsService,
    private readonly settings: SettingsService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  /** موجودی قابل فروش از منبع حقیقت inventory؛ stock_total فقط یک snapshot برای خواندن سریع است. */
  private async availableForVariant(variantId: number, manager: EntityManager = this.em): Promise<number> {
    const rows = await dbQuery(manager, `
      SELECT COALESCE(SUM(GREATEST(quantity - reserved, 0)), 0) AS available
      FROM inventory WHERE variant_id = ?`, [variantId]);
    return Number(rows[0]?.available || 0);
  }

  /** یافتن/ساخت سبد باز برای کاربر یا مهمان */
  private async getOrCreateCart(userId: number | null, sessionId: string | null): Promise<Cart> {
    if (!userId && !sessionId)
      throw new DomainException('CART_SESSION_REQUIRED', 'شناسه سبد خرید ارسال نشده است', 400);
    let cart: Cart | null = null;
    if (userId) cart = await this.carts.findOne({ where: { userId, status: 'open' } });
    if (!cart && sessionId) cart = await this.carts.findOne({ where: { sessionId, status: 'open' } });
    if (!cart) {
      cart = await this.carts.save(this.carts.create({ userId, sessionId, status: 'open' }));
    } else if (userId && !cart.userId) {
      cart.userId = userId;
      await this.carts.save(cart);
    }
    return cart;
  }

  async view(userId: number | null, sessionId: string | null): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const rows = await dbQuery(this.em,
      `SELECT ci.id, ci.variant_id AS "variantId", ci.quantity, ci.unit_price AS "unitPrice",
              v.sku, v.title AS "variantTitle", v.product_id AS "productId", p.name AS "productName",
              p.category_id AS "categoryId",
              (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
              (SELECT COALESCE(SUM(GREATEST(quantity - reserved, 0)), 0) FROM inventory WHERE variant_id = v.id) AS available
       FROM cart_items ci
       JOIN product_variants v ON v.id = ci.variant_id AND v.deleted_at IS NULL
       JOIN products p ON p.id = v.product_id
       WHERE ci.cart_id = ?
       ORDER BY ci.id DESC`,
      [cart.id],
    );

    const items = rows.map((r: any) => ({
      id: Number(r.id),
      variantId: Number(r.variantId),
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
      productId: Number(r.productId),
      categoryId: r.categoryId != null ? Number(r.categoryId) : null,
      productName: r.productName,
      variantTitle: r.variantTitle,
      image: this.files.publicUrl(r.image),
      sku: r.sku,
      available: Number(r.available),
    }));

    const subtotal = items.reduce((s: number, i: { unitPrice: number; quantity: number }) => s + i.unitPrice * i.quantity, 0);
    let couponDiscount = 0;
    let couponCode: string | null = null;
    let isFreeShippingCoupon = false;
    if (cart.couponId && userId) {
      try {
        const coupon = await this.em.getRepository(Coupon).findOne({ where: { id: cart.couponId } });
        if (coupon) {
          const lines = items.map((i: { productId: number; categoryId: number | null; unitPrice: number; quantity: number }) => ({ productId: i.productId, categoryId: i.categoryId, amount: i.unitPrice * i.quantity }));
          const { discount } = await this.coupons.validate(coupon.code, userId, subtotal, lines);
          couponDiscount = discount;
          couponCode = coupon.code;
          if (coupon.campaign === 'free_shipping' || coupon.code.startsWith('FREESHIP') || coupon.title?.includes('ارسال رایگان')) {
            isFreeShippingCoupon = true;
          }
        }
      } catch {
        couponDiscount = 0;
      }
    }

    const payable = subtotal - couponDiscount;
    // مالیات بر ارزش افزوده + هزینه ارسال (از تنظیمات فروشگاه)
    const tax = payable > 0 ? Math.round((payable * env.order.taxPercent) / 100) : 0;
    const freeOver = Number(await this.settings.get('store.free_shipping_threshold', 0)) || 0;
    const flat = Number(await this.settings.get('store.shipping_flat', 250000)) || 0;
    const shipping = payable <= 0 || (freeOver > 0 && payable >= freeOver) || isFreeShippingCoupon ? 0 : flat;

    return {
      id: cart.id,
      items,
      couponCode,
      couponDiscount,
      subtotal,
      discountTotal: couponDiscount,
      tax,
      shipping,
      grandTotal: payable + tax + shipping,
    };
  }

  async addItem(userId: number | null, sessionId: string | null, variantId: number, quantity: number) {
    const requested = Math.floor(quantity);
    if (!Number.isFinite(requested) || requested < 1)
      throw new DomainException('INVALID_QUANTITY', 'تعداد انتخاب‌شده معتبر نیست', 400);
    const variant = await this.variants.findOne({ where: { id: variantId, isActive: true } });
    if (!variant) throw new NotFoundException('تنوع محصول یافت نشد');
    const product = await this.products.findOne({ where: { id: variant.productId, status: 'published' } });
    if (!product) throw new DomainException('NOT_FOUND', 'محصول در دسترس نیست', 404);

    const available = await this.availableForVariant(variantId);
    if (available <= 0)
      throw new DomainException('OUT_OF_STOCK', 'اتمام موجودی', 409, [{ field: 'available', message: '0' }]);

    const cart = await this.getOrCreateCart(userId, sessionId);
    const existing = await this.items.findOne({ where: { cartId: cart.id, variantId } });
    const nextQuantity = Math.min(99, (existing?.quantity || 0) + requested);
    if (nextQuantity > available)
      throw new DomainException('OUT_OF_STOCK', `فقط ${available} عدد از این کالا موجود است`, 409, [{ field: 'available', message: String(available) }]);
    if (existing) {
      existing.quantity = nextQuantity;
      existing.unitPrice = variant.price;
      await this.items.save(existing);
    } else {
      await this.items.save(this.items.create({ cartId: cart.id, variantId, quantity: nextQuantity, unitPrice: variant.price }));
    }
    return this.view(userId, sessionId);
  }

  async updateItem(userId: number | null, sessionId: string | null, itemId: number, quantity: number) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.items.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('آیتم سبد یافت نشد');
    if (quantity <= 0) await this.items.remove(item);
    else {
      const requested = Math.min(99, Math.floor(quantity));
      if (!Number.isFinite(requested) || requested < 1)
        throw new DomainException('INVALID_QUANTITY', 'تعداد انتخاب‌شده معتبر نیست', 400);
      const available = await this.availableForVariant(item.variantId);
      if (available <= 0)
        throw new DomainException('OUT_OF_STOCK', 'اتمام موجودی', 409, [{ field: 'available', message: '0' }]);
      if (requested > available)
        throw new DomainException('OUT_OF_STOCK', `فقط ${available} عدد از این کالا موجود است`, 409, [{ field: 'available', message: String(available) }]);
      item.quantity = requested;
      await this.items.save(item);
    }
    return this.view(userId, sessionId);
  }

  async removeItem(userId: number | null, sessionId: string | null, itemId: number) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    await this.items.delete({ id: itemId, cartId: cart.id });
    return this.view(userId, sessionId);
  }

  async applyCoupon(userId: number, sessionId: string | null, code: string) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const view = await this.view(userId, sessionId);
    const lines = view.items.map((i) => ({ productId: i.productId, categoryId: i.categoryId, amount: i.unitPrice * i.quantity }));
    const { coupon } = await this.coupons.validate(code, userId, view.subtotal, lines);
    cart.couponId = coupon.id;
    await this.carts.save(cart);
    return this.view(userId, sessionId);
  }

  async removeCoupon(userId: number | null, sessionId: string | null) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    cart.couponId = null;
    await this.carts.save(cart);
    return this.view(userId, sessionId);
  }

  /** بعد از ورود: سبد مهمان با سبد کاربر ادغام می‌شود */
  async merge(userId: number, sessionId: string | null) {
    if (!sessionId) return this.view(userId, null);
    const guest = await this.carts.findOne({ where: { sessionId, status: 'open' } });
    if (!guest) return this.view(userId, null);
    const userCart = await this.getOrCreateCart(userId, null);

    if (guest.id !== userCart.id) {
      const guestItems = await this.items.find({ where: { cartId: guest.id } });
      for (const gi of guestItems) {
        const available = await this.availableForVariant(gi.variantId);
        const existing = await this.items.findOne({ where: { cartId: userCart.id, variantId: gi.variantId } });
        if (available <= 0) continue;
        const nextQuantity = Math.min(99, available, (existing?.quantity || 0) + gi.quantity);
        if (existing) {
          existing.quantity = nextQuantity;
          await this.items.save(existing);
        } else {
          await this.items.save(this.items.create({ cartId: userCart.id, variantId: gi.variantId, quantity: nextQuantity, unitPrice: gi.unitPrice }));
        }
      }
      guest.status = 'merged';
      await this.carts.save(guest);
    }
    return this.view(userId, null);
  }

  /** سبد کاربر برای checkout — بدون کوپن در صورت عدم اعتبار */
  async getUserCartOrFail(userId: number): Promise<{ cart: Cart; view: CartView }> {
    const cart = await this.carts.findOne({ where: { userId, status: 'open' } });
    if (!cart) throw new DomainException('CART_EXPIRED', 'سبد خرید خالی است', 410);
    const view = await this.view(userId, null);
    if (!view.items.length) throw new DomainException('CART_EXPIRED', 'سبد خرید خالی است', 410);
    return { cart, view };
  }

  async markConverted(cartId: number, manager?: EntityManager) {
    await (manager || this.em).getRepository(Cart).update(cartId, { status: 'converted', couponId: null });
  }

  /** cron: ارسال خودکار پیامک یادآوری سبد خرید رها شده به کاربران پس از ۴ ساعت */
  @Cron(CronExpression.EVERY_HOUR)
  async recoverAbandonedCarts() {
    const fourHoursAgo = new Date(Date.now() - 4 * 3600 * 1000);
    const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000);

    // پیدا کردن سبدهای باز که بین ۴ تا ۱۲ ساعت پیش بروزرسانی شده‌اند و متعلق به کاربران ثبت‌نامی هستند
    const carts = await this.carts.createQueryBuilder('c')
      .innerJoin('users', 'u', 'u.id = c.user_id')
      .where("c.status = 'open' AND c.updated_at BETWEEN :twelveHoursAgo AND :fourHoursAgo", { twelveHoursAgo, fourHoursAgo })
      .select(['c.id AS id', 'u.phone AS phone', 'u.fullName AS "fullName"'])
      .getRawMany();

    for (const c of carts) {
      try {
        const key = `cart:recovery:notified:${c.id}`;
        const alreadyNotified = await this.redis.get(key);
        if (alreadyNotified) continue;

        // چک کنیم سبد خالی نباشد
        const itemsCount = await this.items.count({ where: { cartId: c.id } });
        if (itemsCount === 0) continue;

        // ارسال پیامک با صف
        await this.notifications.sendSms(
          c.phone,
          `سلام ${c.fullName} عزیز\nاقلامی در سبد خرید شما در کارزینتل جا مانده‌اند! با کد تخفیف ارسال رایگان FREESHIP همین حالا خرید خود را نهایی کنید.\nkarzintell.ir/cart`,
        );

        // نشانه گذاری برای عدم ارسال مجدد
        await this.redis.set(key, '1', 24 * 3600); // به مدت ۲۴ ساعت مجدد فرستاده نشود
      } catch {
        /* ignore */
      }
    }
  }
}
