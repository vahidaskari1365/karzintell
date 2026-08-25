import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type StockAlertType = 'low_stock' | 'out_of_stock';
export type StockAlertStatus = 'open' | 'resolved';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'variant_id', type: 'bigint' })
  variantId: number;

  @Column({ name: 'warehouse_id', type: 'integer' })
  warehouseId: number;

  @Column({ default: 0 })
  available: number;

  @Column({ default: 5 })
  threshold: number;

  @Column({ name: 'alert_type', type: 'enum', enum: ['low_stock', 'out_of_stock'] })
  alertType: StockAlertType;

  @Column({ type: 'enum', enum: ['open', 'resolved'], default: 'open' })
  status: StockAlertStatus;

  @Column({ name: 'last_notified_at', type: 'timestamptz', nullable: true })
  lastNotifiedAt: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
