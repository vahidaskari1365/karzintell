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
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 120 })
  name: string;

  /** آرایه نام استان‌ها؛ NULL = همه استان‌ها (منطقه پیش‌فرض) - MySQL uses json instead of jsonb */
  @Column({ type: 'json', nullable: true })
  provinces: string[] | null;

  /** آرایه نام شهرها؛ NULL = همه شهرهای منطقه - MySQL uses json instead of jsonb */
  @Column({ type: 'json', nullable: true })
  cities: string[] | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('shipping_methods')
export class ShippingMethod {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'zone_id', type: 'int', unsigned: true })
  @Index()
  zoneId: number;

  @ManyToOne(() => ShippingZone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone?: ShippingZone;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'post' })
  type: ShippingMethodType;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  cost: number;

  /** بالای این مبلغ سبد → ارسال رایگان */
  @Column({ name: 'free_above', type: 'bigint', nullable: true, transformer: bigint })
  freeAbove: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eta: string | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
