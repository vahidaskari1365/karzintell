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
import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { InventoryService } from './inventory.service';

class AdjustDto {
  @IsInt() variantId: number;
  @IsOptional() @IsInt() warehouseId?: number;
  @IsEnum(['in', 'out', 'return', 'adjust'] as const)
  type: 'in' | 'out' | 'return' | 'adjust';
  @IsInt() @Min(0)
  quantity: number;
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

class SetQtyDto {
  @IsInt() variantId: number;
  @IsOptional() @IsInt() warehouseId?: number;
  @IsInt() @Min(0)
  quantity: number;
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

class WarehouseDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(30) code: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('admin/inventory')
@Controller('admin')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('inventory')
  @RequirePermissions('inventory.view')
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('low_stock') lowStock?: string,
    @Query('q') q?: string,
  ) {
    const r = await this.service.adminList({ page, limit, q, lowStock: lowStock === '1' });
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get('inventory/alerts')
  @RequirePermissions('inventory.view')
  async alerts(@Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.service.openAlerts(page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get('inventory/movements')
  @RequirePermissions('inventory.view')
  async movements(
    @Query('variant_id') variantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const r = await this.service.movements(variantId ? Number(variantId) : undefined, Number(page) || 1, Number(limit) || 20);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('inventory/adjust')
  @RequirePermissions('inventory.manage')
  async adjust(@Body() dto: AdjustDto, @CurrentUser() admin: AuthUser) {
    const warehouseId = dto.warehouseId || (await this.service.defaultWarehouseId());
    const row = await this.service.move({ ...dto, warehouseId }, admin.id);
    return { data: row };
  }

  @Post('inventory/set')
  @RequirePermissions('inventory.manage')
  async set(@Body() dto: SetQtyDto, @CurrentUser() admin: AuthUser) {
    const warehouseId = dto.warehouseId || (await this.service.defaultWarehouseId());
    return { data: await this.service.setQuantity({ ...dto, warehouseId }, admin.id) };
  }

  // ---------------------------------------------------------------- انبارها
  @Get('warehouses')
  @RequirePermissions('inventory.view')
  async warehouses() {
    return { data: await this.service.listWarehouses() };
  }

  @Post('warehouses')
  @RequirePermissions('inventory.manage')
  async createWarehouse(@Body() dto: WarehouseDto) {
    return { data: await this.service.saveWarehouse(dto) };
  }

  @Patch('warehouses/:id')
  @RequirePermissions('inventory.manage')
  async updateWarehouse(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<WarehouseDto>) {
    return { data: await this.service.saveWarehouse({ ...dto, id } as any) };
  }

  @Delete('warehouses/:id')
  @RequirePermissions('inventory.manage')
  async removeWarehouse(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.removeWarehouse(id) };
  }
}
