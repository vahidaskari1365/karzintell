import { dbQuery } from '../../common/utils';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('admin/dashboard')
@Controller('admin')
export class DashboardController {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  /** KPIهای داشبورد */
  @Get('dashboard')
  @RequirePermissions('dashboard.view')
  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [salesToday] = await dbQuery(this.em,
      `SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS cnt
       FROM orders WHERE payment_status = 'paid' AND paid_at >= ? AND deleted_at IS NULL`,
      [today],
    );
    const [salesMonth] = await dbQuery(this.em,
      `SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS cnt
       FROM orders WHERE payment_status = 'paid' AND paid_at >= DATE_FORMAT(CURRENT_TIMESTAMP, '%Y-%m-01 00:00:00') AND deleted_at IS NULL`,
    );
    const [orderStats] = await dbQuery(this.em,
      `SELECT
         SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS "pendingPayment",
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
         SUM(CASE WHEN status = 'ready_to_ship' THEN 1 ELSE 0 END) AS "readyToShip"
       FROM orders WHERE deleted_at IS NULL`,
    );
    const [counts] = await dbQuery(this.em,
      `SELECT
         (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS users,
         (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS products,
         (SELECT COUNT(*) FROM products WHERE status = 'published' AND deleted_at IS NULL) AS "publishedProducts",
         (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS "pendingReviews",
         (SELECT COUNT(*) FROM product_questions WHERE status = 'pending') AS "pendingQuestions",
         (SELECT COUNT(*) FROM tickets WHERE status IN ('open','pending_support')) AS "openTickets",
         (SELECT COUNT(*) FROM inventory WHERE (quantity - reserved) <= low_stock_threshold) AS "lowStock"`,
    );

    const chart = await dbQuery(this.em,
      `SELECT DATE(paid_at) AS day, COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS cnt
       FROM orders
       WHERE payment_status = 'paid' AND paid_at >= CURRENT_DATE - INTERVAL 13 DAY
       GROUP BY DATE(paid_at)
       ORDER BY day ASC`,
    );

    const recentOrders = await dbQuery(this.em,
      `SELECT o.id, o.code, o.status, o.grand_total AS "grandTotal", o.created_at AS "createdAt",
              u.full_name AS "customerName"
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.deleted_at IS NULL
       ORDER BY o.id DESC LIMIT 8`,
    );

    return {
      data: {
        salesToday: { total: Number(salesToday.total), count: Number(salesToday.cnt) },
        salesMonth: { total: Number(salesMonth.total), count: Number(salesMonth.cnt) },
        orderStats: {
          pendingPayment: Number(orderStats.pendingPayment || 0),
          paid: Number(orderStats.paid || 0),
          processing: Number(orderStats.processing || 0),
          readyToShip: Number(orderStats.readyToShip || 0),
        },
        counts: {
          users: Number(counts.users), products: Number(counts.products),
          publishedProducts: Number(counts.publishedProducts),
          pendingReviews: Number(counts.pendingReviews),
          pendingQuestions: Number(counts.pendingQuestions),
          openTickets: Number(counts.openTickets),
          lowStock: Number(counts.lowStock),
        },
        chart: chart.map((c: any) => ({ day: c.day, total: Number(c.total), count: Number(c.cnt) })),
        recentOrders: recentOrders.map((o: any) => ({ ...o, grandTotal: Number(o.grandTotal) })),
      },
    };
  }

  /** گزارش فروش بازه‌ای */
  @Get('reports/sales')
  @RequirePermissions('reports.view')
  async salesReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy: 'day' | 'month' = 'day',
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const toDate = to ? new Date(to + ' 23:59:59') : new Date();
    const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const rows = await dbQuery(this.em,
      `SELECT DATE_FORMAT(paid_at, ?) AS period,
              COALESCE(SUM(grand_total),0) AS total,
              COALESCE(SUM(discount_total),0) AS discount,
              COUNT(*) AS orders
       FROM orders
       WHERE payment_status = 'paid' AND paid_at BETWEEN ? AND ?
       GROUP BY period ORDER BY period ASC`,
      [format, fromDate, toDate],
    );

    const totals = await dbQuery(this.em,
      `SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS orders,
              COALESCE(SUM(discount_total),0) AS discount, COALESCE(SUM(tax_total),0) AS tax
       FROM orders WHERE payment_status = 'paid' AND paid_at BETWEEN ? AND ?`,
      [fromDate, toDate],
    );

    return {
      data: {
        series: rows.map((r: any) => ({ period: r.period, total: Number(r.total), discount: Number(r.discount), orders: Number(r.orders) })),
        totals: {
          total: Number(totals[0].total), orders: Number(totals[0].orders),
          discount: Number(totals[0].discount), tax: Number(totals[0].tax),
        },
      },
    };
  }

  /** پرفروش‌ترین محصولات */
  @Get('reports/top-products')
  @RequirePermissions('reports.view')
  async topProducts(@Query('limit') limit?: string) {
    const rows = await dbQuery(this.em,
      `SELECT oi.product_id AS "productId", oi.product_name AS "productName",
              SUM(oi.quantity) AS qty, SUM(oi.total_price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY qty DESC
       LIMIT ?`,
      [Math.min(50, Number(limit) || 10)],
    );
    return { data: rows.map((r: any) => ({ ...r, qty: Number(r.qty), revenue: Number(r.revenue) })) };
  }

  /** موجودی کم */
  @Get('reports/low-stock')
  @RequirePermissions('reports.view')
  async lowStock() {
    const rows = await dbQuery(this.em,
      `SELECT i.variant_id AS "variantId", v.sku, p.name AS "productName",
              i.quantity, i.reserved, i.low_stock_threshold AS threshold,
              w.name AS warehouse
       FROM inventory i
       JOIN product_variants v ON v.id = i.variant_id AND v.deleted_at IS NULL
       JOIN products p ON p.id = v.product_id AND p.deleted_at IS NULL
       JOIN warehouses w ON w.id = i.warehouse_id
       WHERE (i.quantity - i.reserved) <= i.low_stock_threshold
       ORDER BY i.quantity ASC LIMIT 50`,
    );
    return { data: rows };
  }

  /** گزارش سود ناخالص (فروش - بهای تمام‌شده) روزانه/ماهانه */
  @Get('reports/profit')
  @RequirePermissions('reports.view')
  async profitReport(@Query('from') from?: string, @Query('to') to?: string, @Query('groupBy') groupBy?: string) {
    const group = groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const params: any[] = [group];
    let dateCond = '';
    if (from) { dateCond += ' AND o.paid_at >= ?'; params.push(new Date(from)); }
    if (to) { dateCond += ' AND o.paid_at <= ?'; params.push(new Date(to + ' 23:59:59')); }
    const rows = await dbQuery(this.em,
      `SELECT DATE_FORMAT(o.paid_at, ?) AS bucket,
              COUNT(DISTINCT o.id) AS orders,
              COALESCE(SUM(oi.total_price - oi.discount_amount),0) AS revenue,
              COALESCE(SUM(COALESCE(v.cost_price,0) * oi.quantity),0) AS cost,
              COALESCE(SUM(oi.total_price - oi.discount_amount - COALESCE(v.cost_price,0) * oi.quantity),0) AS profit
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.payment_status IN ('paid','partially_refunded') ${dateCond}
       JOIN product_variants v ON v.id = oi.variant_id
       GROUP BY bucket ORDER BY bucket ASC`,
      params,
    );
    return {
      data: rows.map((r: any) => ({
        bucket: r.bucket, orders: Number(r.orders),
        revenue: Number(r.revenue), cost: Number(r.cost), profit: Number(r.profit),
      })),
    };
  }

  /** مشتریان برتر */
  @Get('reports/top-customers')
  @RequirePermissions('reports.view')
  async topCustomers(@Query('limit') limit?: string) {
    const rows = await dbQuery(this.em,
      `SELECT u.id, u.full_name AS "fullName", u.phone,
              COUNT(o.id) AS "ordersCount", COALESCE(SUM(o.grand_total),0) AS "totalSpent",
              MAX(o.paid_at) AS "lastOrderAt"
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.payment_status = 'paid' AND o.deleted_at IS NULL
       GROUP BY u.id, u.full_name, u.phone
       ORDER BY "totalSpent" DESC
       LIMIT ?`,
      [Math.min(50, Number(limit) || 10)],
    );
    return {
      data: rows.map((r: any) => ({
        ...r, ordersCount: Number(r.ordersCount), totalSpent: Number(r.totalSpent),
      })),
    };
  }
}
