import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { Public, RequirePermissions } from '../../common/decorators';
import { CatalogService } from './catalog.service';

class CategoryDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(160) slug?: string;
  @IsOptional() @IsInt() parentId?: number | null;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imagePath?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
}

class BrandDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(140) slug?: string;
  @IsOptional() @IsString() logoPath?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

class AttributeDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) code: string;
  @IsOptional() @IsString() type?: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() groupName?: string;
  @IsOptional() @IsBoolean() isFilterable?: boolean;
}

class AttributeValueDto {
  @IsOptional() @IsInt() id?: number;
  @IsInt() attributeId: number;
  @IsString() @IsNotEmpty() @MaxLength(190) value: string;
  @IsOptional() meta?: Record<string, unknown>;
  @IsOptional() @IsInt() sortOrder?: number;
}

class CatAttrItem {
  @IsInt() attributeId: number;
  @IsBoolean() isVariant: boolean;
  @IsBoolean() isRequired: boolean;
  @IsInt() sortOrder: number;
}

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // --------------------------------------------- عمومی: دسته‌ها و برندها
  @Public()
  @Get('categories')
  async tree() {
    return { data: await this.catalog.tree() };
  }

  @Public()
  @Get('categories/:slug')
  async category(@Param('slug') slug: string) {
    return { data: await this.catalog.categoryBySlug(slug) };
  }

  @Public()
  @Get('brands')
  async brands() {
    return { data: await this.catalog.listBrands(true) };
  }

  @Public()
  @Get('attributes')
  async attributesForCategory(@Query('categoryId') categoryId?: string) {
    if (!categoryId) return { data: [] };
    return { data: await this.catalog.categoryFilterableAttributes(Number(categoryId)) };
  }

  // ------------------------------------------- ادمین: دسته‌ها (categories)
  @Get('admin/categories')
  @RequirePermissions('categories.manage')
  async adminCategories() {
    return { data: await this.catalog.adminCategories() };
  }

  @Post('admin/categories')
  @RequirePermissions('categories.manage')
  async createCategory(@Body() dto: CategoryDto) {
    return { data: await this.catalog.saveCategory(dto) };
  }

  @Patch('admin/categories/:id')
  @RequirePermissions('categories.manage')
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CategoryDto>) {
    return { data: await this.catalog.saveCategory({ ...dto, id }) };
  }

  @Delete('admin/categories/:id')
  @RequirePermissions('categories.manage')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.catalog.removeCategory(id) };
  }

  @Get('admin/categories/:id/attributes')
  @RequirePermissions('categories.manage')
  async categoryAttributes(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.catalog.categoryFilterableAttributes(id) };
  }

  @Put('admin/categories/:id/attributes')
  @RequirePermissions('categories.manage')
  async setCategoryAttributes(@Param('id', ParseIntPipe) id: number, @Body() body: { items: CatAttrItem[] }) {
    return { data: await this.catalog.setCategoryAttributes(id, body.items || []) };
  }

  // ---------------------------------------------------- ادمین: برندها
  @Get('admin/brands')
  @RequirePermissions('brands.manage')
  async adminBrands() {
    return { data: await this.catalog.listBrands(false) };
  }

  @Post('admin/brands')
  @RequirePermissions('brands.manage')
  async createBrand(@Body() dto: BrandDto) {
    return { data: await this.catalog.saveBrand(dto) };
  }

  @Patch('admin/brands/:id')
  @RequirePermissions('brands.manage')
  async updateBrand(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<BrandDto>) {
    return { data: await this.catalog.saveBrand({ ...dto, id }) };
  }

  @Delete('admin/brands/:id')
  @RequirePermissions('brands.manage')
  async deleteBrand(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.catalog.removeBrand(id) };
  }

  // ------------------------------------------------- ادمین: صفت‌ها
  @Get('admin/attributes')
  @RequirePermissions('attributes.manage')
  async adminAttributes() {
    return { data: await this.catalog.adminAttributes() };
  }

  @Post('admin/attributes')
  @RequirePermissions('attributes.manage')
  async createAttribute(@Body() dto: AttributeDto) {
    return { data: await this.catalog.saveAttribute(dto) };
  }

  @Patch('admin/attributes/:id')
  @RequirePermissions('attributes.manage')
  async updateAttribute(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<AttributeDto>) {
    return { data: await this.catalog.saveAttribute({ ...dto, id }) };
  }

  @Delete('admin/attributes/:id')
  @RequirePermissions('attributes.manage')
  async deleteAttribute(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.catalog.removeAttribute(id) };
  }

  @Post('admin/attributes/values')
  @RequirePermissions('attributes.manage')
  async createAttributeValue(@Body() dto: AttributeValueDto) {
    return { data: await this.catalog.saveAttributeValue(dto) };
  }

  @Patch('admin/attributes/values/:id')
  @RequirePermissions('attributes.manage')
  async updateAttributeValue(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<AttributeValueDto>) {
    return { data: await this.catalog.saveAttributeValue({ ...dto, id } as any) };
  }

  @Delete('admin/attributes/values/:id')
  @RequirePermissions('attributes.manage')
  async deleteAttributeValue(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.catalog.removeAttributeValue(id) };
  }
}
