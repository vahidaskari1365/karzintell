import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DataSource, DataSourceOptions } from 'typeorm';

import { env } from './config/configuration';
import { ALL_ENTITIES } from './database/entities';
import { RedisModule } from './common/redis.module';
import { QueueModule, QueueService } from './common/queue.service';
import { EnvelopeInterceptor } from './common/envelope.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { PermissionsGuard } from './common/permissions.guard';
import { AuditInterceptor } from './common/audit.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SearchModule } from './modules/search/search.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CompareModule } from './modules/compare/compare.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CmsModule } from './modules/cms/cms.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    JwtModule.register({ global: true }),
    TypeOrmModule.forRoot({
      type: env.db.type,
      host: env.db.host,
      port: env.db.port,
      username: env.db.username,
      password: env.db.password,
      database: env.db.database,
      charset: env.db.charset,
      timezone: env.db.timezone,
      entities: ALL_ENTITIES,
      synchronize: false, // schema is applied by MySQL migrations
      logging: env.db.logging,
      extra: { connectionLimit: env.db.poolSize },
    } as DataSourceOptions),
    RedisModule,
    QueueModule,

    AuthModule,
    RbacModule,
    NotificationsModule,
    SettingsModule,
    FilesModule,
    AuditModule,
    SearchModule,
    InventoryModule,
    CartModule,
    CouponsModule,
    WalletModule,
    ShippingModule,
    OrdersModule,
    WishlistModule,
    CompareModule,

    UsersModule,
    AdminUsersModule,
    CatalogModule,
    PaymentsModule,
    ReviewsModule,
    CmsModule,
    TicketsModule,
    CustomersModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private readonly queue: QueueService,
    private readonly dataSource: DataSource,
  ) {}

  onApplicationBootstrap() {
    this.queue.setDataSource(this.dataSource);
  }
}
