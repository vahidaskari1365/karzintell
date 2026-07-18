import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { paginate } from '../../common/utils';
import { AuthUser } from '../../common/types';
import { UsersService } from './users.service';
import { AddressDto, UpdateProfileDto } from './users.dto';

@ApiTags('me')
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ------------------------------------------------------------- پروفایل
  @Get()
  me(@CurrentUser() user: AuthUser) {
    return { data: user };
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return { data: await this.users.updateProfile(user.id, dto) };
  }

  // -------------------------------------------------------------- آدرس‌ها
  @Get('addresses')
  async addresses(@CurrentUser() user: AuthUser) {
    return { data: await this.users.listAddresses(user.id) };
  }

  @Post('addresses')
  async addAddress(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) {
    return { data: await this.users.addAddress(user.id, dto) };
  }

  @Patch('addresses/:id')
  async updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<AddressDto>,
  ) {
    return { data: await this.users.updateAddress(user.id, id, dto) };
  }

  @Delete('addresses/:id')
  async removeAddress(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return { data: await this.users.removeAddress(user.id, id) };
  }

  @Post('addresses/:id/default')
  async setDefault(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return { data: await this.users.setDefaultAddress(user.id, id) };
  }

  // --------------------------------------------------------- علاقه‌مندی‌ها
  @Get('wishlist')
  async wishlist(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('limit') limit?: string) {
    const p = paginate(page, limit);
    const { items, total } = await this.users.wishlist(user.id, p.page, p.limit);
    return { data: items, meta: { page: p.page, limit: p.limit, total } };
  }

  @Post('wishlist/:productId')
  async addWish(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    return { data: await this.users.toggleWishlist(user.id, productId, true) };
  }

  @Delete('wishlist/:productId')
  async removeWish(@CurrentUser() user: AuthUser, @Param('productId', ParseIntPipe) productId: number) {
    return { data: await this.users.toggleWishlist(user.id, productId, false) };
  }
}
