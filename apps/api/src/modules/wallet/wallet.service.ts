import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Wallet, WalletTransaction } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async ensureWallet(userId: number, tx?: EntityManager): Promise<Wallet> {
    const repo = (tx || this.em).getRepository(Wallet);
    let wallet = await repo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await repo.save(repo.create({ userId, balance: 0 }));
    }
    return wallet;
  }

  async overview(userId: number) {
    const wallet = await this.ensureWallet(userId);
    const transactions = await this.em.getRepository(WalletTransaction).find({
      where: { walletId: wallet.id },
      order: { id: 'DESC' },
      take: 50,
    });
    return { balance: wallet.balance, transactions };
  }

  /** شارژ کیف پول (بعد از پرداخت موفق) — idempotent روی paymentId */
  async credit(input: {
    userId: number;
    amount: number;
    type: 'charge' | 'refund';
    referenceType?: string;
    referenceId?: number;
    description?: string;
  }, tx?: EntityManager) {
    const run = async (m: EntityManager) => {
      if (input.referenceType === 'payment' && input.referenceId) {
        const dup = await m.getRepository(WalletTransaction).count({
          where: { referenceType: 'payment', referenceId: input.referenceId },
        });
        if (dup) return null; // تکراری
      }
      const wallet = await this.ensureWallet(input.userId, m);
      const locked = await m.getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: wallet.id })
        .getOneOrFail();
      locked.balance = Number(locked.balance) + input.amount;
      await m.getRepository(Wallet).save(locked);
      await m.getRepository(WalletTransaction).save(
        m.getRepository(WalletTransaction).create({
          walletId: locked.id,
          type: input.type,
          amount: input.amount,
          balanceAfter: locked.balance,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          description: input.description ?? null,
        }),
      );
      return locked;
    };
    return tx ? run(tx) : this.em.transaction(run);
  }

  /** برداشت از کیف پول برای پرداخت سفارش */
  async debit(input: {
    userId: number;
    amount: number;
    orderId: number;
  }, tx: EntityManager) {
    const wallet = await this.ensureWallet(input.userId, tx);
    const locked = await tx.getRepository(Wallet)
      .createQueryBuilder('w')
      .setLock('pessimistic_write')
      .where('w.id = :id', { id: wallet.id })
      .getOneOrFail();
    if (Number(locked.balance) < input.amount)
      throw new DomainException('INSUFFICIENT_BALANCE', 'موجودی کیف پول کافی نیست', 402);
    const before = Number(locked.balance);
    locked.balance = before - input.amount;
    await tx.getRepository(Wallet).save(locked);
    await tx.getRepository(WalletTransaction).save(
      tx.getRepository(WalletTransaction).create({
        walletId: locked.id,
        type: 'debit',
        amount: input.amount,
        balanceAfter: locked.balance,
        referenceType: 'order',
        referenceId: input.orderId,
        description: 'پرداخت سفارش از کیف پول',
      }),
    );
    return locked;
  }

  /** درخواست برداشت نقدی از کیف پول به شبا */
  async requestWithdrawal(userId: number, amount: number, shaba: string, cardHolder: string) {
    if (amount < 100000) {
      throw new DomainException('BAD_REQUEST', 'حداقل مبلغ برداشت ۱۰,۰۰۰ تومان (۱۰۰,۰۰۰ ریال) است', 400);
    }
    
    return this.em.transaction(async (tx) => {
      const wallet = await this.ensureWallet(userId, tx);
      const locked = await tx.getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: wallet.id })
        .getOneOrFail();

      if (Number(locked.balance) < amount) {
        throw new DomainException('INSUFFICIENT_BALANCE', 'موجودی کیف پول کافی نیست', 402);
      }

      locked.balance = Number(locked.balance) - amount;
      await tx.getRepository(Wallet).save(locked);

      const saved = await tx.getRepository(WalletTransaction).save(
        tx.getRepository(WalletTransaction).create({
          walletId: locked.id,
          type: 'withdraw',
          amount,
          balanceAfter: locked.balance,
          description: `درخواست تسویه‌حساب نقدی به شبا ${shaba} بنام ${cardHolder} [وضعیت: در انتظار واریز]`,
        }),
      );
      return saved;
    });
  }

  /** لیست درخواست‌های تسویه حساب برای ادمین */
  async listAdminWithdrawals() {
    return this.em.getRepository(WalletTransaction).find({
      where: { type: 'withdraw' },
      order: { id: 'DESC' },
    });
  }

  /** تایید پرداخت شبا توسط ادمین */
  async approveWithdrawal(transactionId: number) {
    const txRepo = this.em.getRepository(WalletTransaction);
    const transaction = await txRepo.findOne({ where: { id: transactionId, type: 'withdraw' } });
    if (!transaction) throw new NotFoundException('درخواست تسویه یافت نشد');
    if (!transaction.description?.includes('[وضعیت: در انتظار واریز]')) {
      throw new DomainException('ALREADY_PROCESSED', 'این تراکنش قبلا پردازش شده است', 400);
    }
    transaction.description = transaction.description.replace('[وضعیت: در انتظار واریز]', '[وضعیت: واریز شد (پایا/ساتنا)]');
    await txRepo.save(transaction);
    return { approved: true };
  }

  /** رد درخواست تسویه توسط ادمین — برگشت وجه به کیف پول */
  async rejectWithdrawal(transactionId: number, reason: string) {
    return this.em.transaction(async (tx) => {
      const txRepo = tx.getRepository(WalletTransaction);
      const transaction = await txRepo.findOne({ where: { id: transactionId, type: 'withdraw' } });
      if (!transaction) throw new NotFoundException('درخواست تسویه یافت نشد');
      if (!transaction.description?.includes('[وضعیت: در انتظار واریز]')) {
        throw new DomainException('ALREADY_PROCESSED', 'این تراکنش قبلا پردازش شده است', 400);
      }

      const wallet = await tx.getRepository(Wallet).findOne({ where: { id: transaction.walletId } });
      if (!wallet) throw new NotFoundException('کیف پول یافت نشد');
      const locked = await tx.getRepository(Wallet)
        .createQueryBuilder('w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: wallet.id })
        .getOneOrFail();

      locked.balance = Number(locked.balance) + Number(transaction.amount);
      await tx.getRepository(Wallet).save(locked);

      transaction.description = transaction.description.replace('[وضعیت: در انتظار واریز]', `[وضعیت: رد شد - عودت به کیف پول — علت: ${reason || 'عدم تطابق نام شبا'}]`);
      await txRepo.save(transaction);

      // ثبت تراکنش برگشتی
      await txRepo.save(
        txRepo.create({
          walletId: locked.id,
          type: 'refund',
          amount: transaction.amount,
          balanceAfter: locked.balance,
          description: `برگشت وجه تسویه حساب رد شده تراکنش #${transaction.id}`,
        }),
      );
      return { rejected: true };
    });
  }
}
