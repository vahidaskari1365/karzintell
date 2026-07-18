import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner, BannerPosition, Page } from '../../database/entities';
import { RedisService } from '../../common/redis.service';
import { FilesService } from '../files/files.service';
import { sanitizeHtml, slugify } from '../../common/utils';

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(Banner) private readonly banners: Repository<Banner>,
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    private readonly redis: RedisService,
    private readonly files: FilesService,
  ) {}

  // ------------------------------------------------------------ بنرها
  async activeBanners(position: BannerPosition) {
    const key = `banners:${position}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    const now = new Date();
    const rows = await this.banners
      .createQueryBuilder('b')
      .where('b.position = :pos AND b.is_active = 1', { pos: position })
      .andWhere('(b.starts_at IS NULL OR b.starts_at <= :now)', { now })
      .andWhere('(b.ends_at IS NULL OR b.ends_at >= :now)', { now })
      .orderBy('b.sort_order', 'ASC')
      .getMany();
    const data = rows.map((b) => ({
      id: b.id, title: b.title, subtitle: b.subtitle,
      image: this.files.publicUrl(b.imagePath),
      mobileImage: this.files.publicUrl(b.mobileImagePath),
      linkUrl: b.linkUrl,
    }));
    await this.redis.set(key, JSON.stringify(data), 900);
    return data;
  }

  adminBanners() {
    return this.banners.find({ order: { position: 'ASC', sortOrder: 'ASC', id: 'DESC' } });
  }

  async saveBanner(dto: Partial<Banner> & { id?: number }) {
    if (dto.id) await this.banners.update(dto.id, dto);
    else dto.id = (await this.banners.save(this.banners.create(dto as Banner))).id;
    await this.redis.delByPattern('banners:*');
    return this.banners.findOne({ where: { id: dto.id } });
  }

  async removeBanner(id: number) {
    await this.banners.delete(id);
    await this.redis.delByPattern('banners:*');
    return { deleted: true };
  }

  // ------------------------------------------------------------ صفحات
  /** لیست صفحات منتشرشده (برای SEO/سایت‌مپ) */
  publishedPages() {
    return this.pages.find({
      where: { status: 'published' },
      select: ['id', 'slug', 'title', 'metaTitle', 'metaDescription', 'updatedAt'] as any,
      order: { id: 'ASC' },
    });
  }

  async publishedPage(slug: string) {
    const page = await this.pages.findOne({ where: { slug, status: 'published' } });
    if (!page) throw new NotFoundException('صفحه یافت نشد');
    return page;
  }

  adminPages() {
    return this.pages.find({ order: { id: 'DESC' } });
  }

  async savePage(dto: Partial<Page> & { id?: number }) {
    const slug = (dto.slug && slugify(dto.slug)) || slugify(dto.title || '');
    const clash = await this.pages.findOne({ where: { slug } });
    if (clash && clash.id !== dto.id)
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'اسلاگ صفحه تکراری است' });
    dto.slug = slug;
    if (dto.body) dto.body = sanitizeHtml(dto.body);
    if (dto.id) await this.pages.update(dto.id, dto);
    else dto.id = (await this.pages.save(this.pages.create(dto as Page))).id;
    return this.pages.findOne({ where: { id: dto.id } });
  }

  async removePage(id: number) {
    await this.pages.softDelete(id);
    return { deleted: true };
  }
}
