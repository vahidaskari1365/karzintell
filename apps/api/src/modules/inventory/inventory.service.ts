import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Inventory, Product, StockMovement, Warehouse } from '../../database/entities';
import { DomainException } from '../../common/http-exception.filter';
import { paginate } from '../../common/utils';

export interface StockLine {
  variantId: number;
  quantity: number;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Inventory) private readonly inventory: Repository<Inventory>,
    @InjectEntityManager() private readonly em: EntityManager,
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
    const repo = (manager || this.em).getRepository(Inventory);
    const row = await repo.findOne({ where: { variantId, warehouseId } });
    if (!row) await repo.insert({ variantId, warehouseId, quantity: 0, reserved: 0 });
  }

  /** تنظیم مستقیم مقدار (برای ورود اولیه/اصلاح) */
  async setQuantity(
    input: { variantId: number; warehouseId: number; quantity: number; note?: string },
    adminId: number,
    manager?: EntityManager,
  ) {
    const m = manager || this.em;
    return m.transaction(async (tx) => {
      await this.ensureRow(input.variantId, input.warehouseId, tx);
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: input.variantId, w: input.warehouseId })
        .getOneOrFail();

      const before = row.quantity;
      row.quantity = Math.max(0, input.quantity);
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
    });
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
  ) {
    return this.em.transaction(async (tx) => {
      await this.ensureRow(input.variantId, input.warehouseId, tx);
      const row = await tx
        .getRepository(Inventory)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.variant_id = :v AND i.warehouse_id = :w', { v: input.variantId, w: input.warehouseId })
        .getOneOrFail();

      const before = row.quantity;
      if (input.type === 'in' || input.type === 'return') row.quantity += input.quantity;
      else if (input.type === 'out') {
        if (row.quantity - row.reserved < input.quantity)
          throw new DomainException('OUT_OF_STOCK', 'موجودی قابل‌فروش کافی نیست', 409);
        row.quantity -= input.quantity;
      } else row.quantity = Math.max(0, before + input.quantity);
      await tx.getRepository(Inventory).save(row);

      await this.log(tx, {
        variantId: input.variantId, warehouseId: input.warehouseId, type: input.type,
        quantity: input.quantity, qtyBefore: before, qtyAfter: row.quantity,
        referenceType: input.referenceType || 'manual', referenceId: input.referenceId || null,
        note: input.note || null, createdBy: adminId,
      });
      await this.recalcVariantStock(input.variantId, tx);
      return row;
    });
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
    const row = await tx.query(`SELECT product_id AS pid FROM product_variants WHERE id = ?`, [variantId]);
    return row?.[0]?.pid ?? 0;
  }

  private async log(tx: EntityManager, m: Partial<StockMovement>) {
    await tx.getRepository(StockMovement).save(tx.getRepository(StockMovement).create(m));
  }

  private async recalcVariantStock(variantId: number, tx?: EntityManager) {
    const m = tx || this.em;
    const row = await m.query(
      `SELECT COALESCE(SUM(quantity - reserved), 0) AS stock FROM inventory WHERE variant_id = ?`,
      [variantId],
    );
    await m.query(`UPDATE product_variants SET stock_total = ? WHERE id = ?`, [Number(row[0].stock), variantId]);
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
        'i.variant_id AS variantId', 'i.warehouse_id AS warehouseId',
        'i.quantity AS quantity', 'i.reserved AS reserved',
        'i.low_stock_threshold AS lowStockThreshold',
        'v.sku AS sku', 'v.title AS variantTitle', 'p.name AS productName', 'p.id AS productId',
        'w.name AS warehouseName',
      ]);
    if (query.q) base.andWhere('(p.name LIKE :q OR v.sku LIKE :q)', { q: `%${query.q}%` });
    if (query.lowStock) base.andWhere('i.quantity <= i.low_stock_threshold');
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
