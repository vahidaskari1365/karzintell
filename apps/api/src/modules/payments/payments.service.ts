import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Order, Payment, PaymentGateway } from '../../database/entities';
import { env } from '../../config/configuration';
import { uuid } from '../../common/utils';
import { DomainException } from '../../common/http-exception.filter';
import { OrdersService } from '../orders/orders.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * پرداخت: آداپتور چنددرگاهی.
 * - manual: درگاه توسعه — فوری موفق می‌شود (برای تست بدون مرچنت)
 * - zarinpal: درگاه واقعی (سندباکس/تولید)
 * - wallet: پرداخت از کیف پول (داخلی)
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly ordersService: OrdersService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  private zarinpalBase() {
    return env.payment.zarinpalSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://payment.zarinpal.com/pg/v4/payment';
  }

  /** شروع پرداخت برای سفارش */
  async init(userId: number, orderCode: string, gateway: PaymentGateway) {
    const order = await this.orders.findOne({ where: { code: orderCode, userId } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    if (order.status !== 'pending_payment' || order.paymentStatus === 'paid')
      throw new DomainException('ORDER_NOT_PAYABLE', 'این سفارش قابل پرداخت نیست', 409);

    // بستن پرداخت‌های ناتمام قبلی
    await this.payments.update(
      { orderId: order.id, status: 'initiated' },
      { status: 'cancelled' },
    );

    if (gateway === 'wallet') {
      return this.payWithWallet(order);
    }

    const payment = await this.payments.save(
      this.payments.create({
        orderId: order.id,
        purpose: 'order',
        gateway,
        amount: order.grandTotal,
        status: gateway === 'manual' ? 'pending' : 'initiated',
        authority: gateway === 'manual' ? `MAN-${uuid()}` : null,
      }),
    );

    if (gateway === 'manual') {
      // درگاه توسعه: مستقیم به callback می‌رویم
      return {
        paymentId: payment.id,
        gateway,
        redirectUrl: `${env.payment.callbackUrl}/manual?authority=${payment.authority}`,
      };
    }

    if (gateway === 'zarinpal') {
      if (!env.payment.zarinpalMerchantId)
        throw new DomainException('GATEWAY_NOT_CONFIGURED', 'مرچنت‌کد زرین‌پال تنظیم نشده است — از manual استفاده کنید', 400);

      const res = await fetch(`${this.zarinpalBase()}/request.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: env.payment.zarinpalMerchantId,
          amount: Number(order.grandTotal),
          callback_url: `${env.payment.callbackUrl}/zarinpal`,
          description: `پرداخت سفارش ${order.code} - کارزینتل`,
        }),
      });
      const json: any = await res.json().catch(() => ({}));
      const authority = json?.data?.authority;
      const code = json?.data?.code;
      if (!authority || code !== 100) {
        await this.payments.update(payment.id, { status: 'failed', payload: json });
        throw new DomainException('PAYMENT_FAILED', json?.errors?.message || 'خطا در اتصال به درگاه پرداخت', 402);
      }
      await this.payments.update(payment.id, { authority, status: 'pending', payload: json });
      const base = env.payment.zarinpalSandbox ? 'https://sandbox.zarinpal.com/pg/StartPay' : 'https://payment.zarinpal.com/pg/StartPay';
      return { paymentId: payment.id, gateway, redirectUrl: `${base}/${authority}` };
    }

    throw new DomainException('BAD_REQUEST', 'درگاه پرداخت پشتیبانی نمی‌شود', 400);
  }

  /** پرداخت از کیف پول — در یک تراکنش */
  private async payWithWallet(order: Order) {
    return this.em.transaction(async (tx) => {
      await this.wallet.debit({ userId: order.userId, amount: order.grandTotal, orderId: order.id }, tx);
      const payment = await tx.getRepository(Payment).save(
        tx.getRepository(Payment).create({
          orderId: order.id,
          purpose: 'order',
          gateway: 'wallet',
          amount: order.grandTotal,
          status: 'paid',
          authority: `WLT-${uuid()}`,
          paidAt: new Date(),
        }),
      );
      const paid = await this.ordersService.markPaid(order.id, tx);
      return { paymentId: payment.id, gateway: 'wallet', redirectUrl: this.resultUrl(paid!.code, 'success'), orderCode: paid!.code };
    });
  }

  /** callback درگاه‌ها (GET) → تایید و ریدایرکت به فرانت */
  async handleCallback(gateway: string, query: Record<string, string>) {
    const authority = query.authority || query.Authority;
    const status = query.status || query.Status;

    const payment = await this.payments.findOne({ where: { gateway: gateway as PaymentGateway, authority } });
    if (!payment) return { redirectUrl: this.resultUrl('', 'failed', 'تراکنش یافت نشد') };

    // تکراری → فقط ریدایرکت
    if (payment.status === 'paid') {
      const order = payment.orderId ? await this.orders.findOne({ where: { id: payment.orderId } }) : null;
      return { redirectUrl: this.resultUrl(order?.code || '', 'success') };
    }

    let success = false;
    let refId: string | null = null;
    let verifyPayload: any = null;

    if (gateway === 'manual') {
      success = true;
      refId = `DEV-${Date.now()}`;
    } else if (gateway === 'zarinpal') {
      if (status === 'OK') {
        try {
          const res = await fetch(`${this.zarinpalBase()}/verify.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchant_id: env.payment.zarinpalMerchantId,
              amount: Number(payment.amount),
              authority: payment.authority,
            }),
          });
          const json: any = await res.json().catch(() => ({}));
          verifyPayload = json;
          success = json?.data?.code === 100 || json?.data?.code === 101;
          refId = json?.data?.ref_id ? String(json.data.ref_id) : null;
        } catch (e) {
          this.logger.warn(`zarinpal verify failed: ${(e as Error).message}`);
        }
      }
    }

    if (!success) {
      await this.payments.update(payment.id, { status: 'failed', payload: verifyPayload });
      const order = payment.orderId ? await this.orders.findOne({ where: { id: payment.orderId } }) : null;
      return { redirectUrl: this.resultUrl(order?.code || '', 'failed', 'پرداخت ناموفق یا لغو شد') };
    }

    const finalOrderCode = await this.em.transaction(async (tx) => {
      await tx.getRepository(Payment).update(payment.id, {
        status: 'paid', refId, paidAt: new Date(), payload: verifyPayload,
      });
      if (payment.purpose === 'wallet_charge') {
        // userId واقعی در payload زمان init ذخیره شده است
        const meta = (payment.payload as any) || {};
        if (meta.walletUserId)
          await this.wallet.credit({
            userId: meta.walletUserId, amount: Number(payment.amount), type: 'charge',
            referenceType: 'payment', referenceId: payment.id, description: 'شارژ کیف پول',
          }, tx);
        return '';
      }
      const paid = await this.ordersService.markPaid(payment.orderId!, tx);
      return paid!.code;
    });

    if (payment.orderId) {
      const order = await this.orders.findOne({ where: { id: payment.orderId } });
      if (order) await this.ordersService.notifyPaid(order);
    }

    return { redirectUrl: this.resultUrl(finalOrderCode, 'success') };
  }

  /** شارژ کیف پول از طریق درگاه */
  async initWalletCharge(userId: number, amount: number, gateway: PaymentGateway) {
    if (amount < 1000) throw new DomainException('BAD_REQUEST', 'حداقل مبلغ شارژ ۱۰۰۰ ریال است', 400);
    const payment = await this.payments.save(
      this.payments.create({
        orderId: null,
        purpose: 'wallet_charge',
        gateway,
        amount,
        status: gateway === 'manual' ? 'pending' : 'initiated',
        authority: gateway === 'manual' ? `MAN-${uuid()}` : null,
        payload: { walletUserId: userId },
      }),
    );
    if (gateway === 'manual') {
      // توسعه: فوری شارژ می‌شود
      await this.em.transaction(async (tx) => {
        await tx.getRepository(Payment).update(payment.id, { status: 'paid', paidAt: new Date(), refId: `DEV-${Date.now()}` });
        await this.wallet.credit({ userId, amount, type: 'charge', referenceType: 'payment', referenceId: payment.id, description: 'شارژ کیف پول' }, tx);
      });
      return { paymentId: payment.id, gateway, redirectUrl: this.resultUrl('', 'success') };
    }
    if (gateway === 'zarinpal') {
      if (!env.payment.zarinpalMerchantId)
        throw new DomainException('GATEWAY_NOT_CONFIGURED', 'مرچنت‌کد زرین‌پال تنظیم نشده است', 400);
      const res = await fetch(`${this.zarinpalBase()}/request.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: env.payment.zarinpalMerchantId,
          amount,
          callback_url: `${env.payment.callbackUrl}/zarinpal`,
          description: 'شارژ کیف پول کارزینتل',
        }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (json?.data?.code === 100 && json.data.authority) {
        await this.payments.update(payment.id, { authority: json.data.authority, status: 'pending', payload: { ...json, walletUserId: userId } });
        const base = env.payment.zarinpalSandbox ? 'https://sandbox.zarinpal.com/pg/StartPay' : 'https://payment.zarinpal.com/pg/StartPay';
        return { paymentId: payment.id, gateway, redirectUrl: `${base}/${json.data.authority}` };
      }
      throw new DomainException('PAYMENT_FAILED', 'خطا در اتصال به درگاه', 402);
    }
    throw new DomainException('BAD_REQUEST', 'درگاه پشتیبانی نمی‌شود', 400);
  }

  /** بازپرداخت (ادمین): به کیف پول کاربر برمی‌گردد + سفارش refunded */
  async refund(orderId: number, adminId: number, note?: string) {
    return this.em.transaction(async (tx) => {
      const order = await tx.getRepository(Order).findOne({ where: { id: orderId } });
      if (!order) throw new NotFoundException('سفارش یافت نشد');
      if (order.paymentStatus !== 'paid')
        throw new DomainException('BAD_REQUEST', 'فقط سفارش پرداخت‌شده قابل بازپرداخت است', 409);

      const payment = await tx.getRepository(Payment).findOne({
        where: { orderId, status: 'paid' },
        order: { id: 'DESC' },
      });
      await this.wallet.credit({
        userId: order.userId, amount: order.grandTotal, type: 'refund',
        referenceType: 'order', referenceId: order.id,
        description: `بازپرداخت سفارش ${order.code}${note ? ` — ${note}` : ''}`,
      }, tx);

      if (payment) await tx.getRepository(Payment).update(payment.id, { status: 'refunded' });
      await tx.getRepository(Order).update(orderId, { paymentStatus: 'refunded' });
      await this.ordersService.changeStatus(orderId, 'refunded', note, adminId);
      return { refunded: true };
    });
  }

  async adminList(page?: string, limit?: string) {
    const p = { page: Math.max(1, Number(page) || 1), limit: Math.min(50, Number(limit) || 20) };
    const [items, total] = await this.payments.findAndCount({
      order: { id: 'DESC' },
      skip: (p.page - 1) * p.limit,
      take: p.limit,
    });
    return { items, total, ...p };
  }

  private resultUrl(orderCode: string, status: 'success' | 'failed', reason?: string) {
    const url = new URL(env.payment.frontendResultUrl);
    if (orderCode) url.searchParams.set('orderCode', orderCode);
    url.searchParams.set('status', status);
    if (reason) url.searchParams.set('reason', reason);
    return url.toString();
  }
}
