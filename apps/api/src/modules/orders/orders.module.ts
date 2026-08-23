import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Coupon, CouponUsage, Order, OrderItem, OrderStatusHistory, Payment, Shipment,
  UserAddress,
} from '../../database/entities';
import { OrdersService } from './orders.service';
import { OrdersController, CheckoutController } from './orders.controller';
import { OrderExpiryCron } from './order-expiry.cron';
import { ShippingModule } from '../shipping/shipping.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Payment, Shipment, UserAddress, Coupon, CouponUsage]),
    ShippingModule,
  ],
  controllers: [CheckoutController, OrdersController],
  providers: [OrdersService, OrderExpiryCron],
  exports: [OrdersService],
})
export class OrdersModule {}
