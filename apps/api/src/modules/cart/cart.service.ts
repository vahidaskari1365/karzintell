import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Cart, CartItem, Coupon, Product, ProductVariant } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';
import { FilesService } from '../files/files.service';
import { CouponsService } from '../coupons/coupons.service';

export interface CartView {
  id: number;
  items: Array<{
    id: number; variantId: number; quantity: number; unitPrice: number;
    productId: number; productName: string; variantTitle: string | null;
    image: string | null; sku: string; available: number;
  }>;
  couponCode: string | null;
  couponDiscount: number;
  subtotal: number;
  discountTotal: number;
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
  ) {}

  /** یافتن/ساخت سبد باز برای کاربر یا مهمان */
  private async getOrCreateCart(userId: number | null, sessionId: string | null): Promise<Cart> {
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
    const rows = await this.em.query(
      `SELECT ci.id, ci.variant_id AS variantId, ci.quantity, ci.unit_price AS unitPrice,
              v.sku, v.title AS variantTitle, v.product_id AS productId, p.name AS productName,
              (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image,
              (SELECT COALESCE(SUM(quantity - reserved),0) FROM inventory WHERE variant_id = v.id) AS available
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
      productName: r.productName,
      variantTitle: r.variantTitle,
      image: this.files.publicUrl(r.image),
      sku: r.sku,
      available: Number(r.available),
    }));

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    let couponDiscount = 0;
    let couponCode: string | null = null;
    if (cart.couponId && userId) {
      try {
        const coupon = await this.em.getRepository(Coupon).findOne({ where: { id: cart.couponId } });
        if (coupon) {
          const { discount } = await this.coupons.validate(coupon.code, userId, subtotal);
          couponDiscount = discount;
          couponCode = coupon.code;
        }
      } catch {
        couponDiscount = 0;
      }
    }

    return {
      id: cart.id,
      items,
      couponCode,
      couponDiscount,
      subtotal,
      discountTotal: couponDiscount,
      grandTotal: subtotal - couponDiscount,
    };
  }

  async addItem(userId: number | null, sessionId: string | null, variantId: number, quantity: number) {
    const variant = await this.variants.findOne({ where: { id: variantId, isActive: true } });
    if (!variant) throw new NotFoundException('تنوع محصول یافت نشد');
    const product = await this.products.findOne({ where: { id: variant.productId, status: 'published' } });
    if (!product) throw new DomainException('NOT_FOUND', 'محصول در دسترس نیست', 404);

    const cart = await this.getOrCreateCart(userId, sessionId);
    const existing = await this.items.findOne({ where: { cartId: cart.id, variantId } });
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + quantity);
      existing.unitPrice = variant.price;
      await this.items.save(existing);
    } else {
      await this.items.save(
        this.items.create({ cartId: cart.id, variantId, quantity: Math.max(1, Math.min(99, quantity)), unitPrice: variant.price }),
      );
    }
    return this.view(userId, sessionId);
  }

  async updateItem(userId: number | null, sessionId: string | null, itemId: number, quantity: number) {
    const cart = await this.getOrCreateCart(userId, sessionId);
    const item = await this.items.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('آیتم سبد یافت نشد');
    if (quantity <= 0) await this.items.remove(item);
    else {
      item.quantity = Math.min(99, quantity);
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
    const { coupon } = await this.coupons.validate(code, userId, view.subtotal);
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
        const existing = await this.items.findOne({ where: { cartId: userCart.id, variantId: gi.variantId } });
        if (existing) {
          existing.quantity = Math.min(99, existing.quantity + gi.quantity);
          await this.items.save(existing);
        } else {
          await this.items.save(this.items.create({ cartId: userCart.id, variantId: gi.variantId, quantity: gi.quantity, unitPrice: gi.unitPrice }));
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
}
