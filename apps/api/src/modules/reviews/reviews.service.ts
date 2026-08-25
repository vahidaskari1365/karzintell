import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OrderItem, Product, ProductQuestion, Review } from '../../database/entities';
import { paginate, dbQuery } from '../../common/utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(ProductQuestion) private readonly questions: Repository<ProductQuestion>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(OrderItem) private readonly orderItems: Repository<OrderItem>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
  ) {}

  // --------------------------------------------------- عمومی
  async listApproved(productId: number, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const [items, total] = await this.reviews.findAndCount({
      where: { productId, status: 'approved' },
      order: { id: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    const userIds = items.map((i) => i.userId);
    const users = userIds.length
      ? await dbQuery(this.em, `SELECT id, full_name AS "fullName" FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds)
      : [];
    const nameMap = new Map(users.map((u: any) => [Number(u.id), u.fullName]));
    return {
      items: items.map((i) => ({ ...i, userName: nameMap.get(i.userId) || 'کاربر', isBuyer: !!i.orderItemId })),
      total, page: p.page, limit: p.limit,
    };
  }

  async listQuestions(productId: number, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const [items, total] = await this.questions.findAndCount({
      where: { productId, status: 'answered' },
      order: { id: 'DESC' },
      skip: p.skip,
      take: p.limit,
    });
    return { items, total, page: p.page, limit: p.limit };
  }

  // --------------------------------------------------- کاربر
  async create(userId: number, productId: number, dto: { rating: number; title?: string; body?: string; pros?: string[]; cons?: string[] }) {
    const product = await this.products.findOne({ where: { id: productId, status: 'published' } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    const dup = await this.reviews.findOne({ where: { productId, userId } });
    if (dup) throw new ConflictException({ code: 'DUPLICATE_REVIEW', message: 'شما قبلاً برای این محصول دیدگاه ثبت کرده‌اید' });

    // آیا کاربر این محصول را خریده؟
    const bought = await this.orderItems
      .createQueryBuilder('oi')
      .innerJoin('orders', 'o', 'o.id = oi.order_id AND o.user_id = :uid AND o.payment_status = :ps', { uid: userId, ps: 'paid' })
      .where('oi.product_id = :pid', { pid: productId })
      .getOne();

    const review = await this.reviews.save(
      this.reviews.create({
        productId, userId, rating: dto.rating,
        title: dto.title ?? null, body: dto.body ?? null,
        pros: dto.pros ?? null, cons: dto.cons ?? null,
        orderItemId: bought?.id ?? null,
        status: 'pending',
      }),
    );
    return review;
  }

  async ask(userId: number, productId: number, question: string) {
    const product = await this.products.findOne({ where: { id: productId, status: 'published' } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    return this.questions.save(this.questions.create({ productId, userId, question, status: 'pending' }));
  }

  // --------------------------------------------------- ادمین (مدیریت)
  async adminList(status: string | undefined, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const qb = this.reviews
      .createQueryBuilder('r')
      .leftJoin('products', 'p', 'p.id = r.product_id')
      .leftJoin('users', 'u', 'u.id = r.user_id')
      .select(['r.*', 'p.name AS "productName"', 'u.full_name AS "userName"'])
      .orderBy('r.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (status) qb.where('r.status = :st', { st: status });
    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.reviews.count(status ? { where: { status: status as any } } : {}),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async adminQuestions(status: string | undefined, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const qb = this.questions
      .createQueryBuilder('q')
      .leftJoin('products', 'p', 'p.id = q.product_id')
      .leftJoin('users', 'u', 'u.id = q.user_id')
      .select(['q.*', 'p.name AS "productName"', 'u.full_name AS "userName"'])
      .orderBy('q.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (status) qb.where('q.status = :st', { st: status });
    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.questions.count(status ? { where: { status: status as any } } : {}),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async moderate(id: number, action: 'approve' | 'reject' | 'reply', body?: string) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException('دیدگاه یافت نشد');

    if (action === 'approve' || action === 'reject') {
      review.status = action === 'approve' ? 'approved' : 'rejected';
      await this.reviews.save(review);
      await this.refreshProductRating(review.productId);
    }
    if (action === 'reply' && body) {
      review.sellerReply = body;
      review.repliedAt = new Date();
      await this.reviews.save(review);

      // ارسال پیامک پاسخ به ثبت دیدگاه
      const user = await dbQuery(this.em, `SELECT phone, full_name AS "fullName" FROM users WHERE id = ? LIMIT 1`, [review.userId]);
      if (user?.[0]?.phone) {
        const product = await this.products.findOne({ where: { id: review.productId } });
        const msg = `سلام ${user[0].fullName} عزیز\nپاسخ جدیدی برای دیدگاه شما در محصول «${product?.name || 'محصول منتخب'}» ثبت شد.\nکارزینتل`;
        await this.notifications.sendSms(user[0].phone, msg).catch(() => undefined);
      }
    }
    return review;
  }

  async answerQuestion(id: number, answer: string | undefined, adminId: number) {
    const q = await this.questions.findOne({ where: { id } });
    if (!q) throw new NotFoundException('پرسش یافت نشد');
    if (answer) {
      q.answer = answer;
      q.answeredBy = adminId;
      q.answeredAt = new Date();
      q.status = 'answered';
      await this.questions.save(q);

      // ارسال پیامک پاسخ به سوال محصول
      const user = await dbQuery(this.em, `SELECT phone, full_name AS "fullName" FROM users WHERE id = ? LIMIT 1`, [q.userId]);
      if (user?.[0]?.phone) {
        const product = await this.products.findOne({ where: { id: q.productId } });
        const msg = `سلام ${user[0].fullName} عزیز\nپاسخ سوال شما درباره محصول «${product?.name || 'محصول منتخب'}» ثبت شد.\nکارزینتل`;
        await this.notifications.sendSms(user[0].phone, msg).catch(() => undefined);
      }
    } else {
      q.status = 'rejected';
      await this.questions.save(q);
    }
    return q;
  }

  private async refreshProductRating(productId: number) {
    const row = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.product_id = :pid AND r.status = :st', { pid: productId, st: 'approved' })
      .getRawOne();
    await this.products.update(productId, {
      ratingAvg: Number(Number(row.avg || 0).toFixed(2)),
      ratingCount: Number(row.cnt || 0),
    });
  }
}
