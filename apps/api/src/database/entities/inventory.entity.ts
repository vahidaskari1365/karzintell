import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 30, unique: true })
  code: string;

  @Column({ length: 50, nullable: true })
  province: string | null;

  @Column({ length: 50, nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'postal_code', length: 10, nullable: true })
  postalCode: string | null;

  @Column({ length: 15, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('inventory')
export class Inventory {
  @PrimaryColumn({ name: 'variant_id', type: 'bigint', unsigned: true })
  variantId: number;

  @PrimaryColumn({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId: number;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  reserved: number;

  @Column({ name: 'low_stock_threshold', default: 5 })
  lowStockThreshold: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export type StockMovementType = 'in' | 'out' | 'reserve' | 'release' | 'return' | 'adjust';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'variant_id', type: 'bigint', unsigned: true })
  @Index()
  variantId: number;

  @Column({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId: number;

  @Column({ type: 'enum', enum: ['in', 'out', 'reserve', 'release', 'return', 'adjust'] })
  type: StockMovementType;

  @Column()
  quantity: number;

  @Column({ name: 'qty_before' })
  qtyBefore: number;

  @Column({ name: 'qty_after' })
  qtyAfter: number;

  @Column({ name: 'reference_type', length: 30, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'bigint', unsigned: true, nullable: true })
  referenceId: number | null;

  @Column({ length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'bigint', unsigned: true, nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
