import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { EntityManager, LessThan, Repository } from 'typeorm';
import {
  Order, OrderItem, OrderStatusHistory, ORDER_STATUS_LABELS, ORDER_TRANSITIONS,
  OrderStatus, Payment, Shipment, UserAddress,
} from '../../database/entities';
import { env } from '../../config/configuration';
import { humanCode, paginate } from '../../common/utils';
import { DomainException } from '../../common/http-exception.filter';
import { RedisService } from '../../common/redis.service';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../../common/types';

export interface CheckoutInput {
  addressId: number;
  shippingMethod?: string;
  customerNote?: string;
  couponCode?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('Orders');

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory) private readonly histories: Repository<OrderStatusHistory>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Shipment) private readonly shipments: Repository<Shipment>,
    @InjectRepository(UserAddress) private readonly addresses: Repository<UserAddress>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly cart: CartService,
    private readonly coupons: CouponsService,
    private readonly inventory: InventoryService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
  ) {}

  /**
   * ثبت سفارش (Idempotent با Idempotency-Key):
   * یک تراکنش: ایجاد سفارش + اقلام + رزرو موجودی + مصرف کوپن + بستن سبد
   */
  async checkout(user: AuthUser, input: CheckoutInput, idemKey?: string, ip?: string, ua?: string) {
    if (idemKey) {
      const existing = await this.redis.get(`idem:checkout:${user.id}:${idemKey}`);
      if (existing) {
        const order = await this.orders.findOne({ where: { code: existing } });
        if (order) return this.detailForUser(user.id, order.code);
      }
    }

    const { cart, view } = await this.cart.getUserCartOrFail(user.id);
    const address = await this.addresses.findOne({ where: { id: input.addressId, userId: user.id } });
    if (!address) throw new DomainException('NOT_FOUND', 'آدرس انتخاب‌شده معتبر نیست', 404);

    // قیمت‌های تازه از دیتابیس (نه کش سبد)
    const variantIds = view.items.map((i) => i.variantId);
    const freshVariants = await this.em.query(
      `SELECT v.id, v.price, v.sku, v.title, v.product_id AS productId, v.is_active AS isActive,
              p.name AS productName, p.status AS productStatus, p.warranty_months AS warrantyMonths
       FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.id IN (${variantIds.map(() => '?').join(',')}) AND v.deleted_at IS NULL AND p.deleted_at IS NULL`,
      variantIds,
    );
    const variantById = new Map<number, any>(freshVariants.map((v: any) => [Number(v.id), v]));

    const lines: Array<{ variantId: number; quantity: number; unitPrice: number; row: any }> = [];
    for (const item of view.items) {
      const v = variantById.get(item.variantId);
      if (!v || !v.isActive || v.productStatus !== 'published')
        throw new DomainException('OUT_OF_STOCK', `محصول «${item.productName}» دیگر در دسترس نیست`, 409);
      lines.push({ variantId: item.variantId, quantity: item.quantity, unitPrice: Number(v.price), row: v });
    }

    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    let discount = 0;
    let coupon: any = null;
    const couponCode = input.couponCode || view.couponCode;
    if (couponCode) {
      const result = await this.coupons.validate(couponCode, user.id, subtotal);
      coupon = result.coupon;
      discount = result.discount;
    }
    const tax = Math.round(((subtotal - discount) * env.order.taxPercent) / 100);
    const shippingCost = 0; // تعرفه ارسال در مرحله‌های بعد (روش‌های ارسال)
    const grandTotal = subtotal - discount + tax + shippingCost;

    const addressSnapshot = {
      receiverName: address.receiverName,
      receiverPhone: address.receiverPhone,
      province: address.province,
      city: address.city,
      postalCode: address.postalCode,
      address: address.address,
      plaque: address.plaque,
      unit: address.unit,
    };

    const order = await this.em.transaction(async (tx) => {
      const saved = await tx.getRepository(Order).save(
        tx.getRepository(Order).create({
          code: humanCode('KRZ'),
          userId: user.id,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          subtotal,
          discountTotal: discount,
          shippingCost,
          taxTotal: tax,
          grandTotal,
          couponId: coupon?.id ?? null,
          couponCode: coupon?.code ?? null,
          shippingMethod: input.shippingMethod || 'پست پیشتاز',
          addressJson: addressSnapshot,
          customerNote: input.customerNote ?? null,
          ip: ip ?? null,
          userAgent: ua ? ua.slice(0, 255) : null,
          placedAt: new Date(),
        }),
      );

      await tx.getRepository(OrderItem).save(
        lines.map((l) => tx.getRepository(OrderItem).create({
          orderId: saved.id,
          productId: l.row.productId,
          variantId: l.variantId,
          sku: l.row.sku,
          productName: l.row.productName,
          variantTitle: l.row.title,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          discountAmount: discount ? Math.floor((l.unitPrice * l.quantity / subtotal) * discount) : 0,
          totalPrice: l.unitPrice * l.quantity,
          warrantyMonths: l.row.warrantyMonths,
        })),
      );

      await this.inventory.reserve(
        lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        saved.id,
        tx,
      );

      if (coupon) await this.coupons.consume(coupon, user.id, saved.id, discount, tx);

      await this.cart.markConverted(cart.id, tx);
      await this.addHistory(saved.id, null, 'pending_payment', 'ثبت سفارش', null, tx);
      return saved;
    });

    if (idemKey) await this.redis.set(`idem:checkout:${user.id}:${idemKey}`, order.code, 86400);
    return this.detailForUser(user.id, order.code);
  }

  /** علامت‌گذاری پرداخت‌شده (از ماژول پرداخت صدا زده می‌شود) */
  async markPaid(orderId: number, tx: EntityManager) {
    const order = await tx.getRepository(Order).findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    if (order.paymentStatus === 'paid') return order; // idempotent

    const items = await tx.getRepository(OrderItem).find({ where: { orderId } });
    await this.inventory.commit(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), orderId, tx);

    await tx.getRepository(Order).update(orderId, {
      status: 'paid',
      paymentStatus: 'paid',
      paidAt: new Date(),
    });
    await this.addHistory(orderId, order.status, 'paid', 'پرداخت موفق', null, tx);
    return tx.getRepository(Order).findOne({ where: { id: orderId } });
  }

  async notifyPaid(order: Order) {
    await this.notifications.notify(
      order.userId,
      'order.paid',
      'سفارش شما پرداخت شد',
      `سفارش ${order.code} با موفقیت پرداخت شد و در حال پردازش است.`,
      { orderCode: order.code },
    );
  }

  // -------------------------------------------------------------- کاربر
  async myOrders(userId: number, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const [orders, total] = await this.orders.findAndCount({
      where: { userId },
      order: { id: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return { items: orders.map((o) => this.publicOrder(o)), total, page: p.page, limit: p.limit };
  }

  async detailForUser(userId: number, code: string) {
    const order = await this.orders.findOne({ where: { code, userId } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    return this.fullDetail(order);
  }

  async trackGuest(code: string, phone: string) {
    const order = await this.orders.findOne({ where: { code } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    const addr = order.addressJson as any;
    if (addr?.receiverPhone !== phone) throw new NotFoundException('سفارش یافت نشد');
    return this.publicOrder(order, true);
  }

  private async fullDetail(order: Order) {
    const [items, histories, payments, shipment] = await Promise.all([
      this.items.find({ where: { orderId: order.id } }),
      this.histories.find({ where: { orderId: order.id }, order: { id: 'ASC' } }),
      this.payments.find({ where: { orderId: order.id }, order: { id: 'DESC' } }),
      this.shipments.findOne({ where: { orderId: order.id } }),
    ]);
    return {
      ...this.publicOrder(order),
      address: order.addressJson,
      customerNote: order.customerNote,
      adminNote: order.adminNote,
      items,
      histories: histories.map((h) => ({
        from: h.fromStatus ? (ORDER_STATUS_LABELS as any)[h.fromStatus] || h.fromStatus : null,
        to: (ORDER_STATUS_LABELS as any)[h.toStatus] || h.toStatus,
        note: h.note, at: h.createdAt, by: h.changedBy,
      })),
      payments,
      shipment,
      allowedTransitions: ORDER_TRANSITIONS[order.status],
    };
  }

  private publicOrder(o: Order, minimal = false) {
    return {
      id: o.id, code: o.code,
      status: o.status, statusLabel: ORDER_STATUS_LABELS[o.status],
      paymentStatus: o.paymentStatus,
      subtotal: o.subtotal, discountTotal: o.discountTotal,
      taxTotal: o.taxTotal, shippingCost: o.shippingCost, grandTotal: o.grandTotal,
      couponCode: o.couponCode, shippingMethod: o.shippingMethod,
      placedAt: o.placedAt, paidAt: o.paidAt, createdAt: o.createdAt,
      ...(minimal ? {} : {}),
    };
  }

  // -------------------------------------------------------------- ادمین
  async adminList(query: {
    page?: string; limit?: string; status?: string; q?: string; dateFrom?: string; dateTo?: string;
  }) {
    const p = paginate(query.page, query.limit);
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoin('users', 'u', 'u.id = o.user_id')
      .select(['o.id AS id', 'o.code AS code', 'o.status AS status', 'o.payment_status AS paymentStatus',
        'o.grand_total AS grandTotal', 'o.placed_at AS placedAt', 'o.created_at AS createdAt',
        'u.full_name AS customerName', 'u.phone AS customerPhone'])
      .orderBy('o.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (query.status) qb.andWhere('o.status = :st', { st: query.status });
    if (query.q) qb.andWhere('(o.code LIKE :q OR u.full_name LIKE :q OR u.phone LIKE :q)', { q: `%${query.q}%` });
    if (query.dateFrom) qb.andWhere('o.created_at >= :df', { df: new Date(query.dateFrom) });
    if (query.dateTo) qb.andWhere('o.created_at <= :dt', { dt: new Date(query.dateTo + ' 23:59:59') });
    const [items, total] = await Promise.all([
      qb.getRawMany(),
      qb.clone().select('COUNT(*)', 'cnt').getRawOne(),
    ]);
    return {
      items: items.map((i: any) => ({
        ...i,
        grandTotal: Number(i.grandTotal),
        statusLabel: (ORDER_STATUS_LABELS as any)[i.status] || i.status,
      })),
      total: Number(total?.cnt || 0), page: p.page, limit: p.limit,
    };
  }

  async adminDetail(id: number) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    return this.fullDetail(order);
  }

  /** تغییر وضعیت با state machine + اثرات انبار */
  async changeStatus(id: number, to: OrderStatus, note: string | undefined, adminId: number) {
    return this.em.transaction(async (tx) => {
      const order = await tx.getRepository(Order)
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id })
        .getOne();
      if (!order) throw new NotFoundException('سفارش یافت نشد');

      const allowed = ORDER_TRANSITIONS[order.status];
      if (!allowed.includes(to))
        throw new DomainException('BAD_TRANSITION', `تغییر وضعیت از «${ORDER_STATUS_LABELS[order.status]}» به «${ORDER_STATUS_LABELS[to]}» مجاز نیست`, 409);

      const items = await tx.getRepository(OrderItem).find({ where: { orderId: id } });

      // اثرات انبار
      if (to === 'cancelled') {
        if (order.paymentStatus === 'paid') {
          // برگشت به انبار
          for (const i of items) {
            await this.inventory.move({ variantId: i.variantId, warehouseId: await this.inventory.defaultWarehouseId(), type: 'return', quantity: i.quantity, referenceType: 'order', referenceId: id, note: 'لغو سفارش پرداخت‌شده' }, adminId);
          }
        } else {
          await this.inventory.release(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), id, tx);
        }
      }
      if (to === 'paid') await this.markPaid(id, tx);

      const patch: Partial<Order> = { status: to };
      if (to === 'delivered') patch.deliveredAt = new Date();
      if (to === 'cancelled') { patch.cancelledAt = new Date(); patch.cancelReason = note ?? null; }
      if (to === 'refunded') patch.paymentStatus = 'refunded';

      await tx.getRepository(Order).update(id, patch as any);
      await this.addHistory(id, order.status, to, note ?? null, adminId, tx);
      return this.adminDetail(id);
    });
  }

  async setAdminNote(id: number, note: string) {
    await this.orders.update(id, { adminNote: note });
    return { updated: true };
  }

  async upsertShipment(id: number, dto: { provider: string; method?: string; trackingCode?: string; cost?: number; status?: Shipment['status'] }) {
    const order = await this.orders.findOne({ where: { id } });
    if (!order) throw new NotFoundException('سفارش یافت نشد');
    let shipment = await this.shipments.findOne({ where: { orderId: id } });
    if (!shipment) shipment = this.shipments.create({ orderId: id, provider: dto.provider });
    Object.assign(shipment, {
      provider: dto.provider,
      method: dto.method ?? shipment.method,
      trackingCode: dto.trackingCode ?? shipment.trackingCode,
      cost: dto.cost ?? shipment.cost,
      status: dto.status ?? shipment.status,
      shippedAt: dto.status === 'picked_up' || dto.status === 'in_transit' ? new Date() : shipment.shippedAt,
      deliveredAt: dto.status === 'delivered' ? new Date() : shipment.deliveredAt,
    });
    return this.shipments.save(shipment);
  }

  private async addHistory(orderId: number, from: string | null, to: string, note: string | null, changedBy: number | null, tx: EntityManager) {
    await tx.getRepository(OrderStatusHistory).save(
      tx.getRepository(OrderStatusHistory).create({ orderId, fromStatus: from, toStatus: to, note, changedBy }),
    );
  }

  /** cron: انقضای رزرو سفارش‌های پرداخت‌نشده */
  async expirePendingOrders() {
    const threshold = new Date(Date.now() - env.order.reserveMinutes * 60_000);
    const stale = await this.orders.find({
      where: { status: 'pending_payment', placedAt: LessThan(threshold) },
      take: 50,
    });
    for (const order of stale) {
      try {
        await this.em.transaction(async (tx) => {
          const items = await tx.getRepository(OrderItem).find({ where: { orderId: order.id } });
          await this.inventory.release(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), order.id, tx);
          await tx.getRepository(Order).update(order.id, {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: 'انقضای مهلت پرداخت',
          });
          await this.addHistory(order.id, order.status, 'cancelled', 'انقضای مهلت پرداخت', null, tx);
        });
        this.logger.log(`order ${order.code} expired & released`);
      } catch (e) {
        this.logger.warn(`expire ${order.code} failed: ${(e as Error).message}`);
      }
    }
    return stale.length;
  }
}
