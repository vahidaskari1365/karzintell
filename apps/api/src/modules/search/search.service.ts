import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeiliSearch } from 'meilisearch';
import { Product } from '../../database/entities';
import { env } from '../../config/configuration';
import { FilesService } from '../files/files.service';

export interface ProductSearchQuery {
  q?: string;
  categorySlug?: string;
  brandIds?: number[];
  tagIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sort?: string;
  page: number;
  limit: number;
}

/**
 * جستجو با Meilisearch؛ در نبودن Meili → fallback به MySQL.
 * سینک: در رویدادهای محصول مستقیم (بدون صف) انجام می‌شود؛ در صورت خطا لاگ + reindex دستی.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger('Search');
  private client = new MeiliSearch({ host: env.meili.host, apiKey: env.meili.masterKey });
  private available = false;

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly files: FilesService,
  ) {}

  async onModuleInit() {
    try {
      await this.client.health();
      this.available = true;
      await this.configureIndex();
      this.logger.log('Meilisearch متصل شد');
    } catch {
      this.logger.warn('Meilisearch در دسترس نیست — جستجو با MySQL انجام می‌شود');
    }
  }

  private index() {
    return this.client.index(env.meili.index);
  }

  isAvailable(): boolean {
    return this.available;
  }

  private async configureIndex() {
    try {
      await this.index().updateSettings({
        searchableAttributes: ['name', 'brandName', 'categoryName', 'code', 'skus', 'shortDescription', 'tags'],
        filterableAttributes: ['status', 'categoryId', 'categorySlug', 'brandId', 'tagIds', 'minPrice', 'ratingAvg', 'inStock'],
        sortableAttributes: ['minPrice', 'publishedAt', 'soldCount', 'ratingAvg', 'maxDiscountPercent'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'soldCount:desc'],
      });
    } catch (e) {
      this.logger.warn(`configureIndex failed: ${(e as Error).message}`);
    }
  }

  async upsertProduct(productId: number) {
    if (!this.available) return;
    try {
      const doc = await this.buildDocument(productId);
      await this.index().addDocuments([doc]);
    } catch (e) {
      this.logger.warn(`meili upsert ${productId} failed: ${(e as Error).message}`);
    }
  }

  async removeProduct(productId: number) {
    if (!this.available) return;
    try { await this.index().deleteDocument(String(productId)); } catch { /* noop */ }
  }

  async reindexAll() {
    if (!this.available) return { reindexed: 0, engine: 'unavailable' };
    const ids = await this.products.find({ select: { id: true } as any });
    let count = 0;
    for (const chunk of chunkArray(ids.map((r) => r.id), 100)) {
      const docs = await Promise.all(chunk.map((id) => this.buildDocument(id)));
      await this.index().addDocuments(docs);
      count += docs.length;
    }
    return { reindexed: count, engine: 'meilisearch' };
  }

  async search(query: ProductSearchQuery) {
    if (this.available) return this.searchMeili(query);
    return this.searchDb(query);
  }

  async suggest(q: string) {
    if (!q || q.trim().length < 2) return { items: [], categories: [] };
    const term = q.trim();
    if (this.available) {
      const res = await this.index().search(term, {
        limit: 8,
        attributesToRetrieve: ['name', 'slug', 'image', 'minPrice', 'brandName', 'categoryName'],
      });
      return { items: res.hits, categories: [] };
    }
    // fallback MySQL: پیشنهاد محصول + دسته‌بندی
    const like = `%${term}%`;
    const items = await this.products.query(
      `SELECT p.name, p.slug, p.min_price AS minPrice, b.name AS brandName, c.name AS categoryName,
              (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'published' AND (p.name LIKE ? OR p.code LIKE ? OR b.name LIKE ?)
       ORDER BY p.sold_count DESC
       LIMIT 8`,
      [like, like, like],
    );
    const categories = await this.products.query(
      `SELECT name, slug FROM categories WHERE is_active = 1 AND deleted_at IS NULL AND name LIKE ? ORDER BY sort_order LIMIT 4`,
      [like],
    );
    return {
      items: items.map((i: any) => ({ ...i, image: this.files.publicUrl(i.image) })),
      categories,
    };
  }

  // ------------------------------------------------------------- Meili
  private async searchMeili(q: ProductSearchQuery) {
    const filters: string[] = ['status = "published"'];
    if (q.categorySlug) {
      const ids = await this.categorySubtreeIds(q.categorySlug);
      if (!ids.length) return { items: [], total: 0, page: q.page, limit: q.limit, engine: 'meilisearch' as const };
      filters.push(`categoryId IN [${ids.join(',')}]`);
    }
    if (q.brandIds?.length) filters.push(`brandId IN [${q.brandIds.join(',')}]`);
    if (q.tagIds?.length) filters.push(`tagIds IN [${q.tagIds.join(',')}]`);
    if (q.minPrice != null) filters.push(`minPrice >= ${q.minPrice}`);
    if (q.maxPrice != null) filters.push(`minPrice <= ${q.maxPrice}`);
    if (q.minRating != null) filters.push(`ratingAvg >= ${q.minRating}`);
    if (q.inStock) filters.push('inStock = true');

    const sortMap: Record<string, string[]> = {
      '-price': ['minPrice:desc'],
      price: ['minPrice:asc'],
      '-soldCount': ['soldCount:desc'],
      '-ratingAvg': ['ratingAvg:desc'],
      '-publishedAt': ['publishedAt:desc'],
      '-discount': ['maxDiscountPercent:desc'],
    };

    const res = await this.index().search(q.q || '', {
      filter: filters,
      sort: sortMap[q.sort || ''] || ['soldCount:desc'],
      page: q.page,
      hitsPerPage: q.limit,
    });
    return {
      items: res.hits,
      total: res.totalHits || 0,
      page: res.page || q.page,
      limit: q.limit,
      engine: 'meilisearch' as const,
    };
  }

  private async buildDocument(productId: number) {
    const rows = await this.products.query(
      `SELECT p.id, p.name, p.slug, p.code, p.category_id AS categoryId, c.slug AS categorySlug,
              c.name AS categoryName, p.brand_id AS brandId, b.name AS brandName,
              p.short_description AS shortDescription, p.min_price AS minPrice,
              p.published_at AS publishedAt, p.sold_count AS soldCount, p.rating_avg AS ratingAvg,
              p.status, p.features,
              (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image,
              (SELECT GROUP_CONCAT(sku SEPARATOR ' ') FROM product_variants WHERE product_id = p.id AND deleted_at IS NULL) AS skus,
              (SELECT GROUP_CONCAT(tag_id) FROM product_tags WHERE product_id = p.id) AS tagIdCsv,
              EXISTS(SELECT 1 FROM inventory i JOIN product_variants v ON v.id = i.variant_id
                     WHERE v.product_id = p.id AND v.is_active = 1 AND v.deleted_at IS NULL AND (i.quantity - i.reserved) > 0) AS inStock
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.id = ?`,
      [productId],
    );
    const r = rows[0];
    if (!r) return { id: productId, status: 'archived' };
    const tags = await this.products.query(`SELECT t.name FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id = ?`, [productId]);
    const discountRows = await this.products.query(
      `SELECT MAX(ROUND((compare_at_price - price) * 100 / compare_at_price)) AS d
       FROM product_variants
       WHERE product_id = ? AND is_active = 1 AND deleted_at IS NULL AND compare_at_price IS NOT NULL AND compare_at_price > price`,
      [productId],
    );
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      code: r.code,
      categoryId: r.categoryId,
      categorySlug: r.categorySlug,
      categoryName: r.categoryName,
      brandId: r.brandId,
      brandName: r.brandName,
      shortDescription: (r.shortDescription || '').slice(0, 250),
      minPrice: r.minPrice != null ? Number(r.minPrice) : null,
      publishedAt: r.publishedAt ? Math.floor(new Date(r.publishedAt).getTime() / 1000) : 0,
      soldCount: Number(r.soldCount || 0),
      ratingAvg: Number(r.ratingAvg || 0),
      maxDiscountPercent: Number(discountRows[0]?.d || 0),
      status: r.status,
      image: this.files.publicUrl(r.image),
      skus: r.skus || '',
      tagIds: r.tagIdCsv ? String(r.tagIdCsv).split(',').map(Number) : [],
      tags: tags.map((t: any) => t.name),
      inStock: !!r.inStock,
    };
  }

  /** شناسه‌های دسته + تمام زیرمجموعه‌ها (برای فیلتر چندسطحی: دیجیتال ← موبایل ← ...) */
  private async categorySubtreeIds(slug: string): Promise<number[]> {
    try {
      const rows = await this.products.query(
        `WITH RECURSIVE sub AS (
           SELECT id FROM categories WHERE slug = ? AND deleted_at IS NULL
           UNION ALL
           SELECT c.id FROM categories c JOIN sub s ON c.parent_id = s.id WHERE c.deleted_at IS NULL
         )
         SELECT id FROM sub`,
        [slug],
      );
      return rows.map((r: any) => Number(r.id));
    } catch {
      // MySQL قدیمی بدون CTE → فقط خود دسته
      const rows = await this.products.query(`SELECT id FROM categories WHERE slug = ? AND deleted_at IS NULL`, [slug]);
      return rows.map((r: any) => Number(r.id));
    }
  }

  // ------------------------------------------------- fallback به MySQL
  private async searchDb(q: ProductSearchQuery) {
    const qb = this.products
      .createQueryBuilder('p')
      .leftJoin('brands', 'b', 'b.id = p.brand_id')
      .leftJoin('categories', 'c', 'c.id = p.category_id')
      .leftJoin('product_images', 'img', 'img.product_id = p.id AND img.is_primary = 1')
      .select([
        'p.id AS id', 'p.name AS name', 'p.slug AS slug', 'p.code AS code',
        'b.id AS brandId', 'b.name AS brandName', 'c.slug AS categorySlug',
        'p.min_price AS minPrice', 'p.rating_avg AS ratingAvg', 'p.sold_count AS soldCount',
        'img.path AS image',
      ])
      .where('p.status = :st', { st: 'published' })
      .distinct(true);

    if (q.q) qb.andWhere('(p.name LIKE :q OR p.code LIKE :q OR b.name LIKE :q)', { q: `%${q.q}%` });
    if (q.categorySlug) {
      const ids = await this.categorySubtreeIds(q.categorySlug);
      if (!ids.length) return { items: [], total: 0, page: q.page, limit: q.limit, engine: 'mysql' as const };
      qb.andWhere('p.category_id IN (:...catIds)', { catIds: ids });
    }
    if (q.brandIds?.length) qb.andWhere('b.id IN (:...bids)', { bids: q.brandIds });
    if (q.minPrice != null) qb.andWhere('p.min_price >= :minp', { minp: q.minPrice });
    if (q.maxPrice != null) qb.andWhere('p.min_price <= :maxp', { maxp: q.maxPrice });
    if (q.minRating != null) qb.andWhere('p.rating_avg >= :minr', { minr: q.minRating });
    if (q.inStock)
      qb.andWhere(`EXISTS(SELECT 1 FROM inventory i JOIN product_variants v ON v.id = i.variant_id
        WHERE v.product_id = p.id AND v.is_active = 1 AND v.deleted_at IS NULL AND (i.quantity - i.reserved) > 0)`);

    if ((q.sort || '') === '-discount') {
      qb.addSelect(
        `(SELECT MAX(ROUND((v2.compare_at_price - v2.price) * 100 / v2.compare_at_price))
          FROM product_variants v2
          WHERE v2.product_id = p.id AND v2.is_active = 1 AND v2.deleted_at IS NULL
            AND v2.compare_at_price IS NOT NULL AND v2.compare_at_price > v2.price)`,
        'maxDiscountPercent',
      );
      qb.orderBy('maxDiscountPercent', 'DESC');
    } else {
      const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
        '-price': ['p.min_price', 'DESC'],
        price: ['p.min_price', 'ASC'],
        '-soldCount': ['p.sold_count', 'DESC'],
        '-ratingAvg': ['p.rating_avg', 'DESC'],
        '-publishedAt': ['p.published_at', 'DESC'],
      };
      const [col, dir] = sortMap[q.sort || ''] || ['p.sold_count', 'DESC'];
      qb.orderBy(col, dir);
    }

    const total = await qb.getCount();
    const items = await qb.offset((q.page - 1) * q.limit).limit(q.limit).getRawMany();
    return {
      items: items.map((i: any) => ({ ...i, image: this.files.publicUrl(i.image) })),
      total,
      page: q.page,
      limit: q.limit,
      engine: 'mysql' as const,
    };
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
