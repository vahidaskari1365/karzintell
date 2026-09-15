import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Order,
  OrderItem,
  Product,
  Role,
  RoleUser,
  SellerProfile,
  User,
} from '../../database/entities';
import { paginate } from '../../common/utils';
import { DomainException } from '../../common/http-exception.filter';
import { RbacService } from '../rbac/rbac.service';
import {
  AdminReviewSellerDto,
  BecomeSellerDto,
  UpdateSellerProfileDto,
} from './seller.dto';

/** شناسه نقش seller در seed سیستم — معادل SYSTEM_ROLES[7].id */
const SELLER_ROLE_NAME = 'seller';

/**
 * تبدیل متن فارسی/انگلیسی به slug مناسب URL
 *
 * ابتدا حروف فارسی خاص (ی، ک، هـ و...) به معادل ASCII تبدیل می‌شوند،
 * سپس فاصله‌ها به خط‌تیره و کاراکترهای غیرمجاز حذف می‌شوند.
 */
export function slugify(text: string): string {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    // نرمال‌سازی نیم‌فاصله و فاصله‌های نامرئی فارسی
    .replace(/[‌‎‏\u200b-\u200f\ufeff]/g, ' ')
    // تبدیل حروف فارسی خاص به معادل ASCII
    .replace(/[يى]/g, 'y')
    .replace(/ك/g, 'k')
    .replace(/گ/g, 'g')
    .replace(/چ/g, 'ch')
    .replace(/پ/g, 'p')
    .replace(/ژ/g, 'zh')
    .replace(/ش/g, 'sh')
    .replace(/آ/g, 'a')
    .replace(/ه/g, 'h')
    .replace(/ۀ/g, 'h')
    .replace(/ة/g, 'h')
    // حذف کامل علامت‌های نگارشی و کاراکترهای غیر حرفی
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    // فاصله و زیرخط به خط‌تیره
    .replace(/[\s_]+/g, '-')
    // جمع‌کردن خط‌تیره‌های پشت‌سرهم
    .replace(/-+/g, '-')
    // حذف خط‌تیره‌ی ابتدا و انتها
    .replace(/^-+|-+$/g, '')
    // محدودیت طول — جلوگیری از سرریز varchar(190)
    .slice(0, 80);
}

/** وضعیت‌های سفارش که فروشنده باید آن‌ها را ببیند (مجموعه‌ای برای IN) */
const ACTIVE_ORDER_STATUSES = [
  'paid',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
];

@Injectable()
export class SellersService {
  private readonly logger = new Logger('Sellers');

  constructor(
    @InjectRepository(SellerProfile)
    private readonly profiles: Repository<SellerProfile>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(RoleUser)
    private readonly roleUsers: Repository<RoleUser>,
    private readonly rbac: RbacService,
  ) {}

  // ----------------------------------------------------------- درخواست فروشندگی

  /**
   * کاربر درخواست فروشندگی می‌دهد → یک SellerProfile با status=pending
   * ساخته می‌شود. اسلاگ فروشگاه از روی storeName تولید می‌شود و در صورت
   * تداخل، یک عدد پسوند اضافه می‌شود (مثلاً my-store-2).
   */
  async apply(userId: number, dto: BecomeSellerDto) {
    // کاربر نباید از قبل پروفایل فروشنده داشته باشد
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException({
        code: 'SELLER_PROFILE_EXISTS',
        message:
          existing.status === 'rejected'
            ? 'درخواست قبلی شما رد شده است — برای اصلاح با پشتیبانی تماس بگیرید'
            : 'شما قبلاً درخواست فروشندگی ثبت کرده‌اید',
      });
    }

    const storeName = dto.storeName.trim();
    const storeSlug = await this.uniqueSlug(storeName, userId);

    const profile = await this.profiles.save(
      this.profiles.create({
        userId,
        storeName,
        storeSlug,
        description: dto.description?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        address: dto.address?.trim() || null,
        economicCode: dto.economicCode?.trim() || null,
        registrationNumber: dto.registrationNumber?.trim() || null,
        nationalId: dto.nationalId?.trim() || null,
        status: 'pending',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      }),
    );

    this.logger.log(`کاربر ${userId} درخواست فروشندگی داد (slug=${storeSlug})`);
    return { id: profile.id, status: profile.status, storeSlug: profile.storeSlug };
  }

  /** slug یکتا تولید می‌کند؛ در صورت تداخل پسوند عددی اضافه می‌کند */
  private async uniqueSlug(storeName: string, userId: number): Promise<string> {
    const base = slugify(storeName) || `seller-${userId}`;
    let candidate = base;
    let suffix = 1;
    // تا ۱۰ تلاش برای پیدا کردن slug یکتا
    while (suffix < 11) {
      const clash = await this.profiles.findOne({
        where: { storeSlug: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    // اگر ۱۰ تلاش ناموفق بود → اضافه‌کردن timestamp برای تضمین یکتایی
    return `${base}-${Date.now().toString(36)}`;
  }

  // ------------------------------------------------------------- پروفایل خودم

  /** پروفایل فروشنده کاربر جاری را برمی‌گرداند */
  async getMyProfile(userId: number) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'SELLER_PROFILE_NOT_FOUND',
        message: 'شما پروفایل فروشندگی ندارید',
      });
    }
    return profile;
  }

  /** ویرایش پروفایل فروشندگی — فقط در صورت تأیید توسط ادمین */
  async updateMyProfile(userId: number, dto: UpdateSellerProfileDto) {
    const profile = await this.assertApproved(userId);

    // اگر نام فروشگاه تغییر کرد → اسلاگ هم باید تغییر کند (با حفظ یکتایی)
    let newSlug: string | undefined;
    if (dto.storeName && dto.storeName.trim() !== profile.storeName) {
      newSlug = await this.uniqueSlug(dto.storeName.trim(), userId);
    }

    await this.profiles.update(profile.id, {
      ...(dto.storeName !== undefined ? { storeName: dto.storeName.trim() } : {}),
      ...(newSlug ? { storeSlug: newSlug } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.logoPath !== undefined ? { logoPath: dto.logoPath } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
      ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
      ...(dto.economicCode !== undefined ? { economicCode: dto.economicCode?.trim() || null } : {}),
      ...(dto.registrationNumber !== undefined ? { registrationNumber: dto.registrationNumber?.trim() || null } : {}),
      ...(dto.nationalId !== undefined ? { nationalId: dto.nationalId?.trim() || null } : {}),
    });

    return this.profiles.findOne({ where: { id: profile.id } });
  }

  // ----------------------------------------------------- محصولات فروشنده

  /** فهرست محصولات فروشنده با صفحه‌بندی */
  async getMyProducts(userId: number, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.products
        .createQueryBuilder('p')
        .where('p.seller_id = :userId', { userId })
        .orderBy('p.id', 'DESC')
        .skip(p.skip)
        .take(p.limit)
        .getMany(),
      this.products.count({ where: { sellerId: userId } }),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  /** محصول تکی فروشنده — با بررسی مالکیت (403 اگر متعلق به او نیست) */
  async getMyProduct(userId: number, productId: number) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'محصول یافت نشد',
      });
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'این محصول متعلق به شما نیست',
      });
    }
    return product;
  }

  // ------------------------------------------------------- سفارش‌های فروشنده

  /**
   * سفارش‌هایی که حداقل یک قلم از محصولات این فروشنده را دارند.
   * برای هر سفارش، اقلام متعلق به این فروشنده جداگانه برگردانده می‌شوند.
   */
  async getMyOrders(userId: number, page?: string, limit?: string, status?: string) {
    const p = paginate(page, limit);

    // ابتدا شناسه سفارش‌هایی که حداقل یک قلم از فروشنده دارند را می‌گیریم
    const orderIdsRows = await this.orderItems
      .createQueryBuilder('oi')
      .innerJoin('products', 'p', 'p.id = oi.product_id')
      .where('p.seller_id = :userId', { userId })
      .select('DISTINCT oi.order_id', 'orderId')
      .getRawMany<{ orderId: string }>();

    const orderIds = orderIdsRows.map((r) => Number(r.orderId));
    if (orderIds.length === 0) {
      return { items: [], total: 0, page: p.page, limit: p.limit };
    }

    const qb = this.orders
      .createQueryBuilder('o')
      .where('o.id IN (:...orderIds)', { orderIds })
      .orderBy('o.id', 'DESC')
      .skip(p.skip)
      .take(p.limit);
    if (status) qb.andWhere('o.status = :status', { status });

    const [orders, total] = await Promise.all([
      qb.getMany(),
      this.orders.count({ where: { id: In(orderIds) } }),
    ]);

    if (orders.length === 0) {
      return { items: [], total, page: p.page, limit: p.limit };
    }

    // اقلام این فروشنده برای این سفارش‌ها
    const items = await this.orderItems
      .createQueryBuilder('oi')
      .innerJoin('products', 'p', 'p.id = oi.product_id')
      .where('oi.order_id IN (:...ids)', { ids: orders.map((o) => o.id) })
      .andWhere('p.seller_id = :userId', { userId })
      .select([
        'oi.id AS id',
        'oi.order_id AS orderId',
        'oi.product_id AS productId',
        'oi.variant_id AS variantId',
        'oi.sku AS sku',
        'oi.product_name AS productName',
        'oi.variant_title AS variantTitle',
        'oi.unit_price AS unitPrice',
        'oi.quantity AS quantity',
        'oi.total_price AS totalPrice',
      ])
      .getRawMany();

    const itemsByOrder = new Map<number, any[]>();
    for (const it of items) {
      const oid = Number(it.orderId);
      if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
      itemsByOrder.get(oid)!.push({
        ...it,
        orderId: oid,
        productId: Number(it.productId),
        variantId: Number(it.variantId),
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
        quantity: Number(it.quantity),
        id: Number(it.id),
      });
    }

    return {
      items: orders.map((o) => ({
        ...o,
        sellerItems: itemsByOrder.get(o.id) || [],
      })),
      total,
      page: p.page,
      limit: p.limit,
    };
  }

  // ----------------------------------------------------------- داشبورد فروشنده

  /**
   * آمار داشبورد فروشنده:
   *  - تعداد محصولات کل + محصولات منتشرشده
   *  - تعداد سفارش‌های در جریان (با اقلام این فروشنده)
   *  - تعداد سفارش‌های تحویل‌شده
   *  - مجموع درآمد (فروش) + درآمد خالص پس از کمیسیون
   */
  async getMyDashboard(userId: number) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'SELLER_PROFILE_NOT_FOUND',
        message: 'شما پروفایل فروشندگی ندارید',
      });
    }

    const [totalProducts, publishedProducts] = await Promise.all([
      this.products.count({ where: { sellerId: userId } }),
      this.products.count({ where: { sellerId: userId, status: 'published' } }),
    ]);

    // شناسه سفارش‌هایی که حداقل یک قلم از این فروشنده دارند
    const orderIdsRows = await this.orderItems
      .createQueryBuilder('oi')
      .innerJoin('products', 'p', 'p.id = oi.product_id')
      .where('p.seller_id = :userId', { userId })
      .select('DISTINCT oi.order_id', 'orderId')
      .getRawMany<{ orderId: string }>();
    const orderIds = orderIdsRows.map((r) => Number(r.orderId));

    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    let grossRevenue = 0;

    if (orderIds.length > 0) {
      // شمارش بر اساس وضعیت سفارش
      const statusRows = await this.orders
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(*)', 'c')
        .where('o.id IN (:...orderIds)', { orderIds })
        .groupBy('o.status')
        .getRawMany<{ status: string; c: string }>();
      const statusCounts = new Map<string, number>(
        statusRows.map((r) => [r.status, Number(r.c)]),
      );
      totalOrders = orderIds.length;
      for (const s of ACTIVE_ORDER_STATUSES) {
        if (s !== 'delivered') pendingOrders += statusCounts.get(s) || 0;
      }
      deliveredOrders = statusCounts.get('delivered') || 0;

      // مجموع فروش = جمع totalPrice اقلام این فروشنده در سفارش‌های غیرلغو/عودت‌شده
      const revenueRow = await this.orderItems
        .createQueryBuilder('oi')
        .innerJoin('products', 'p', 'p.id = oi.product_id')
        .innerJoin('orders', 'o', 'o.id = oi.order_id')
        .where('p.seller_id = :userId', { userId })
        .andWhere('o.id IN (:...orderIds)', { orderIds })
        .andWhere('o.status NOT IN (:...excluded)', {
          excluded: ['cancelled', 'refunded', 'pending_payment'],
        })
        .select('COALESCE(SUM(oi.total_price), 0)', 'gross')
        .getRawOne<{ gross: string }>();
      grossRevenue = Number(revenueRow?.gross || 0);
    }

    const commissionRate = Number(profile.commissionRate || 0);
    const commissionAmount = Math.round((grossRevenue * commissionRate) / 100);
    const netRevenue = grossRevenue - commissionAmount;

    return {
      profile: {
        id: profile.id,
        storeName: profile.storeName,
        storeSlug: profile.storeSlug,
        status: profile.status,
        commissionRate,
        ratingAvg: Number(profile.ratingAvg || 0),
        ratingCount: profile.ratingCount,
        isFeatured: !!profile.isFeatured,
      },
      stats: {
        totalProducts,
        publishedProducts,
        draftProducts: totalProducts - publishedProducts,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        grossRevenue,
        commissionAmount,
        netRevenue,
      },
    };
  }

  // ------------------------------------------------------------------ ادمین

  /** فهرست همه درخواست‌های فروشندگی — با فیلتر بر اساس status */
  async findAll(status?: string, page?: string, limit?: string) {
    const p = paginate(page, limit);
    const qb = this.profiles
      .createQueryBuilder('sp')
      .leftJoin('users', 'u', 'u.id = sp.user_id')
      .select([
        'sp.id AS id',
        'sp.user_id AS userId',
        'sp.store_name AS "storeName"',
        'sp.store_slug AS "storeSlug"',
        'sp.status AS status',
        'sp.commission_rate AS "commissionRate"',
        'sp.product_count AS "productCount"',
        'sp.rating_avg AS "ratingAvg"',
        'sp.is_featured AS "isFeatured"',
        'sp.created_at AS "createdAt"',
        'sp.reviewed_at AS "reviewedAt"',
        'u.full_name AS "userFullName"',
        'u.phone AS "userPhone"',
        'u.email AS "userEmail"',
      ])
      .orderBy('sp.id', 'DESC')
      .skip(p.skip)
      .take(p.limit);
    if (status) qb.andWhere('sp.status = :status', { status });

    const [items, total] = await Promise.all([
      qb.getRawMany(),
      this.profiles.count(status ? { where: { status: status as any } } : {}),
    ]);

    return {
      items: items.map((i: any) => ({
        ...i,
        userId: Number(i.userId),
        commissionRate: Number(i.commissionRate),
        productCount: Number(i.productCount),
        ratingAvg: Number(i.ratingAvg),
        isFeatured: !!i.isFeatured,
      })),
      total,
      page: p.page,
      limit: p.limit,
    };
  }

  /** مشاهده یک درخواست فروشندگی به‌همراه اطلاعات کاربر */
  async findOneForAdmin(profileId: number) {
    const profile = await this.profiles.findOne({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'SELLER_PROFILE_NOT_FOUND',
        message: 'پروفایل فروشنده یافت نشد',
      });
    }
    const user = await this.users.findOne({
      where: { id: profile.userId },
      select: { id: true, fullName: true, phone: true, email: true, status: true },
    });
    return { ...profile, user };
  }

  /**
   * بررسی درخواست توسط ادمین — تأیید یا رد
   *
   * در صورت تأیید:
   *  - وضعیت به 'approved' تغییر می‌کند
   *  - نرخ کمیسیون (در صورت ارسال) به‌روزرسانی می‌شود
   *  - نقش 'seller' به کاربر اختصاص می‌یابد (بدون حذف نقش‌های موجود)
   */
  async review(profileId: number, adminId: number, dto: AdminReviewSellerDto) {
    const profile = await this.profiles.findOne({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'SELLER_PROFILE_NOT_FOUND',
        message: 'پروفایل فروشنده یافت نشد',
      });
    }
    if (profile.status !== 'pending' && profile.status !== 'rejected') {
      throw new DomainException(
        'SELLER_ALREADY_REVIEWED',
        'این درخواست قبلاً بررسی شده است',
        409,
      );
    }

    const now = new Date();
    if (dto.status === 'approved') {
      await this.profiles.update(profile.id, {
        status: 'approved',
        rejectionReason: null,
        reviewedBy: adminId,
        reviewedAt: now,
        ...(dto.commissionRate
          ? { commissionRate: Number(dto.commissionRate) }
          : {}),
      });
      await this.assignSellerRole(profile.userId, adminId);
      this.logger.log(
        `ادمین ${adminId} درخواست فروشنده ${profile.userId} را تأیید کرد`,
      );
    } else {
      // rejected
      await this.profiles.update(profile.id, {
        status: 'rejected',
        rejectionReason: dto.rejectionReason?.trim() || null,
        reviewedBy: adminId,
        reviewedAt: now,
      });
      this.logger.log(
        `ادمین ${adminId} درخواست فروشنده ${profile.userId} را رد کرد`,
      );
    }

    return this.profiles.findOne({ where: { id: profile.id } });
  }

  /**
   * اختصاص نقش «seller» به کاربر — غیرمخرب (نقش‌های قبلی را حذف نمی‌کند).
   *
   * ابتدا شناسه نقش seller را از روی نام پیدا می‌کند، سپس در صورت عدم وجود،
   * یک ردیف role_user درج می‌کند. در نهایت کش مجوزهای کاربر را باطل می‌کند.
   */
  private async assignSellerRole(userId: number, adminId: number): Promise<void> {
    const sellerRole = await this.roles.findOne({
      where: { name: SELLER_ROLE_NAME },
      select: { id: true },
    });
    if (!sellerRole) {
      // نقش هنوز seed نشده — به‌جای شکستن جریان، فقط لاگ می‌کنیم
      this.logger.warn(
        `نقش '${SELLER_ROLE_NAME}' یافت نشد — بررسی کنید که migration AddSellerPanel اجرا شده باشد`,
      );
      return;
    }

    // بررسی اینکه آیا کاربر از قبل این نقش را دارد
    const exists = await this.roleUsers.findOne({
      where: { userId, roleId: sellerRole.id },
      select: { roleId: true },
    });
    if (exists) {
      await this.rbac.invalidateUser(userId);
      return;
    }

    // درج غیرمخرب نقش seller (مشابه الگوی assignCustomerRole)
    await this.roleUsers
      .createQueryBuilder()
      .insert()
      .values({ userId, roleId: sellerRole.id, assignedBy: adminId })
      .orIgnore()
      .execute();
    await this.rbac.invalidateUser(userId);
  }

  // --------------------------------------------------------------- کمکی‌ها

  /**
   * اطمینان از اینکه کاربر پروفایل فروشنده‌ی تأییدشده دارد.
   * در غیر این صورت، خطای 403 می‌اندازد.
   */
  async assertApproved(userId: number): Promise<SellerProfile> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'SELLER_PROFILE_NOT_FOUND',
        message: 'شما پروفایل فروشندگی ندارید',
      });
    }
    if (profile.status !== 'approved') {
      throw new DomainException(
        'SELLER_NOT_APPROVED',
        profile.status === 'pending'
          ? 'درخواست فروشندگی شما در انتظار تأیید است'
          : profile.status === 'rejected'
            ? 'درخواست فروشندگی شما رد شده است'
            : 'حساب فروشندگی شما معلق شده است',
        403,
      );
    }
    return profile;
  }
}
