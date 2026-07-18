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

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  ready_to_ship: 'آماده ارسال',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  refunded: 'مستردشده',
};

/** گذرهای مجاز وضعیت (state machine) */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['ready_to_ship', 'cancelled', 'refunded'],
  ready_to_ship: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

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

  @Column({ type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  subtotal: number;

  @Column({ name: 'discount_total', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  discountTotal: number;

  @Column({ name: 'shipping_cost', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  shippingCost: number;

  @Column({ name: 'tax_total', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  taxTotal: number;

  @Column({ name: 'grand_total', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  grandTotal: number;

  @Column({ name: 'coupon_id', type: 'int', unsigned: true, nullable: true })
  couponId: number | null;

  @Column({ name: 'coupon_code', length: 50, nullable: true })
  couponCode: string | null;

  @Column({ name: 'shipping_method', length: 100, nullable: true })
  shippingMethod: string | null;

  @Column({ name: 'address_json', type: 'json' })
  addressJson: Record<string, unknown>;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote: string | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'placed_at', type: 'datetime', nullable: true })
  placedAt: Date | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
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

  @Column({ name: 'variant_title', length: 190, nullable: true })
  variantTitle: string | null;

  @Column({ name: 'unit_price', type: 'bigint', unsigned: true, transformer: bigint })
  unitPrice: number;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({ name: 'discount_amount', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  discountAmount: number;

  @Column({ name: 'total_price', type: 'bigint', unsigned: true, transformer: bigint })
  totalPrice: number;

  @Column({ name: 'warranty_months', type: 'int', unsigned: true, nullable: true })
  warrantyMonths: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('order_status_histories')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  @Index()
  orderId: number;

  @Column({ name: 'from_status', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', length: 30 })
  toStatus: string;

  @Column({ length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'changed_by', type: 'bigint', unsigned: true, nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
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

  @Column({ type: 'enum', enum: ['order', 'wallet_charge'], default: 'order' })
  purpose: 'order' | 'wallet_charge';

  @Column({
    type: 'enum',
    enum: ['zarinpal', 'idpay', 'zibal', 'nextpay', 'mellat', 'saman', 'manual', 'wallet', 'cod'],
  })
  gateway: PaymentGateway;

  @Column({ type: 'bigint', unsigned: true, transformer: bigint })
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

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
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

  @Column({ type: 'bigint', unsigned: true, nullable: true, transformer: bigint })
  cost: number | null;

  @Column({ name: 'shipped_at', type: 'datetime', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
