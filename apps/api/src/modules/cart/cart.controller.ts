import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { CartSession, CurrentUser, Public } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { CartService } from './cart.service';

class AddItemDto {
  @IsInt() variantId: number;
  @IsOptional() @IsInt() @Min(1)
  quantity?: number;
}

class UpdateItemDto {
  @IsInt() @Min(0)
  quantity: number;
}

class CouponDto {
  @IsString() @IsNotEmpty()
  code: string;
}

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  /**
   * سبد: اگر کاربر لاگین باشد به کاربر وصل است، وگرنه با X-Cart-Session (مهمان)
   * توجه: GET/POST آیتم‌ها با @Public روت عمومی‌اند — userId اختیاری.
   */
  @Public()
  @Get()
  async view(@CurrentUser() user: AuthUser | undefined, @CartSession() sid?: string) {
    return { data: await this.cart.view(user?.id ?? null, sid ?? null) };
  }

  @Public()
  @Post('items')
  async add(@CurrentUser() user: AuthUser | undefined, @CartSession() sid: string | undefined, @Body() dto: AddItemDto) {
    return { data: await this.cart.addItem(user?.id ?? null, sid ?? null, dto.variantId, dto.quantity || 1) };
  }

  @Public()
  @Patch('items/:id')
  async update(
    @CurrentUser() user: AuthUser | undefined,
    @CartSession() sid: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ) {
    return { data: await this.cart.updateItem(user?.id ?? null, sid ?? null, id, dto.quantity) };
  }

  @Public()
  @Delete('items/:id')
  async remove(@CurrentUser() user: AuthUser | undefined, @CartSession() sid: string | undefined, @Param('id', ParseIntPipe) id: number) {
    return { data: await this.cart.removeItem(user?.id ?? null, sid ?? null, id) };
  }

  @Post('coupon')
  async applyCoupon(@CurrentUser() user: AuthUser, @CartSession() sid: string | undefined, @Body() dto: CouponDto) {
    return { data: await this.cart.applyCoupon(user.id, sid ?? null, dto.code) };
  }

  @Delete('coupon')
  async removeCoupon(@CurrentUser() user: AuthUser | undefined, @CartSession() sid?: string) {
    return { data: await this.cart.removeCoupon(user?.id ?? null, sid ?? null) };
  }

  @Post('merge')
  async merge(@CurrentUser() user: AuthUser, @CartSession() sid?: string) {
    return { data: await this.cart.merge(user.id, sid ?? null) };
  }
}
