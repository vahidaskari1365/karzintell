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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unique: true })
  @Index()
  userId: number;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  balance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export type WalletTxType = 'charge' | 'debit' | 'refund' | 'withdraw';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'wallet_id', type: 'bigint' })
  @Index()
  walletId: number;

  @Column({ type: 'enum', enum: ['charge', 'debit', 'refund', 'withdraw'] })
  type: WalletTxType;

  @Column({ type: 'bigint', transformer: bigint })
  amount: number;

  @Column({ name: 'balance_after', type: 'bigint', transformer: bigint })
  balanceAfter: number;

  @Column({ name: 'reference_type', length: 30, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'bigint', nullable: true })
  referenceId: number | null;

  @Column({ length: 300, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
