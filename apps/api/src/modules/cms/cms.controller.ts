import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { CmsService } from './cms.service';
import { BannerPosition, BlogKind } from '../../database/entities';

class PostDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(190) title: string;
  @IsOptional() @IsString() @MaxLength(220) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) excerpt?: string;
  @IsString() @IsNotEmpty() body: string;
  @IsOptional() @IsString() @MaxLength(500) coverPath?: string;
  @IsEnum(['post', 'news'] as const) kind: BlogKind;
  @IsOptional() @IsIn(['draft', 'published'] as const) status?: 'draft' | 'published';
  @IsOptional() @IsString() @MaxLength(190) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) metaDescription?: string;
}

class FaqDto {
  @IsOptional() @IsInt() id?: number;
  @IsString() @IsNotEmpty() @MaxLength(300) question: string;
  @IsString() @IsNotEmpty() answer: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

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
  @Get('pages')
  async pages() {
    return { data: await this.cms.publishedPages() };
  }

  @Public()
  @Get('pages/:slug')
  async page(@Param('slug') slug: string) {
    return { data: await this.cms.publishedPage(slug) };
  }

  // --------------------------------------------- عمومی: وبلاگ/اخبار/FAQ
  @Public()
  @Get('blog')
  async blogList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.cms.publishedPosts('post', page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Public()
  @Get('news')
  async newsList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.cms.publishedPosts('news', page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Public()
  @Get('blog/:slug')
  async blogPost(@Param('slug') slug: string) {
    return { data: await this.cms.publishedPostBySlug(slug) };
  }

  @Public()
  @Get('faqs')
  async faqs() {
    return { data: await this.cms.activeFaqs() };
  }

  @Public()
  @Get('marketing/torob')
  async torobFeed() {
    return { data: await this.cms.getTorobFeed() };
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

  // ------------------------------------------------------ وبلاگ/اخبار (ادمین)
  @Get('blog')
  @RequirePermissions('pages.manage')
  async adminBlog(@Query('kind') kind: BlogKind = 'post', @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.cms.adminPosts(kind, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('blog')
  @RequirePermissions('pages.manage')
  async createPost(@Body() dto: PostDto, @CurrentUser() user: AuthUser) {
    return { data: await this.cms.savePost(dto as any, user.id) };
  }

  @Patch('blog/:id')
  @RequirePermissions('pages.manage')
  async updatePost(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<PostDto>) {
    return { data: await this.cms.savePost({ ...dto, id } as any) };
  }

  @Delete('blog/:id')
  @RequirePermissions('pages.manage')
  async removePost(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.cms.removePost(id) };
  }

  // ------------------------------------------------------ FAQ (ادمین)
  @Get('faqs')
  @RequirePermissions('pages.manage')
  async adminFaqs() {
    return { data: await this.cms.adminFaqs() };
  }

  @Post('faqs')
  @RequirePermissions('pages.manage')
  async createFaq(@Body() dto: FaqDto) {
    return { data: await this.cms.saveFaq(dto as any) };
  }

  @Patch('faqs/:id')
  @RequirePermissions('pages.manage')
  async updateFaq(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<FaqDto>) {
    return { data: await this.cms.saveFaq({ ...dto, id } as any) };
  }

  @Delete('faqs/:id')
  @RequirePermissions('pages.manage')
  async removeFaq(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.cms.removeFaq(id) };
  }

  private normalizeBanner(dto: Partial<BannerDto>): any {
    return {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }
}
