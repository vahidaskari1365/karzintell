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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ name: 'user_id', type: 'bigint' })
  @Index()
  userId: number;

  @Column({ type: 'enum', enum: ORDER_STATUSES, default: 'pending_payment' })
  @Index()
  status: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['unpaid', 'paid', 'failed', 'partially_refunded', 'refunded'],
    default: 'unpaid',
  })
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

  @Column({ name: 'coupon_id', type: 'integer', nullable: true })
  couponId: number | null;

  @Column({ name: 'coupon_code', length: 50, nullable: true })
  couponCode: string | null;

  @Column({ name: 'shipping_method', length: 100, nullable: true })
  shippingMethod: string | null;

  @Column({ name: 'address_json', type: 'jsonb' })
  addressJson: Record<string, unknown>;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote: string | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'placed_at', type: 'timestamptz', nullable: true })
  placedAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', length: 300, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  items?: OrderItem[];
  histories?: OrderStatusHistory[];
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'order_id', type: 'bigint' })
  @Index()
  orderId: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Column({ name: 'variant_id', type: 'bigint' })
  variantId: number;

  @Column({ length: 64 })
  sku: string;

  @Column({ name: 'product_name', length: 190 })
  productName: string;

  @Column({ name: 'variant_title', length: 190, nullable: true })
  variantTitle: string | null;

  @Column({ name: 'unit_price', type: 'bigint', transformer: bigint })
  unitPrice: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ name: 'discount_amount', type: 'bigint', default: 0, transformer: bigint })
  discountAmount: number;

  @Column({ name: 'total_price', type: 'bigint', transformer: bigint })
  totalPrice: number;

  @Column({ name: 'warranty_months', type: 'integer', nullable: true })
  warrantyMonths: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('order_status_histories')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'order_id', type: 'bigint' })
  @Index()
  orderId: number;

  @Column({ name: 'from_status', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', length: 30 })
  toStatus: string;

  @Column({ length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'changed_by', type: 'bigint', nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export type PaymentStatusRow = 'initiated' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  @Index()
  orderId: number | null;

  @Column({ type: 'enum', enum: ['order', 'wallet_charge'], default: 'order' })
  purpose: 'order' | 'wallet_charge';

  @Column({
    type: 'enum',
    enum: ['zarinpal', 'idpay', 'zibal', 'nextpay', 'mellat', 'saman', 'manual', 'wallet', 'cod'],
  })
  gateway: PaymentGateway;

  @Column({ type: 'bigint', transformer: bigint })
  amount: number;

  @Column({ length: 3, default: 'IRR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'initiated',
  })
  status: PaymentStatusRow;

  @Column({ length: 100, nullable: true })
  authority: string | null;

  @Column({ name: 'ref_id', length: 100, nullable: true })
  refId: string | null;

  @Column({ name: 'card_pan', length: 20, nullable: true })
  cardPan: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'order_id', type: 'bigint' })
  @Index()
  orderId: number;

  @Column({ length: 50, default: 'post' })
  provider: string;

  @Column({ length: 100, nullable: true })
  method: string | null;

  @Column({ name: 'tracking_code', length: 50, nullable: true })
  trackingCode: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'picked_up', 'in_transit', 'delivered', 'returned'],
    default: 'pending',
  })
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';

  @Column({ type: 'bigint', nullable: true, transformer: bigint })
  cost: number | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
