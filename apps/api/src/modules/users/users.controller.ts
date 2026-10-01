import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
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
}
