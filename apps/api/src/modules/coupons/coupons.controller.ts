import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { RequirePermissions } from '../../common/decorators';
import { CouponsService } from './coupons.service';

export class CouponDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(50) code: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsEnum(['percent', 'fixed'] as const) type: 'percent' | 'fixed';
  @IsNumber() @Min(0) value: number;
  @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @IsNumber() @Min(0) minCartAmount?: number;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsInt() @Min(1) perUserLimit?: number;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('admin/coupons')
@Controller('admin/coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @RequirePermissions('coupons.manage')
  async list(@Query('page') page?: string, @Query('limit') limit?: string, @Query('q') q?: string) {
    const r = await this.service.adminList(page, limit, q);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post()
  @RequirePermissions('coupons.manage')
  async create(@Body() dto: CouponDto) {
    return { data: await this.service.save(this.normalize(dto)) };
  }

  @Patch(':id')
  @RequirePermissions('coupons.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CouponDto>) {
    return { data: await this.service.save(this.normalize({ ...dto, id } as CouponDto)) };
  }

  @Delete(':id')
  @RequirePermissions('coupons.manage')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.remove(id) };
  }

  private normalize(dto: Partial<CouponDto>) {
    return {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    } as any;
  }
}
