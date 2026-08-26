import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Inventory, Product, ProductVariant, StockAlert, StockMovement, Warehouse } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';
import { paginate, dbQuery } from '../../common/utils';
import { NotificationsService } from '../notifications/notifications.service';

export interface StockLine {
  variantId: number;
  quantity: number;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Inventory) private readonly inventory: Repository<Inventory>,
    @InjectRepository(StockAlert) private readonly alerts: Repository<StockAlert>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------ انبارها
  listWarehouses() {
    return this.warehouses.find({ order: { id: 'ASC' } });
  }

  async saveWarehouse(partial: Partial<Warehouse> & { id?: number }) {
    if (partial.id) {
      await this.warehouses.update(partial.id, partial);
      return this.warehouses.findOne({ where: { id: partial.id } });
    }
    return this.warehouses.save(this.warehouses.create(partial));
  }

  async removeWarehouse(id: number) {
    const used = await this.inventory.count({ where: { warehouseId: id } });
    if (used) throw new DomainException('WAREHOUSE_IN_USE', 'این انبار موجودی ثبت‌شده دارد', 409);
    await this.warehouses.delete(id);
    return { deleted: true };
  }

  /** انبار پیش‌فرض */
  async defaultWarehouseId(): Promise<number> {
    const w = await this.warehouses.findOne({ where: {}, order: { id: 'ASC' } });
    if (!w) throw new NotFoundException('هیچ انباری تعریف نشده است');
    return w.id;
  }

  // ----------------------------------------------------------- موجودی
  async ensureRow(variantId: number, warehouseId: number, manager?: EntityManager) {
    // Ignoring duplicate inserts closes the race where two first-time checkouts create the row together.
    await (manager || this.em)
      .getRepository(Inventory)
      .createQueryBuilder()
      .insert()
      .values({ variantId, warehouseId, quantity: 0, reserved: 0 })
      .orIgnore()
      .execute();
  }

  /** تنظیم مستقیم مقدار (برای ورود اولیه/اصلاح) */
  async setQuantity(
    input: { variantId: number; warehouseId: number; quantity: number; note?: string },
    adminId: number,
    manager?: EntityManager,
  ) {
    const work = async (tx: EntityManager) => {
      await this.ensureRow(input.variantId, input.warehouseId, tx);
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: input.variantId, w: input.warehouseId })
        .getOneOrFail();

      const before = row.quantity;
      row.quantity = Math.max(0, Math.floor(input.quantity));
      if (row.quantity < row.reserved)
        throw new DomainException('INVENTORY_RESERVED', 'موجودی نمی‌تواند کمتر از مقدار رزروشده باشد', 409);
      await tx.getRepository(Inventory).save(row);
      await this.log(tx, {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        type: 'adjust',
        quantity: Math.abs(row.quantity - before),
        qtyBefore: before,
        qtyAfter: row.quantity,
        referenceType: 'manual',
        note: input.note ?? null,
        createdBy: adminId,
      });
      await this.recalcVariantStock(input.variantId, tx);
      return row;
    };
    const row = manager ? await work(manager) : await this.em.transaction(work);
    if (!manager) await this.dispatchAlerts(input.variantId, input.warehouseId);
    return row;
  }

  /** افزایش/کاهش با نوع حرکت */
  async move(
    input: {
      variantId: number;
      warehouseId: number;
      type: 'in' | 'out' | 'return' | 'adjust';
      quantity: number;
      note?: string;
      referenceType?: string;
      referenceId?: number;
    },
    adminId: number,
    manager?: EntityManager,
  ) {
    const work = async (tx: EntityManager) => {
      await this.ensureRow(input.variantId, input.warehouseId, tx);
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: input.variantId, w: input.warehouseId })
        .getOneOrFail();

      const quantity = Math.floor(input.quantity);
      if (!Number.isFinite(quantity) || quantity < 0)
        throw new DomainException('INVALID_QUANTITY', 'مقدار موجودی نامعتبر است', 400);
      const before = row.quantity;
      if (input.type === 'in' || input.type === 'return') row.quantity += quantity;
      else if (input.type === 'out') {
        if (row.quantity - row.reserved < quantity)
          throw new DomainException('OUT_OF_STOCK', 'موجودی قابل‌فروش کافی نیست', 409);
        row.quantity -= quantity;
      } else {
        row.quantity = Math.max(row.reserved, before + quantity);
      }
      if (row.quantity < row.reserved)
        throw new DomainException('INVENTORY_RESERVED', 'موجودی نمی‌تواند کمتر از مقدار رزروشده باشد', 409);
      await tx.getRepository(Inventory).save(row);
      await this.log(tx, {
        variantId: input.variantId, warehouseId: input.warehouseId, type: input.type,
        quantity, qtyBefore: before, qtyAfter: row.quantity,
        referenceType: input.referenceType || 'manual', referenceId: input.referenceId || null,
        note: input.note || null, createdBy: adminId,
      });
      await this.recalcVariantStock(input.variantId, tx);
      return row;
    };

    const row = manager ? await work(manager) : await this.em.transaction(work);
    if (!manager) await this.dispatchAlerts(input.variantId, input.warehouseId);
    return row;
  }

  /** رزرو موجودی در تراکنش سفارش (با قفل ردیف) */
  async reserve(lines: StockLine[], orderId: number, tx: EntityManager, warehouseId?: number) {
    const wid = warehouseId || (await this.defaultWarehouseId());
    for (const line of lines) {
      await this.ensureRow(line.variantId, wid, tx);
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: line.variantId, w: wid })
        .getOneOrFail();

      const available = row.quantity - row.reserved;
      if (available < line.quantity)
        throw new DomainException('OUT_OF_STOCK', 'موجودی کالای انتخاب‌شده کافی نیست', 409);

      row.reserved += line.quantity;
      await tx.getRepository(Inventory).save(row);
      await this.log(tx, {
        variantId: line.variantId, warehouseId: wid, type: 'reserve', quantity: line.quantity,
        qtyBefore: row.quantity, qtyAfter: row.quantity, referenceType: 'order', referenceId: orderId,
        note: null, createdBy: null,
      });
      await this.recalcVariantStock(line.variantId, tx);
    }
  }

  /** نهایی‌سازی پس از پرداخت: رزرو → خروج قطعی */
  async commit(lines: StockLine[], orderId: number, tx: EntityManager, warehouseId?: number) {
    const wid = warehouseId || (await this.defaultWarehouseId());
    for (const line of lines) {
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: line.variantId, w: wid })
        .getOneOrFail();
      row.reserved = Math.max(0, row.reserved - line.quantity);
      row.quantity = Math.max(0, row.quantity - line.quantity);
      await tx.getRepository(Inventory).save(row);
      await this.log(tx, {
        variantId: line.variantId, warehouseId: wid, type: 'out', quantity: line.quantity,
        qtyBefore: row.quantity + line.quantity, qtyAfter: row.quantity,
        referenceType: 'order', referenceId: orderId, note: 'خروج پس از پرداخت', createdBy: null,
      });
      await this.recalcVariantStock(line.variantId, tx);
      await tx.getRepository(Product).increment({ id: await this.productOf(line.variantId, tx) }, 'soldCount', line.quantity);
    }
  }

  /** آزادسازی رزرو (لغو/انقضا) */
  async release(lines: StockLine[], orderId: number, tx: EntityManager, warehouseId?: number) {
    const wid = warehouseId || (await this.defaultWarehouseId());
    for (const line of lines) {
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: line.variantId, w: wid })
        .getOne();
      if (!row) continue;
      row.reserved = Math.max(0, row.reserved - line.quantity);
      await tx.getRepository(Inventory).save(row);
      await this.log(tx, {
        variantId: line.variantId, warehouseId: wid, type: 'release', quantity: line.quantity,
        qtyBefore: row.quantity, qtyAfter: row.quantity, referenceType: 'order', referenceId: orderId,
        note: 'آزادسازی رزرو', createdBy: null,
      });
      await this.recalcVariantStock(line.variantId, tx);
    }
  }

  private async productOf(variantId: number, tx: EntityManager): Promise<number> {
    const row = await dbQuery(tx, `SELECT product_id AS pid FROM product_variants WHERE id = ?`, [variantId]);
    return row?.[0]?.pid ?? 0;
  }

  private async log(tx: EntityManager, m: Partial<StockMovement>) {
    await tx.getRepository(StockMovement).save(tx.getRepository(StockMovement).create(m));
  }

  private async recalcVariantStock(variantId: number, tx?: EntityManager) {
    const m = tx || this.em;
    const row = await dbQuery(m,
      `SELECT COALESCE(SUM(GREATEST(quantity - reserved, 0)), 0) AS stock FROM inventory WHERE variant_id = ?`,
      [variantId],
    );
    await dbQuery(m, `UPDATE product_variants SET stock_total = ? WHERE id = ?`, [Number(row[0].stock), variantId]);
  }

  /** ارسال اعلان پایدار برای اپراتورها؛ در هر تغییر موجودی حداکثر هر ۱۵ دقیقه تکرار می‌شود. */
  private async dispatchAlerts(variantId: number, warehouseId: number) {
    const alerts = await this.alerts.find({ where: { variantId, warehouseId, status: 'open' } });
    for (const alert of alerts) {
      if (alert.lastNotifiedAt && Date.now() - alert.lastNotifiedAt.getTime() < 15 * 60_000) continue;
      const rows = await dbQuery(this.em, `
        SELECT p.name AS product_name, v.sku, v.title AS variant_title
        FROM product_variants v JOIN products p ON p.id = v.product_id
        WHERE v.id = ? LIMIT 1`, [variantId]);
      const name = rows[0]?.product_name || `تنوع ${variantId}`;
      const variant = rows[0]?.variant_title || rows[0]?.sku || '';
      const label = alert.alertType === 'out_of_stock' ? 'اتمام موجودی' : 'کاهش موجودی';
      await this.notifications.notifyInventoryOperators(
        `${label}: ${name}`,
        `${name}${variant ? ` (${variant})` : ''} فقط ${alert.available} عدد موجودی قابل فروش دارد.`,
        { alertId: alert.id, variantId, warehouseId, available: alert.available, alertType: alert.alertType },
      );
      await this.alerts.update(alert.id, { lastNotifiedAt: new Date() });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchPendingAlerts() {
    const cutoff = new Date(Date.now() - 15 * 60_000);
    const pending = await this.alerts
      .createQueryBuilder('a')
      .where("a.status = 'open' AND (a.last_notified_at IS NULL OR a.last_notified_at < :cutoff)", { cutoff })
      .orderBy('a.updated_at', 'ASC')
      .take(100)
      .getMany();
    for (const alert of pending) await this.dispatchAlerts(alert.variantId, alert.warehouseId);
  }

  async openAlerts(page?: string, limit?: string) {
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      dbQuery(this.em, `
        SELECT a.id, a.variant_id AS "variantId", a.warehouse_id AS "warehouseId",
               a.available, a.threshold, a.alert_type AS "alertType", a.status,
               a.last_notified_at AS "lastNotifiedAt", a.created_at AS "createdAt",
               v.sku, v.title AS "variantTitle", p.id AS "productId", p.name AS "productName", w.name AS "warehouseName"
        FROM stock_alerts a
        JOIN product_variants v ON v.id = a.variant_id
        JOIN products p ON p.id = v.product_id
        JOIN warehouses w ON w.id = a.warehouse_id
        WHERE a.status = 'open'
        ORDER BY a.available ASC, a.updated_at DESC
        LIMIT ? OFFSET ?`, [p.limit, p.skip]),
      dbQuery(this.em, `SELECT COUNT(*) AS cnt FROM stock_alerts WHERE status = 'open'`),
    ]);
    return { items: items.map((item: any) => ({ ...item, available: Number(item.available), threshold: Number(item.threshold) })), total: Number(total[0]?.cnt || 0), page: p.page, limit: p.limit };
  }

  // -------------------------------------------------------- گزارش/فهرست
  async adminList(query: { page?: string; limit?: string; lowStock?: boolean; q?: string }) {
    const p = paginate(query.page, query.limit);
    const base = this.inventory
      .createQueryBuilder('i')
      .innerJoin('product_variants', 'v', 'v.id = i.variant_id AND v.deleted_at IS NULL')
      .innerJoin('products', 'p', 'p.id = v.product_id AND p.deleted_at IS NULL')
      .innerJoin('warehouses', 'w', 'w.id = i.warehouse_id')
      .select([
        'i.variant_id AS "variantId"', 'i.warehouse_id AS "warehouseId"',
        'i.quantity AS quantity', 'i.reserved AS reserved',
        'i.low_stock_threshold AS "lowStockThreshold"',
        'v.sku AS sku', 'v.title AS "variantTitle"', 'p.name AS "productName"', 'p.id AS "productId"',
        'w.name AS "warehouseName"',
      ]);
    if (query.q) base.andWhere('(p.name LIKE :q OR v.sku LIKE :q)', { q: `%${query.q}%` });
    if (query.lowStock) base.andWhere('(i.quantity - i.reserved) <= i.low_stock_threshold');
    const [items, total] = await Promise.all([
      base.clone().orderBy('i.quantity', 'ASC').offset(p.skip).limit(p.limit).getRawMany(),
      base.clone().select('COUNT(*)', 'cnt').getRawOne(),
    ]);
    return {
      items: items.map((i: any) => ({
        ...i,
        available: Number(i.quantity) - Number(i.reserved),
        quantity: Number(i.quantity), reserved: Number(i.reserved),
      })),
      total: Number(total?.cnt || 0),
      page: p.page, limit: p.limit,
    };
  }

  async movements(variantId?: number, page = 1, limit = 20) {
    const qb = this.inventory.manager
      .getRepository(StockMovement)
      .createQueryBuilder('m')
      .leftJoin('product_variants', 'v', 'v.id = m.variant_id')
      .select(['m.*', 'v.sku AS sku'])
      .orderBy('m.id', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);
    if (variantId) qb.where('m.variant_id = :vid', { vid: variantId });
    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.inventory.manager.getRepository(StockMovement).count(variantId ? { where: { variantId } } : {}),
    ]);
    return { items, total, page, limit };
  }
}
