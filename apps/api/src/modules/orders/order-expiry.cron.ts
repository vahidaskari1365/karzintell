import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/** انقضای رزرو سفارش‌های پرداخت‌نشده (هر دقیقه) */
@Injectable()
export class OrderExpiryCron {
  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    await this.orders.expirePendingOrders().catch(() => undefined);
  }
}
