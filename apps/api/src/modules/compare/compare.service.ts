import { dbQuery } from '../../common/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Product, ProductCompare } from '../../database/entities';
import { FilesService } from '../files/files.service';
import { DomainException } from '../../common/http-exception.filter';

export const COMPARE_LIMIT = 4;

@Injectable()
export class CompareService {
  constructor(
    @InjectRepository(ProductCompare) private readonly compares: Repository<ProductCompare>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly files: FilesService,
  ) {}

  async ids(userId: number): Promise<number[]> {
    const rows = await this.compares.find({ where: { userId } });
    return rows.map((r) => Number(r.productId));
  }

  async toggle(userId: number, productId: number) {
    const existing = await this.compares.findOne({ where: { userId, productId } });
    if (existing) {
      await this.compares.delete({ userId, productId });
      return { inCompare: false, ids: await this.ids(userId) };
    }
    const current = await this.ids(userId);
    if (current.length >= COMPARE_LIMIT)
      throw new DomainException('COMPARE_FULL', `حداکثر ${COMPARE_LIMIT} محصول را می‌توانید مقایسه کنید`, 400);
    const product = await this.products.findOne({ where: { id: productId, status: 'published' } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    await this.compares.save(this.compares.create({ userId, productId }));
    return { inCompare: true, ids: await this.ids(userId) };
  }

  async clear(userId: number) {
    await this.compares.delete({ userId });
    return { cleared: true };
  }

  /** داده کامل مقایسه: محصولات + مشخصات فنی یکدست (حداکثر ۴ محصول، عمومی) */
  async compareData(rawIds: number[]) {
    const ids = [...new Set(rawIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))].slice(0, COMPARE_LIMIT);
    if (!ids.length) return { items: [], attributeNames: [] as string[] };
    const ph = ids.map(() => '?').join(',');

    const products = await dbQuery(this.em,
      `SELECT p.id, p.name, p.slug, p.short_description AS "shortDescription",
              p.rating_avg AS "ratingAvg", p.rating_count AS "ratingCount",
              b.name AS "brandName", c.name AS "categoryName", c.id AS "categoryId",
              (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
              (SELECT MIN(price) FROM product_variants WHERE product_id = p.id AND is_active = TRUE AND deleted_at IS NULL) AS "minPrice",
              (SELECT MAX(price) FROM product_variants WHERE product_id = p.id AND is_active = TRUE AND deleted_at IS NULL) AS "maxPrice",
              (SELECT COALESCE(SUM(i.quantity - i.reserved),0) FROM inventory i
                JOIN product_variants v2 ON v2.id = i.variant_id
                WHERE v2.product_id = p.id AND v2.is_active = TRUE) AS available
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id IN (${ph}) AND p.status = 'published' AND p.deleted_at IS NULL
       ORDER BY array_position(ARRAY[${ph}]::bigint[], p.id)`,
      [...ids, ...ids],
    );

    // مشخصات فنی (product_attributes + نام ویژگی + مقدار)
    const specs = await dbQuery(this.em,
      `SELECT pa.product_id AS "productId", a.name AS "attributeName",
              COALESCE(av.value, pa.custom_value) AS value, pa.sort_order AS "attrSort"
       FROM product_attributes pa
       JOIN attributes a ON a.id = pa.attribute_id
       LEFT JOIN attribute_values av ON av.id = pa.attribute_value_id
       WHERE pa.product_id IN (${ph})
       ORDER BY pa.sort_order ASC, a.id ASC`,
      ids,
    );
    const specMap = new Map<number, Map<string, string>>();
    const attributeNames: string[] = [];
    for (const s of specs) {
      const pid = Number(s.productId);
      if (!specMap.has(pid)) specMap.set(pid, new Map());
      if (s.value != null && s.value !== '') specMap.get(pid)!.set(String(s.attributeName), String(s.value));
      if (!attributeNames.includes(s.attributeName)) attributeNames.push(s.attributeName);
    }

    const items = products.map((r: any) => {
      const specEntries = specMap.get(Number(r.id));
      return {
        id: Number(r.id),
        name: r.name,
        slug: r.slug,
        image: this.files.publicUrl(r.image),
        brandName: r.brandName ?? null,
        categoryName: r.categoryName ?? null,
        shortDescription: r.shortDescription ?? null,
        price: r.minPrice != null ? Number(r.minPrice) : null,
        maxPrice: r.maxPrice != null ? Number(r.maxPrice) : null,
        ratingAvg: r.ratingAvg != null ? Number(r.ratingAvg) : 0,
        ratingCount: Number(r.ratingCount ?? 0),
        inStock: Number(r.available ?? 0) > 0,
        specs: specEntries ? Object.fromEntries(specEntries) : {},
      };
    });
    return { items, attributeNames };
  }
}
