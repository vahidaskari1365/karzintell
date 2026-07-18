import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { WishlistService } from './wishlist.service';

class ToggleDto {
  @IsInt()
  productId: number;
}

@ApiTags('me/wishlist')
@Controller('me/wishlist')
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return { data: await this.service.list(user.id) };
  }

  /** شناسه‌های موجود در علاقه‌مندی (برای علامت قلب روی کارت‌ها) */
  @Get('check')
  async check(@CurrentUser() user: AuthUser, @Query('ids') ids?: string) {
    if (!ids) return { data: [] };
    const wanted = ids.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    const mine = (await this.service.ids(user.id)).filter((id) => wanted.includes(id));
    return { data: mine };
  }

  @Post('toggle')
  async toggle(@CurrentUser() user: AuthUser, @Body() dto: ToggleDto) {
    return { data: await this.service.toggle(user.id, dto.productId) };
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    return { data: await this.service.remove(user.id, productId) };
  }
}
