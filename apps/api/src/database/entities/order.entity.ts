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
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from './order-status';
import type { OrderStatus } from './order-status';
// ثابت‌ها در order-status.ts (ماژول خالص قابل تست) تعریف شده‌اند
export { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_TRANSITIONS };
export type { OrderStatus } from './order-status';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'partially_refunded' | 'refunded';
export const PAYMENT_GATEWAYS = ['zarinpal', 'idpay', 'nextpay', 'mellat', 'saman', 'zibal', 'manual', 'wallet', 'cod'] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 30, default: 'pending_payment' })
  @Index()
  status: OrderStatus;

  @Column({ name: 'payment_status', type: 'varchar', length: 30, default: 'unpaid' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  subtotal: number;

  @Column({ name: 'discount_total', type: 'bigint', default: 0, transformer: bigint })
  discountTotal: number;

  @Column({ name: 'shipping_cost', type: 'bigint', default: 0, transformer: bigint })
  shippingCost: number;

  @Column({ name: 'tax_total', type: 'bigint', default: 0, transformer: bigint })
  taxTotal: number;

  @Column({ name: 'grand_total', type: 'bigint', default: 0, transformer: bigint })
  grandTotal: number;

  @Column({ name: 'coupon_id', type: 'int', unsigned: true, nullable: true })
  couponId: number | null;

  @Column({ type: 'varchar', name: 'coupon_code', length: 50, nullable: true })
  couponCode: string | null;

  @Column({ type: 'varchar', name: 'shipping_method', length: 100, nullable: true })
  shippingMethod: string | null;

  // MySQL uses json instead of jsonb
  @Column({ name: 'address_json', type: 'json' })
  addressJson: Record<string, unknown>;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote: string | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'placed_at', type: 'datetime', nullable: true })
  placedAt: Date | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', name: 'cancel_reason', length: 300, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime' })
  deletedAt: Date | null;

  items?: OrderItem[];
  histories?: OrderStatusHistory[];
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  @Index()
  orderId: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  productId: number;

  @Column({ name: 'variant_id', type: 'bigint', unsigned: true })
  variantId: number;

  @Column({ length: 64 })
  sku: string;

  @Column({ name: 'product_name', length: 190 })
  productName: string;

  @Column({ type: 'varchar', name: 'variant_title', length: 190, nullable: true })
  variantTitle: string | null;

  @Column({ name: 'unit_price', type: 'bigint', transformer: bigint })
  unitPrice: number;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({ name: 'discount_amount', type: 'bigint', default: 0, transformer: bigint })
  discountAmount: number;

  @Column({ name: 'total_price', type: 'bigint', transformer: bigint })
  totalPrice: number;

  @Column({ name: 'warranty_months', type: 'int', unsigned: true, nullable: true })
  warrantyMonths: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('order_status_histories')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  @Index()
  orderId: number;

  @Column({ type: 'varchar', name: 'from_status', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', length: 30 })
  toStatus: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'changed_by', type: 'bigint', unsigned: true, nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

export type PaymentStatusRow = 'initiated' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true, nullable: true })
  @Index()
  orderId: number | null;

  @Column({ type: 'varchar', length: 20, default: 'order' })
  purpose: 'order' | 'wallet_charge';

  @Column({ type: 'varchar', length: 20 })
  gateway: PaymentGateway;

  @Column({ type: 'bigint', transformer: bigint })
  amount: number;

  @Column({ length: 3, default: 'IRR' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'initiated' })
  status: PaymentStatusRow;

  @Column({ type: 'varchar', length: 100, nullable: true })
  authority: string | null;

  @Column({ type: 'varchar', name: 'ref_id', length: 100, nullable: true })
  refId: string | null;

  @Column({ type: 'varchar', name: 'card_pan', length: 20, nullable: true })
  cardPan: string | null;

  // MySQL uses json instead of jsonb
  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  @Index()
  orderId: number;

  @Column({ length: 50, default: 'post' })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  method: string | null;

  @Column({ type: 'varchar', name: 'tracking_code', length: 50, nullable: true })
  trackingCode: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  cost: number | null;

  @Column({ name: 'shipped_at', type: 'datetime', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
