import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigint } from './product.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, unique: true })
  @Index()
  userId: number;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  balance: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

export type WalletTxType = 'charge' | 'debit' | 'refund' | 'withdraw';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'wallet_id', type: 'bigint', unsigned: true })
  @Index()
  walletId: number;

  @Column({ type: 'varchar', length: 20 })
  type: WalletTxType;

  @Column({ type: 'bigint', transformer: bigint })
  amount: number;

  @Column({ name: 'balance_after', type: 'bigint', transformer: bigint })
  balanceAfter: number;

  @Column({ type: 'varchar', name: 'reference_type', length: 30, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'bigint', unsigned: true, nullable: true })
  referenceId: number | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
