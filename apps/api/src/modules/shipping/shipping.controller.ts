import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { Public, RequirePermissions } from '../../common/decorators';
import { ShippingService } from '../shipping/shipping.service';
import { SHIPPING_METHOD_TYPES, ShippingMethodType } from '../../database/entities';

class ZoneDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsOptional() @IsArray() @IsString({ each: true }) provinces?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) cities?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

class MethodDto {
  @IsOptional() @IsInt() id?: number;
  @IsInt() zoneId: number;
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsEnum(SHIPPING_METHOD_TYPES) type: ShippingMethodType;
  @IsNumber() @Min(0) cost: number;
  @IsOptional() @IsNumber() @Min(0) freeAbove?: number;
  @IsOptional() @IsString() @MaxLength(100) eta?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

@ApiTags('shipping')
@Controller()
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  /** روش‌های ارسال برای مقصد (چک‌اوت) */
  @Public()
  @Get('shipping/methods')
  async methods(
    @Query('province') province?: string,
    @Query('city') city?: string,
    @Query('subtotal') subtotal?: string,
  ) {
    const r = await this.service.methodsFor(province, city, Number(subtotal) || 0);
    return { data: r };
  }

  // ---------------------------------------------------------------- ادمین
  @Get('admin/shipping/zones')
  @RequirePermissions('settings.manage')
  async zones() {
    return { data: await this.service.adminZones() };
  }

  @Post('admin/shipping/zones')
  @RequirePermissions('settings.manage')
  async createZone(@Body() dto: ZoneDto) {
    return { data: await this.service.saveZone(dto) };
  }

  @Patch('admin/shipping/zones/:id')
  @RequirePermissions('settings.manage')
  async updateZone(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<ZoneDto>) {
    return { data: await this.service.saveZone({ ...dto, id } as ZoneDto) };
  }

  @Delete('admin/shipping/zones/:id')
  @RequirePermissions('settings.manage')
  async removeZone(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.removeZone(id) };
  }

  @Post('admin/shipping/methods')
  @RequirePermissions('settings.manage')
  async createMethod(@Body() dto: MethodDto) {
    return { data: await this.service.saveMethod(dto as any) };
  }

  @Patch('admin/shipping/methods/:id')
  @RequirePermissions('settings.manage')
  async updateMethod(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<MethodDto>) {
    return { data: await this.service.saveMethod({ ...dto, id } as any) };
  }

  @Delete('admin/shipping/methods/:id')
  @RequirePermissions('settings.manage')
  async removeMethod(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.removeMethod(id) };
  }
}
