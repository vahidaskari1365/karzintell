import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators';
import { paginate } from '../../common/utils';
import { AuthUser } from '../../common/types';
import { NotificationsService } from './notifications.service';

class MarkReadDto {
  @IsOptional() @IsArray() @IsInt({ each: true })
  ids?: number[];
}

@ApiTags('me')
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('limit') limit?: string) {
    const p = paginate(page, limit);
    const [{ items, total }, unread] = await Promise.all([
      this.service.myNotifications(user.id, p.page, p.limit),
      this.service.unreadCount(user.id),
    ]);
    return { data: { items, unread }, meta: { page: p.page, limit: p.limit, total } };
  }

  @Post('read')
  async read(@CurrentUser() user: AuthUser, @Body() dto: MarkReadDto) {
    return { data: await this.service.markRead(user.id, dto.ids) };
  }
}
