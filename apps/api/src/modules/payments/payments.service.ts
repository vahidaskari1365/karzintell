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
import { SettingsService } from '../settings/settings.service';
import { gatewayAdapter, GATEWAY_ADAPTERS } from './gateways';

/**
 * پرداخت: آداپتور چنددرگاهی.
 * - manual: درگاه توسعه — فوری موفق می‌شود (برای تست بدون مرچنت)
 * - zarinpal / idpay / nextpay / mellat (به‌پرداخت) / saman (SEP): درگاه‌های واقعی
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
    private readonly settings: SettingsService,
  ) {}

  /** درگاه‌های فعال و قابل استفاده برای چک‌اوت (قابل مدیریت از تنظیمات فروشگاه) */
  async listGateways(userId?: number) {
    const list: Array<{ key: string; title: string; description?: string }> = [];
    // فیلتر درگاه‌ها از تنظیمات (JSON)؛ «همه» = پیش‌فرض
    let enabled: string[] | null = null;
    try {
      const raw = await this.settings.get('payment.gateways_enabled', '');
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) enabled = parsed;
      }
    } catch { /* نادیده بگیر */ }

    for (const [key, adapter] of Object.entries(GATEWAY_ADAPTERS)) {
      if (adapter.isConfigured() && (!enabled || enabled.includes(key)))
        list.push({ key, title: adapter.title, description: 'پرداخت آنلاین امن' });
    }
    if (env.isDev || !list.length) list.push({ key: 'manual', title: 'درگاه آزمایشی', description: 'تست توسعه — فوری موفق می‌شود' });
    if (!enabled || enabled.includes('wallet'))
      list.push({ key: 'wallet', title: 'کیف پول', description: 'پرداخت از موجودی کیف پول کارزینتل' });
    return { items: list, default: list[0]?.key ?? 'manual' };
  }

  /** شروع پرداخت برای سفارش */
  async init(userId: number, orderCode: string, gateway: PaymentGateway) {
    const order = await this.orders.findOne({ where: { code: orderCode, userId } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    if (order.status !== 'pending_payment' || order.paymentStatus === 'paid')
      throw new DomainException('ORDER_NOT_PAYABLE', 'این سفارش قابل پرداخت نیست', 409);

    // بستن پرداخت‌های ناتمام قبلی
    await this.payments.update({ orderId: order.id, status: 'initiated' }, { status: 'cancelled' });
    await this.payments.update({ orderId: order.id, status: 'pending' }, { status: 'cancelled' });

    if (gateway === 'wallet') return this.payWithWallet(order);

    if (gateway === 'manual') {
      const payment = await this.payments.save(
        this.payments.create({
          orderId: order.id, purpose: 'order', gateway, amount: order.grandTotal,
          status: 'pending', authority: `MAN-${uuid()}`,
        }),
      );
      return { paymentId: payment.id, gateway, redirectUrl: `${env.payment.callbackUrl}/manual?authority=${payment.authority}` };
    }

    const adapter = gatewayAdapter(gateway);
    if (!adapter) throw new DomainException('BAD_REQUEST', 'درگاه پرداخت پشتیبانی نمی‌شود', 400);
    if (!adapter.isConfigured())
      throw new DomainException('GATEWAY_NOT_CONFIGURED', `درگاه «${adapter.title}» هنوز تنظیم نشده است`, 400);

    const addr = order.addressJson as any;
    const payment = await this.payments.save(
      this.payments.create({ orderId: order.id, purpose: 'order', gateway, amount: order.grandTotal, status: 'initiated' }),
    );

    try {
      const start = await adapter.request({
        paymentId: payment.id,
        amount: Number(order.grandTotal),
        description: `پرداخت سفارش ${order.code} - کارزینتل`,
        callbackUrl: env.payment.callbackUrl,
        mobile: addr?.receiverPhone ?? null,
      });
      await this.payments.update(payment.id, { authority: start.authority, status: 'pending', payload: start.payload as any });
      return { paymentId: payment.id, gateway, redirectUrl: start.redirectUrl };
    } catch (e) {
      await this.payments.update(payment.id, { status: 'failed', payload: { error: (e as Error).message } });
      throw new DomainException('PAYMENT_FAILED', (e as Error).message || 'خطا در اتصال به درگاه پرداخت', 402);
    }
  }

  /** پرداخت از کیف پول — در یک تراکنش */
  private async payWithWallet(order: Order) {
    return this.em.transaction(async (tx) => {
      await this.wallet.debit({ userId: order.userId, amount: order.grandTotal, orderId: order.id }, tx);
      const payment = await tx.getRepository(Payment).save(
        tx.getRepository(Payment).create({
          orderId: order.id, purpose: 'order', gateway: 'wallet', amount: order.grandTotal,
          status: 'paid', authority: `WLT-${uuid()}`, paidAt: new Date(),
        }),
      );
      const paid = await this.ordersService.markPaid(order.id, tx);
      return { paymentId: payment.id, gateway: 'wallet', redirectUrl: this.resultUrl(paid!.code, 'success'), orderCode: paid!.code };
    });
  }

  /** callback درگاه‌ها (GET یا POST) → تایید و ریدایرکت به فرانت */
  async handleCallback(gateway: string, query: Record<string, string>) {
    let authority = query.authority || query.Authority || null;
    const adapter = gatewayAdapter(gateway);
    if (!authority && adapter) authority = adapter.extractAuthority(query);

    let payment: Payment | null = null;
    if (authority) payment = await this.payments.findOne({ where: { gateway: gateway as PaymentGateway, authority } });
    // ملت/سامان: authority گاهی در callback نمی‌آید → از روی شناسه سفارش درگاه (= payment.id)
    if (!payment) {
      const pid = Number(query.SaleOrderId || query.ResNum || query.order_id);
      if (pid) {
        payment = await this.payments.findOne({ where: { id: pid, gateway: gateway as PaymentGateway } });
        if (payment && !payment.authority && authority) {
          await this.payments.update(payment.id, { authority });
          payment.authority = authority;
        }
      }
    }
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
    } else if (adapter) {
      try {
        const result = await adapter.verify(payment, query);
        success = result.success;
        refId = result.refId;
        verifyPayload = result.payload ?? null;
      } catch (e) {
        this.logger.warn(`${gateway} verify failed: ${(e as Error).message}`);
      }
    }

    if (!success) {
      await this.payments.update(payment.id, { status: 'failed', payload: verifyPayload ?? query });
      const order = payment.orderId ? await this.orders.findOne({ where: { id: payment.orderId } }) : null;
      return { redirectUrl: this.resultUrl(order?.code || '', 'failed', 'پرداخت ناموفق یا لغو شد') };
    }

    const finalOrderCode = await this.em.transaction(async (tx) => {
      await tx.getRepository(Payment).update(payment.id, {
        status: 'paid', refId, paidAt: new Date(), payload: verifyPayload ?? query,
      });
      if (payment.purpose === 'wallet_charge') {
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

    if (gateway === 'manual') {
      const payment = await this.payments.save(
        this.payments.create({
          orderId: null, purpose: 'wallet_charge', gateway, amount,
          status: 'pending', authority: `MAN-${uuid()}`, payload: { walletUserId: userId },
        }),
      );
      await this.em.transaction(async (tx) => {
        await tx.getRepository(Payment).update(payment.id, { status: 'paid', paidAt: new Date(), refId: `DEV-${Date.now()}` });
        await this.wallet.credit({ userId, amount, type: 'charge', referenceType: 'payment', referenceId: payment.id, description: 'شارژ کیف پول' }, tx);
      });
      return { paymentId: payment.id, gateway, redirectUrl: this.resultUrl('', 'success') };
    }

    const adapter = gatewayAdapter(gateway);
    if (!adapter || !adapter.isConfigured())
      throw new DomainException('GATEWAY_NOT_CONFIGURED', 'این درگاه برای شارژ کیف پول در دسترس نیست', 400);

    const payment = await this.payments.save(
      this.payments.create({
        orderId: null, purpose: 'wallet_charge', gateway, amount,
        status: 'initiated', payload: { walletUserId: userId },
      }),
    );
    try {
      const start = await adapter.request({
        paymentId: payment.id, amount,
        description: 'شارژ کیف پول کارزینتل',
        callbackUrl: env.payment.callbackUrl,
      });
      await this.payments.update(payment.id, {
        authority: start.authority, status: 'pending',
        payload: { ...((start.payload as any) || {}), walletUserId: userId },
      });
      return { paymentId: payment.id, gateway, redirectUrl: start.redirectUrl };
    } catch (e) {
      await this.payments.update(payment.id, { status: 'failed' });
      throw new DomainException('PAYMENT_FAILED', 'خطا در اتصال به درگاه', 402);
    }
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
