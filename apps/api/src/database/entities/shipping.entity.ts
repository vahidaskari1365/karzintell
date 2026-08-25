import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigint } from './product.entity';

export const SHIPPING_METHOD_TYPES = ['post', 'tipax', 'courier', 'custom'] as const;
export type ShippingMethodType = (typeof SHIPPING_METHOD_TYPES)[number];

export const SHIPPING_METHOD_TYPE_LABELS: Record<ShippingMethodType, string> = {
  post: 'پست',
  tipax: 'تیپاکس',
  courier: 'پیک',
  custom: 'سفارشی',
};

@Entity('shipping_zones')
export class ShippingZone {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ length: 120 })
  name: string;

  /** آرایه نام استان‌ها؛ NULL = همه استان‌ها (منطقه پیش‌فرض) */
  @Column({ type: 'jsonb', nullable: true })
  provinces: string[] | null;

  /** آرایه نام شهرها؛ NULL = همه شهرهای منطقه */
  @Column({ type: 'jsonb', nullable: true })
  cities: string[] | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('shipping_methods')
export class ShippingMethod {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'zone_id', type: 'integer' })
  @Index()
  zoneId: number;

  @ManyToOne(() => ShippingZone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone?: ShippingZone;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'enum', enum: SHIPPING_METHOD_TYPES, default: 'post' })
  type: ShippingMethodType;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  cost: number;

  /** بالای این مبلغ سبد → ارسال رایگان */
  @Column({ name: 'free_above', type: 'bigint', nullable: true, transformer: bigint })
  freeAbove: number | null;

  @Column({ length: 100, nullable: true })
  eta: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
