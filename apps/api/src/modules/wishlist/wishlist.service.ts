import { dbQuery } from '../../common/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Product, Wishlist } from '../../database/entities';
import { FilesService } from '../files/files.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist) private readonly wishlists: Repository<Wishlist>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly files: FilesService,
  ) {}

  async ids(userId: number): Promise<number[]> {
    const rows = await this.wishlists.find({ where: { userId } });
    return rows.map((r) => Number(r.productId));
  }

  /** افزودن/حذف (تاگل) */
  async toggle(userId: number, productId: number) {
    const existing = await this.wishlists.findOne({ where: { userId, productId } });
    if (existing) {
      await this.wishlists.delete({ userId, productId });
      return { inWishlist: false, ids: await this.ids(userId) };
    }
    const product = await this.products.findOne({ where: { id: productId, status: 'published' } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    await this.wishlists.save(this.wishlists.create({ userId, productId }));
    return { inWishlist: true, ids: await this.ids(userId) };
  }

  async remove(userId: number, productId: number) {
    await this.wishlists.delete({ userId, productId });
    return { removed: true };
  }

  /** لیست علاقه‌مندی‌ها با اطلاعات کارت محصول */
  async list(userId: number) {
    const ids = await this.ids(userId);
    if (!ids.length) return { items: [], ids: [] };
    const ph = ids.map(() => '?').join(',');
    const rows = await dbQuery(this.em,
      `SELECT p.id, p.name, p.slug, p.rating_avg AS "ratingAvg", p.rating_count AS "ratingCount",
              b.name AS "brandName",
              (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS image,
              (SELECT MIN(price) FROM product_variants WHERE product_id = p.id AND is_active = TRUE AND deleted_at IS NULL) AS "minPrice",
              (SELECT MAX(compare_at_price) FROM product_variants WHERE product_id = p.id AND is_active = TRUE AND deleted_at IS NULL) AS "maxCompareAt",
              (SELECT COALESCE(SUM(i.quantity - i.reserved),0) FROM inventory i
                JOIN product_variants v2 ON v2.id = i.variant_id
                WHERE v2.product_id = p.id AND v2.is_active = TRUE) AS available
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.id IN (${ph}) AND p.status = 'published' AND p.deleted_at IS NULL`,
      ids,
    );
    const items = rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      slug: r.slug,
      image: this.files.publicUrl(r.image),
      brandName: r.brandName ?? null,
      minPrice: r.minPrice != null ? Number(r.minPrice) : null,
      compareAtPrice: r.maxCompareAt != null ? Number(r.maxCompareAt) : null,
      ratingAvg: r.ratingAvg != null ? Number(r.ratingAvg) : 0,
      ratingCount: Number(r.ratingCount ?? 0),
      inStock: Number(r.available ?? 0) > 0,
    }));
    return { items, ids };
  }
}
