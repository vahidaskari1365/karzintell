import {
  Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { Request } from 'express';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { OrdersService } from './orders.service';
import { ORDER_STATUSES, OrderStatus } from '../../database/entities';

class CheckoutDto {
  @IsInt()
  addressId: number;

  @IsOptional() @IsString() @MaxLength(100)
  shippingMethod?: string;

  @IsOptional() @IsString() @MaxLength(500)
  customerNote?: string;

  @IsOptional() @IsString() @MaxLength(50)
  couponCode?: string;
}

class ChangeStatusDto {
  @IsEnum(ORDER_STATUSES as readonly string[])
  to: OrderStatus;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

class NoteDto {
  @IsString() @MaxLength(1000)
  note: string;
}

class ShipmentDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  provider: string;

  @IsOptional() @IsString() @MaxLength(100)
  method?: string;

  @IsOptional() @IsString() @MaxLength(50)
  trackingCode?: string;

  @IsOptional() @IsNumber()
  cost?: number;

  @IsOptional() @IsEnum(['pending', 'picked_up', 'in_transit', 'delivered', 'returned'] as const)
  status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';
}

class TrackGuestDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  phone: string;
}

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly orders: OrdersService) {}

  /** ثبت سفارش — هدر Idempotency-Key اجباری */
  @Post()
  async checkout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idemKey: string | undefined,
    @Req() req: Request,
  ) {
    return { data: await this.orders.checkout(user, dto, idemKey, req.ip, req.headers['user-agent']) };
  }
}

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ------------------------------------------------------------- کاربر
  @Get('me/orders')
  async myOrders(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.orders.myOrders(user.id, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get('me/orders/:code')
  async myOrder(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return { data: await this.orders.detailForUser(user.id, code) };
  }

  @Public()
  @Post('orders/track-guest')
  async trackGuest(@Body() dto: TrackGuestDto) {
    return { data: await this.orders.trackGuest(dto.code, dto.phone) };
  }

  // ------------------------------------------------------------- ادمین
  @Get('admin/orders')
  @RequirePermissions('orders.view')
  async adminList(@Query() query: Record<string, string>) {
    const r = await this.orders.adminList(query);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get('admin/orders/:id')
  @RequirePermissions('orders.view')
  async adminDetail(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.orders.adminDetail(id) };
  }

  @Post('admin/orders/:id/status')
  @RequirePermissions('orders.update_status')
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return { data: await this.orders.changeStatus(id, dto.to, dto.note, admin.id) };
  }

  @Post('admin/orders/:id/cancel')
  @RequirePermissions('orders.cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: { reason?: string }, @CurrentUser() admin: AuthUser) {
    return { data: await this.orders.changeStatus(id, 'cancelled', dto.reason, admin.id) };
  }

  @Post('admin/orders/:id/note')
  @RequirePermissions('orders.view')
  async note(@Param('id', ParseIntPipe) id: number, @Body() dto: NoteDto) {
    return { data: await this.orders.setAdminNote(id, dto.note) };
  }

  @Put('admin/orders/:id/shipment')
  @RequirePermissions('orders.update_status')
  async shipment(@Param('id', ParseIntPipe) id: number, @Body() dto: ShipmentDto) {
    return { data: await this.orders.upsertShipment(id, dto) };
  }
}
