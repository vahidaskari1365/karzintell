import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, User } from '../../database/entities';
import { RequirePermissions } from '../../common/decorators';
import { paginate } from '../../common/utils';

@ApiTags('admin/customers')
@Controller('admin/customers')
export class CustomersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
  ) {}

  /** لیست مشتریان (کاربرانی که نقش مشتری دارند یا سفارش ثبت کرده‌اند) */
  @Get()
  @RequirePermissions('customers.view')
  async list(@Query('page') page?: string, @Query('limit') limit?: string, @Query('q') q?: string) {
    const p = paginate(page, limit);
    const qb = this.users
      .createQueryBuilder('u')
      .innerJoin('role_user', 'ru', 'ru.user_id = u.id')
      .innerJoin('roles', 'r', 'r.id = ru.role_id AND r.name = :rn', { rn: 'customer' })
      .select(['u.id AS id', 'u.fullName AS fullName', 'u.phone AS phone', 'u.email AS email',
        'u.status AS status', 'u.createdAt AS createdAt', 'u.lastLoginAt AS lastLoginAt'])
      .addSelect(`(SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.deleted_at IS NULL) AS ordersCount`)
      .addSelect(`(SELECT COALESCE(SUM(o.grand_total),0) FROM orders o WHERE o.user_id = u.id AND o.payment_status = 'paid') AS totalSpent`)
      .orderBy('u.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (q) qb.andWhere('(u.full_name LIKE :q OR u.phone LIKE :q OR u.email LIKE :q)', { q: `%${q}%` });
    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.users.query(
        `SELECT COUNT(DISTINCT u.id) AS cnt FROM users u
         JOIN role_user ru ON ru.user_id = u.id JOIN roles r ON r.id = ru.role_id AND r.name = 'customer'
         ${q ? 'WHERE u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?' : ''}`,
        q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [],
      ),
    ]);
    return {
      data: items.map((i: any) => ({ ...i, ordersCount: Number(i.ordersCount), totalSpent: Number(i.totalSpent) })),
      meta: { page: p.page, limit: p.limit, total: Number(total?.[0]?.cnt || 0) },
    };
  }

  /** پروفایل ۳۶۰° مشتری */
  @Get(':id')
  @RequirePermissions('customers.view')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new NotFoundException('مشتری یافت نشد');
    const recentOrders = await this.orders.find({ where: { userId: id }, order: { id: 'DESC' }, take: 10 });
    const stats = await this.orders.query(
      `SELECT COUNT(*) AS ordersCount,
              COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN grand_total ELSE 0 END),0) AS totalSpent
       FROM orders WHERE user_id = ? AND deleted_at IS NULL`,
      [id],
    );
    const addresses = await this.users.manager.query(`SELECT * FROM user_addresses WHERE user_id = ? AND deleted_at IS NULL`, [id]);
    const wallet = await this.users.manager.query(`SELECT balance FROM wallets WHERE user_id = ?`, [id]);
    return {
      data: {
        id: user.id, fullName: user.fullName, phone: user.phone, email: user.email,
        nationalCode: user.nationalCode, status: user.status, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt,
        roles: (user.roles || []).map((r) => r.name),
        stats: { ordersCount: Number(stats[0].ordersCount), totalSpent: Number(stats[0].totalSpent) },
        walletBalance: wallet?.[0] ? Number(wallet[0].balance) : 0,
        addresses,
        recentOrders,
      },
    };
  }
}
