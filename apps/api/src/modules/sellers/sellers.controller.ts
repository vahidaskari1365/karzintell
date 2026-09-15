import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { SellersService } from './sellers.service';
import {
  AdminReviewSellerDto,
  BecomeSellerDto,
  UpdateSellerProfileDto,
} from './seller.dto';

// محدودیت شدید برای ثبت درخواست فروشندگی — ۳ درخواست در ساعت برای هر IP
// (ضد spam و تلاش‌های مکرر برای تولید اسلاگ‌های یکتا)
const APPLY_THROTTLE = { default: { limit: 3, ttl: 3_600_000 } };

/**
 * کنترلر پنل فروشنده — مسیرهای /seller/*
 *
 * این مسیرها برای کاربر لاگین‌شده‌ای طراحی شده‌اند که می‌خواهد فروشنده شود
 * یا فروشنده‌ی تأییدشده است و می‌خواهد محصولات/سفارش‌های خود را مدیریت کند.
 */
@ApiTags('seller')
@Controller('seller')
export class SellerController {
  constructor(private readonly sellers: SellersService) {}

  /**
   * درخواست فروشندگی — هر کاربر لاگین‌شده‌ای می‌تواند ثبت کند.
   * نیازی به مجوز خاصی ندارد چون هنوز نقش seller ندارد.
   */
  @Post('apply')
  @Throttle(APPLY_THROTTLE)
  async apply(@CurrentUser() user: AuthUser, @Body() dto: BecomeSellerDto) {
    return { data: await this.sellers.apply(user.id, dto) };
  }

  /** مشاهده پروفایل فروشندگی خودش */
  @Get('profile')
  @RequirePermissions('seller.profile.manage')
  async profile(@CurrentUser() user: AuthUser) {
    return { data: await this.sellers.getMyProfile(user.id) };
  }

  /** ویرایش پروفایل فروشندگی — فقط در صورت تأیید */
  @Patch('profile')
  @RequirePermissions('seller.profile.manage')
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSellerProfileDto,
  ) {
    return { data: await this.sellers.updateMyProfile(user.id, dto) };
  }

  /** فهرست محصولات فروشنده با صفحه‌بندی */
  @Get('products')
  @RequirePermissions('seller.products.view')
  async products(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const r = await this.sellers.getMyProducts(user.id, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  /** مشاهده محصول تکی — مالکیت تأیید می‌شود */
  @Get('products/:id')
  @RequirePermissions('seller.products.view')
  async product(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return { data: await this.sellers.getMyProduct(user.id, id) };
  }

  /** فهرست سفارش‌هایی که شامل محصولات این فروشنده است */
  @Get('orders')
  @RequirePermissions('seller.orders.view')
  async orders(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const r = await this.sellers.getMyOrders(user.id, page, limit, status);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  /** داشبورد فروشنده — آمار کلی */
  @Get('dashboard')
  @RequirePermissions('seller.dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    return { data: await this.sellers.getMyDashboard(user.id) };
  }
}

/**
 * کنترلر ادمین برای مدیریت درخواست‌های فروشندگی — مسیرهای /admin/sellers/*
 */
@ApiTags('admin/sellers')
@Controller('admin/sellers')
export class AdminSellersController {
  constructor(private readonly sellers: SellersService) {}

  /** فهرست همه پروفایل‌های فروشنده با فیلتر وضعیت */
  @Get()
  @RequirePermissions('users.view')
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const r = await this.sellers.findAll(status, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  /** مشاهده یک پروفایل فروشنده با اطلاعات کاربر */
  @Get(':id')
  @RequirePermissions('users.view')
  async one(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.sellers.findOneForAdmin(id) };
  }

  /** تأیید یا رد درخواست فروشندگی */
  @Post(':id/review')
  @RequirePermissions('users.assign_role')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: AuthUser,
    @Body() dto: AdminReviewSellerDto,
  ) {
    return { data: await this.sellers.review(id, admin.id, dto) };
  }
}
