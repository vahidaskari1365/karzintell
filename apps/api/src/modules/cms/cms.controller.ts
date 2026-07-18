import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Public, RequirePermissions } from '../../common/decorators';
import { CmsService } from './cms.service';
import { BannerPosition } from '../../database/entities';

class BannerDto {
  @IsOptional() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(150) title: string;
  @IsOptional() @IsString() @MaxLength(300) subtitle?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) imagePath: string;
  @IsOptional() @IsString() @MaxLength(500) mobileImagePath?: string;
  @IsOptional() @IsString() @MaxLength(500) linkUrl?: string;
  @IsOptional() @IsIn(['home_hero', 'home_middle', 'home_bottom', 'category_top', 'sidebar'] as const)
  position?: BannerPosition;
  @IsOptional() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

class PageDto {
  @IsOptional() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(190) title: string;
  @IsOptional() @IsString() @MaxLength(220) slug?: string;
  @IsString() @IsNotEmpty() body: string;
  @IsOptional() @IsIn(['draft', 'published'] as const) status?: 'draft' | 'published';
  @IsOptional() @IsString() @MaxLength(190) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) metaDescription?: string;
}

@ApiTags('cms')
@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get('banners')
  async banners(@Query('position') position: string = 'home_hero') {
    return { data: await this.cms.activeBanners(position as BannerPosition) };
  }

  @Public()
  @Get('pages/:slug')
  async page(@Param('slug') slug: string) {
    return { data: await this.cms.publishedPage(slug) };
  }
}

@ApiTags('admin/cms')
@Controller('admin')
export class AdminCmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('banners')
  @RequirePermissions('banners.manage')
  async adminBanners() {
    return { data: await this.cms.adminBanners() };
  }

  @Post('banners')
  @RequirePermissions('banners.manage')
  async createBanner(@Body() dto: BannerDto) {
    return { data: await this.cms.saveBanner(this.normalizeBanner(dto)) };
  }

  @Patch('banners/:id')
  @RequirePermissions('banners.manage')
  async updateBanner(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<BannerDto>) {
    return { data: await this.cms.saveBanner(this.normalizeBanner({ ...dto, id } as BannerDto)) };
  }

  @Delete('banners/:id')
  @RequirePermissions('banners.manage')
  async removeBanner(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.cms.removeBanner(id) };
  }

  @Get('pages')
  @RequirePermissions('pages.manage')
  async adminPages() {
    return { data: await this.cms.adminPages() };
  }

  @Post('pages')
  @RequirePermissions('pages.manage')
  async createPage(@Body() dto: PageDto) {
    return { data: await this.cms.savePage(dto) };
  }

  @Patch('pages/:id')
  @RequirePermissions('pages.manage')
  async updatePage(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<PageDto>) {
    return { data: await this.cms.savePage({ ...dto, id } as PageDto) };
  }

  @Delete('pages/:id')
  @RequirePermissions('pages.manage')
  async removePage(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.cms.removePage(id) };
  }

  private normalizeBanner(dto: Partial<BannerDto>): any {
    return {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }
}
