import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Public } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { NotificationsService } from './notifications.service';

class PushKeysDto {
  @IsString() @IsNotEmpty()
  p256dh: string;

  @IsString() @IsNotEmpty()
  auth: string;
}

class SubscribeDto {
  @IsString() @IsNotEmpty()
  endpoint: string;

  @ValidateNested() @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

class UnsubscribeDto {
  @IsString() @IsNotEmpty()
  endpoint: string;
}

@ApiTags('push')
@Controller()
export class PushController {
  constructor(private readonly service: NotificationsService) {}

  /** کلید عمومی VAPID برای subscribe کردن در مرورگر */
  @Public()
  @Get('notifications/push/public-key')
  publicKey() {
    return { data: { publicKey: this.service.getPublicKey() } };
  }

  @Post('me/notifications/push/subscribe')
  async subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return { data: await this.service.subscribePush(user.id, dto.endpoint, dto.keys.p256dh, dto.keys.auth) };
  }

  @Delete('me/notifications/push/subscribe')
  async unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribeDto) {
    return { data: await this.service.unsubscribePush(user.id, dto.endpoint) };
  }
}
