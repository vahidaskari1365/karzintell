import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type StockAlertType = 'low_stock' | 'out_of_stock';
export type StockAlertStatus = 'open' | 'resolved';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'variant_id', type: 'bigint', unsigned: true })
  variantId: number;

  @Column({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  available: number;

  @Column({ type: 'int', unsigned: true, default: 5 })
  threshold: number;

  @Column({ type: 'varchar', length: 30 })
  alertType: StockAlertType;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: StockAlertStatus;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'last_notified_at', type: 'datetime', nullable: true })
  lastNotifiedAt: Date | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
