import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigint } from './product.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 10 })
  type: 'percent' | 'fixed';

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: bigint })
  value: number;

  @Column({ name: 'max_discount', type: 'bigint', nullable: true, transformer: bigint })
  maxDiscount: number | null;

  @Column({ name: 'min_cart_amount', type: 'bigint', default: 0, transformer: bigint })
  minCartAmount: number;

  @Column({ name: 'usage_limit', type: 'int', unsigned: true, nullable: true })
  usageLimit: number | null;

  @Column({ name: 'per_user_limit', type: 'int', unsigned: true, default: 1 })
  perUserLimit: number;

  @Column({ name: 'used_count', type: 'int', unsigned: true, default: 0 })
  usedCount: number;

  /** نام کمپین (گروه‌بندی کوپن‌ها) */
  @Column({ type: 'varchar', length: 120, nullable: true })
  campaign: string | null;

  /** فقط روی این محصول‌ها؛ NULL = همه - MySQL uses json instead of jsonb */
  @Column({ name: 'product_ids', type: 'json', nullable: true })
  productIds: number[] | null;

  /** فقط روی این دسته‌ها؛ NULL = همه - MySQL uses json instead of jsonb */
  @Column({ name: 'category_ids', type: 'json', nullable: true })
  categoryIds: number[] | null;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime' })
  deletedAt: Date | null;
}

export type CartStatus = 'open' | 'merged' | 'converted' | 'abandoned';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  @Index()
  userId: number | null;

  @Column({ name: 'session_id', type: 'varchar', length: 36, nullable: true })
  @Index()
  sessionId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: CartStatus;

  @Column({ name: 'coupon_id', type: 'int', unsigned: true, nullable: true })
  couponId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'cart_id', type: 'bigint', unsigned: true })
  @Index()
  cartId: number;

  @Column({ name: 'variant_id', type: 'bigint', unsigned: true })
  variantId: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'bigint', transformer: bigint })
  unitPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('coupon_usages')
export class CouponUsage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'coupon_id', type: 'int', unsigned: true })
  couponId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  @Index()
  userId: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'discount_amount', type: 'bigint', transformer: bigint })
  discountAmount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
