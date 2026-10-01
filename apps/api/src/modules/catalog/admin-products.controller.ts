import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { ProductsService } from './products.service';
import { SearchService } from '../search/search.service';
import { SaveProductDto } from './product.dto';
import { IsEnum } from 'class-validator';

class StatusDto {
  @IsEnum(['draft', 'pending', 'published', 'archived'] as const)
  status: 'draft' | 'pending' | 'published' | 'archived';
}

class BulkStatusDto extends StatusDto {
  ids: number[];
}

@ApiTags('admin/products')
@Controller('admin')
export class AdminProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly search: SearchService,
  ) {}

  @Get('products')
  @RequirePermissions('products.view')
  async list(@Query() query: Record<string, string>) {
    const r = await this.products.adminList(query);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get('products/:id')
  @RequirePermissions('products.view')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.products.adminDetail(id) };
  }

  @Post('products')
  @RequirePermissions('products.create')
  async create(@Body() dto: SaveProductDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.products.create(dto, admin.id) };
  }

  @Patch('products/:id')
  @RequirePermissions('products.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<SaveProductDto>,
    @CurrentUser() admin: AuthUser,
  ) {
    return { data: await this.products.update(id, dto, admin.id) };
  }

  @Delete('products/:id')
  @RequirePermissions('products.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.products.remove(id) };
  }

  @Post('products/:id/status')
  @RequirePermissions('products.publish')
  async setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusDto) {
    return { data: await this.products.setStatus(id, dto.status) };
  }

  @Post('products/bulk-status')
  @RequirePermissions('products.publish')
  async bulkStatus(@Body() dto: BulkStatusDto) {
    const results: Array<{ id: number; status: string }> = [];
    for (const id of dto.ids || []) results.push(await this.products.setStatus(id, dto.status));
    return { data: results };
  }

  // ابزار جستجو
  @Post('search/reindex')
  @RequirePermissions('settings.manage')
  async reindex() {
    return { data: await this.search.reindexAll() };
  }
}
