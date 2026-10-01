import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, PushSubscription, User } from '../../database/entities';
import { NotificationsService } from './notifications.service';
import { PushController } from './push.controller';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription, User])],
  providers: [NotificationsService],
  controllers: [NotificationsController, PushController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
