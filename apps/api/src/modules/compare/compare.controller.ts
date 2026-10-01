import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { CurrentUser, Public } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { CompareService } from './compare.service';

class ToggleDto {
  @IsInt()
  productId: number;
}

@ApiTags('compare')
@Controller()
export class CompareController {
  constructor(private readonly service: CompareService) {}

  /** داده مقایسه — عمومی (شناسه‌ها را می‌توان از localStorage هم فرستاد) */
  @Public()
  @Get('compare/data')
  async data(@Query('ids') ids?: string) {
    const list = (ids || '').split(',').map((s) => Number(s.trim())).filter(Boolean);
    return { data: await this.service.compareData(list) };
  }

  // ------------------------------------------------- لیست کاربر (ورود لازم)
  @Get('me/compare')
  async myIds(@CurrentUser() user: AuthUser) {
    return { data: await this.service.ids(user.id) };
  }

  @Post('me/compare/toggle')
  async toggle(@CurrentUser() user: AuthUser, @Body() dto: ToggleDto) {
    return { data: await this.service.toggle(user.id, dto.productId) };
  }

  @Delete('me/compare')
  async clear(@CurrentUser() user: AuthUser) {
    return { data: await this.service.clear(user.id) };
  }
}
