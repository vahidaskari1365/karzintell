import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Order,
  OrderItem,
  Product,
  Role,
  RoleUser,
  SellerProfile,
  User,
} from '../../database/entities';
import { RbacModule } from '../rbac/rbac.module';
import { SellersService } from './sellers.service';
import { AdminSellersController, SellerController } from './sellers.controller';

/**
 * ماژول پنل فروشنده (Vendor/Seller)
 *
 * موجودیت‌های SellerProfile و Product (و وابستگی‌های مربوط به سفارش/نقش) را ثبت
 * می‌کند. RbacModule برای اعطای نقش seller هنگام تأیید درخواست، تزریق می‌شود.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SellerProfile,
      Product,
      Order,
      OrderItem,
      User,
      Role,
      RoleUser,
    ]),
    RbacModule,
  ],
  controllers: [SellerController, AdminSellersController],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}
