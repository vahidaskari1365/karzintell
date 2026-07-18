import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
  Attribute, AttributeValue, Brand, Category, Product, ProductAttributeValue,
  ProductImage, ProductRelation, ProductTag, ProductVariant, ProductVariantValue,
  ProductVideo, Review, Tag,
} from '../../database/entities';
import { paginate, sanitizeHtml, slugify } from '../../common/utils';
import { DomainException } from '../../common/http-exception.filter';
import { FilesService } from '../files/files.service';
import { SearchService, ProductSearchQuery } from '../search/search.service';
import { InventoryService } from '../inventory/inventory.service';
import { SaveProductDto, ProductVariantDto } from './product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('Products');

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductVariantValue) private readonly variantValues: Repository<ProductVariantValue>,
    @InjectRepository(ProductImage) private readonly images: Repository<ProductImage>,
    @InjectRepository(ProductVideo) private readonly videos: Repository<ProductVideo>,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(ProductTag) private readonly productTags: Repository<ProductTag>,
    @InjectRepository(ProductRelation) private readonly relations: Repository<ProductRelation>,
    @InjectRepository(ProductAttributeValue) private readonly specs: Repository<ProductAttributeValue>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly files: FilesService,
    private readonly search: SearchService,
    private readonly inventory: InventoryService,
  ) {}

  // ================================================== عمومی (فروشگاه)
  async publicList(query: {
    q?: string; category?: string; brand?: string; tag?: string;
    minPrice?: string; maxPrice?: string; inStock?: string; sort?: string;
    page?: string; limit?: string;
  }) {
    const p = paginate(query.page, query.limit);
    const searchQuery: ProductSearchQuery = {
      q: query.q,
      categorySlug: query.category,
      brandIds: query.brand ? query.brand.split(',').map(Number) : undefined,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      inStock: query.inStock === '1',
      sort: query.sort,
      page: p.page,
      limit: p.limit,
    };
    const result = await this.search.search(searchQuery);
    return { items: result.items, total: result.total, page: p.page, limit: p.limit, engine: result.engine };
  }

  /** جزئیات کامل محصول برای صفحه محصول */
  async publicDetail(slug: string) {
    const product = await this.products.findOne({ where: { slug, status: 'published' } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    const full = await this.assemble(product, false);
    // شمارنده بازدید (بدون بلاک)
    this.products.increment({ id: product.id }, 'viewCount', 1).catch(() => undefined);
    return full;
  }

  private async assemble(product: Product, forAdmin: boolean) {
    const [variants, images, videos, specRows, tagRows, relRows, category, brand] = await Promise.all([
      this.variants.find({
        where: { productId: product.id, ...(forAdmin ? {} : { isActive: true }) },
        order: { isDefault: 'DESC', id: 'ASC' },
      }),
      this.images.find({ where: { productId: product.id }, order: { sortOrder: 'ASC', id: 'ASC' } }),
      this.videos.find({ where: { productId: product.id }, order: { sortOrder: 'ASC', id: 'ASC' } }),
      this.specs.find({ where: { productId: product.id }, order: { sortOrder: 'ASC', id: 'ASC' } }),
      this.productTags.find({ where: { productId: product.id } }),
      this.relations.find({ where: { productId: product.id }, order: { sortOrder: 'ASC' } }),
      this.categories.findOne({ where: { id: product.categoryId } }),
      product.brandId ? this.brands.findOne({ where: { id: product.brandId } }) : null,
    ]);

    // گزینه‌های تنوع
    const variantIds = variants.map((v) => v.id);
    const optionRows = variantIds.length
      ? await this.variantValues.find({ where: { variantId: In(variantIds) } })
      : [];
    const attrIds = [...new Set(optionRows.map((o) => o.attributeId).concat(specRows.map((s) => s.attributeId)))];
    const valueIds = [...new Set(optionRows.map((o) => o.attributeValueId).concat(specRows.map((s) => s.attributeValueId).filter((x): x is number => !!x)))];
    const [attrMap, valueMap] = await this.attributeMaps(attrIds, valueIds);

    // موجودی هر تنوع
    const stockRows = variantIds.length
      ? await this.em.query(
          `SELECT variant_id, COALESCE(SUM(quantity - reserved),0) AS stock FROM inventory WHERE variant_id IN (${variantIds.map(() => '?').join(',')}) GROUP BY variant_id`,
          variantIds,
        )
      : [];
    const stockByVariant = new Map<number, number>(stockRows.map((r: any) => [Number(r.variant_id), Number(r.stock)]));

    // مشخصات فنی (گروه‌بندی‌شده)
    const specsGrouped = new Map<string, Array<{ name: string; value: string }>>();
    for (const s of specRows) {
      const attr = attrMap.get(s.attributeId);
      if (!attr) continue;
      const value = s.attributeValueId ? valueMap.get(s.attributeValueId)?.value : s.customValue;
      if (!value) continue;
      const group = attr.groupName || 'مشخصات';
      if (!specsGrouped.has(group)) specsGrouped.set(group, []);
      specsGrouped.get(group)!.push({
        name: attr.name,
        value: attr.unit ? `${value} ${attr.unit}` : value,
      });
    }

    // محصولات مرتبط
    const relatedIds = relRows.map((r) => r.relatedProductId);
    const related = relatedIds.length ? await this.cardsByIds(relatedIds) : [];

    return {
      id: product.id,
      code: product.code,
      name: product.name,
      slug: product.slug,
      status: product.status,
      shortDescription: product.shortDescription,
      description: product.description,
      features: product.features || [],
      warrantyMonths: product.warrantyMonths,
      weightG: product.weightG,
      dimensions: { length: product.lengthCm, width: product.widthCm, height: product.heightCm },
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      soldCount: product.soldCount,
      viewCount: product.viewCount,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
      brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug, logo: this.files.publicUrl(brand.logoPath) } : null,
      images: images.map((i) => ({
        id: i.id, url: this.files.publicUrl(i.path), alt: i.alt, sortOrder: i.sortOrder, isPrimary: i.isPrimary,
      })),
      videos: videos.map((v) => ({
        id: v.id, title: v.title, provider: v.provider,
        url: v.provider === 'upload' ? this.files.publicUrl(v.sourceUrl) : v.sourceUrl,
        poster: this.files.publicUrl(v.posterPath),
      })),
      variants: variants.map((v) => ({
        id: v.id, sku: v.sku, barcode: v.barcode, title: v.title,
        price: v.price, compareAtPrice: v.compareAtPrice,
        costPrice: forAdmin ? v.costPrice : undefined,
        stock: stockByVariant.get(v.id) ?? 0,
        weightG: v.weightG,
        isDefault: v.isDefault, isActive: v.isActive,
        options: optionRows.filter((o) => o.variantId === v.id).map((o) => ({
          attributeId: o.attributeId,
          attributeName: attrMap.get(o.attributeId)?.name,
          attributeCode: attrMap.get(o.attributeId)?.code,
          attributeValueId: o.attributeValueId,
          value: valueMap.get(o.attributeValueId)?.value,
        })),
      })),
      specs: [...specsGrouped.entries()].map(([group, items]) => ({ group, items })),
      tags: tagRows.length
        ? (await this.tags.findBy({ id: In(tagRows.map((t) => t.tagId)) })).map((t) => ({ id: t.id, name: t.name, slug: t.slug }))
        : [],
      related,
    };
  }

  private async attributeMaps(attrIds: number[], valueIds: number[]) {
    if (!attrIds.length && !valueIds.length) return [new Map(), new Map()] as const;
    const attrs = attrIds.length
      ? await this.em.getRepository(Attribute).findBy({ id: In(attrIds) })
      : [];
    const values = valueIds.length
      ? await this.em.getRepository(AttributeValue).findBy({ id: In(valueIds) })
      : [];
    return [
      new Map(attrs.map((a) => [a.id, a])),
      new Map(values.map((v) => [v.id, v])),
    ] as const;
  }

  private async cardsByIds(ids: number[]) {
    const rows = await this.em.query(
      `SELECT p.id, p.name, p.slug, p.min_price AS minPrice, p.rating_avg AS ratingAvg,
              b.name AS brand, (SELECT path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
       FROM products p LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.id IN (${ids.map(() => '?').join(',')}) AND p.status = 'published' AND p.deleted_at IS NULL`,
      ids,
    );
    return rows.map((r: any) => ({ ...r, minPrice: r.minPrice != null ? Number(r.minPrice) : null, ratingAvg: Number(r.ratingAvg || 0), image: this.files.publicUrl(r.image) }));
  }

  async relatedById(productId: number) {
    const rows = await this.relations.find({ where: { productId }, order: { sortOrder: 'ASC' } });
    return this.cardsByIds(rows.map((r) => r.relatedProductId));
  }

  // ================================================== ادمین
  async adminList(query: {
    page?: string; limit?: string; q?: string; status?: string; categoryId?: string; lowStock?: string;
  }) {
    const p = paginate(query.page, query.limit);
    const qb = this.products
      .createQueryBuilder('p')
      .leftJoin('brands', 'b', 'b.id = p.brand_id')
      .leftJoin('categories', 'c', 'c.id = p.category_id')
      .select([
        'p.id AS id', 'p.code AS code', 'p.name AS name', 'p.slug AS slug', 'p.status AS status',
        'p.min_price AS minPrice', 'p.sold_count AS soldCount', 'p.rating_avg AS ratingAvg',
        'b.name AS brand', 'c.name AS category', 'p.created_at AS createdAt',
      ])
      .addSelect(`(SELECT path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image`)
      .addSelect(`(SELECT COALESCE(SUM(i.quantity - i.reserved),0) FROM product_variants v JOIN inventory i ON i.variant_id = v.id WHERE v.product_id = p.id AND v.deleted_at IS NULL) AS stock`)
      .orderBy('p.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (query.q) qb.andWhere('(p.name LIKE :q OR p.code LIKE :q OR p.slug LIKE :q)', { q: `%${query.q}%` });
    if (query.status) qb.andWhere('p.status = :st', { st: query.status });
    if (query.categoryId) qb.andWhere('p.category_id = :cid', { cid: Number(query.categoryId) });
    const [items, total] = await Promise.all([qb.getRawMany(), qb.clone().select('COUNT(DISTINCT p.id)', 'cnt').getRawOne()]);
    return {
      items: items.map((i: any) => ({ ...i, image: this.files.publicUrl(i.image), stock: Number(i.stock) })),
      total: Number(total?.cnt || 0), page: p.page, limit: p.limit,
    };
  }

  async adminDetail(id: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    return this.assemble(product, true);
  }

  /** ایجاد محصول با همه‌ی بخش‌ها در یک تراکنش */
  async create(dto: SaveProductDto, adminId: number) {
    const slug = await this.uniqueSlug(dto.slug || dto.name);
    await this.assertUniqueCode(dto.code);

    const productId = await this.em.transaction(async (tx) => {
      const product = await tx.getRepository(Product).save(
        tx.getRepository(Product).create({
          name: dto.name, slug,
          code: dto.code ?? null,
          categoryId: dto.categoryId,
          brandId: dto.brandId ?? null,
          shortDescription: dto.shortDescription ?? null,
          description: dto.description ? sanitizeHtml(dto.description) : null,
          features: dto.features?.length ? dto.features : null,
          status: dto.status || 'draft',
          publishedAt: dto.status === 'published' ? new Date() : null,
          weightG: dto.weightG ?? null,
          lengthCm: dto.lengthCm ?? null, widthCm: dto.widthCm ?? null, heightCm: dto.heightCm ?? null,
          warrantyMonths: dto.warrantyMonths ?? null,
          metaTitle: dto.metaTitle ?? null, metaDescription: dto.metaDescription ?? null,
        }),
      );
      await this.syncChildren(product.id, dto, adminId, tx);
      await this.recomputePriceRange(product.id, tx);
      return product.id;
    });

    await this.search.upsertProduct(productId);
    return this.adminDetail(productId);
  }

  /** ویرایش کامل محصول */
  async update(id: number, dto: Partial<SaveProductDto>, adminId: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('محصول یافت نشد');

    if (dto.slug && slugify(dto.slug) !== product.slug) await this.uniqueSlug(dto.slug, id);
    if (dto.code) await this.assertUniqueCode(dto.code, id);

    await this.em.transaction(async (tx) => {
      const patch: Partial<Product> = {};
      const fields: Array<keyof SaveProductDto> = [
        'name', 'categoryId', 'brandId', 'shortDescription', 'status', 'weightG',
        'lengthCm', 'widthCm', 'heightCm', 'warrantyMonths', 'metaTitle', 'metaDescription', 'code',
      ];
      for (const f of fields) if (dto[f] !== undefined) (patch as any)[f] = dto[f];
      if (dto.slug) patch.slug = slugify(dto.slug);
      if (dto.description !== undefined) patch.description = dto.description ? sanitizeHtml(dto.description) : null;
      if (dto.features !== undefined) patch.features = dto.features?.length ? dto.features : null;
      if (patch.status === 'published' && !product.publishedAt) patch.publishedAt = new Date();
      if (patch.status && patch.status !== 'published') patch.publishedAt = null;

      await tx.getRepository(Product).update(id, patch);
      await this.syncChildren(id, dto, adminId, tx);
      await this.recomputePriceRange(id, tx);
    });

    await this.search.upsertProduct(id);
    return this.adminDetail(id);
  }

  async setStatus(id: number, status: Product['status']) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    await this.products.update(id, {
      status,
      publishedAt: status === 'published' ? new Date() : product.publishedAt,
    });
    if (status === 'published') await this.search.upsertProduct(id);
    else await this.search.removeProduct(id);
    return { id, status };
  }

  async remove(id: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    await this.products.softDelete(id);
    await this.search.removeProduct(id);
    return { deleted: true };
  }

  // ------------------------------------------- همگام‌سازی بخش‌های فرعی
  private async syncChildren(productId: number, dto: Partial<SaveProductDto>, adminId: number, tx: EntityManager) {
    if (dto.variants) await this.syncVariants(productId, dto.variants, adminId, tx);
    if (dto.images) await this.syncImages(productId, dto.images, tx);
    if (dto.videos) await this.syncVideos(productId, dto.videos, tx);
    if (dto.tags) await this.syncTags(productId, dto.tags, tx);
    if (dto.specs) await this.syncSpecs(productId, dto.specs, tx);
    if (dto.relatedProductIds) await this.syncRelations(productId, dto.relatedProductIds, tx);
  }

  private async syncVariants(productId: number, variants: ProductVariantDto[], adminId: number, tx: EntityManager) {
    const existing = await tx.getRepository(ProductVariant).find({ where: { productId } });
    const keepIds = variants.filter((v) => v.id).map((v) => v.id!);

    // حذف تنوع‌های حذف‌شده (اگر در سفارشی نیستند)
    for (const old of existing) {
      if (keepIds.includes(old.id)) continue;
      const usedInOrders = await tx.query(`SELECT COUNT(*) AS cnt FROM order_items WHERE variant_id = ?`, [old.id]);
      if (Number(usedInOrders[0].cnt) > 0) {
        await tx.getRepository(ProductVariant).update(old.id, { isActive: false });
      } else {
        await tx.getRepository(ProductVariantValue).delete({ variantId: old.id });
        await tx.getRepository(ProductVariant).softDelete(old.id);
      }
    }

    // فقط یک is_default
    if (variants.filter((v) => v.isDefault).length > 1) variants.forEach((v, i) => (v.isDefault = i === 0));
    if (!variants.some((v) => v.isDefault)) variants[0].isDefault = true;

    for (const v of variants) {
      const skuClash = await tx.getRepository(ProductVariant).findOne({ where: { sku: v.sku } });
      if (skuClash && skuClash.productId !== productId && skuClash.id !== v.id)
        throw new ConflictException({ code: 'SKU_TAKEN', message: `SKU «${v.sku}» تکراری است` });

      let variantId = v.id;
      if (variantId) {
        await tx.getRepository(ProductVariant).update(variantId, {
          sku: v.sku, barcode: v.barcode ?? null, title: v.title ?? null,
          price: v.price, compareAtPrice: v.compareAtPrice ?? null, costPrice: v.costPrice ?? null,
          weightG: v.weightG ?? null, isDefault: !!v.isDefault, isActive: v.isActive !== false,
        });
      } else {
        const saved = await tx.getRepository(ProductVariant).save(
          tx.getRepository(ProductVariant).create({
            productId, sku: v.sku, barcode: v.barcode ?? null, title: v.title ?? null,
            price: v.price, compareAtPrice: v.compareAtPrice ?? null, costPrice: v.costPrice ?? null,
            weightG: v.weightG ?? null, isDefault: !!v.isDefault, isActive: v.isActive !== false,
          }),
        );
        variantId = saved.id;
      }

      // مقادیر صفت‌ها
      await tx.getRepository(ProductVariantValue).delete({ variantId });
      if (v.options?.length) {
        await tx.getRepository(ProductVariantValue).save(
          v.options.map((o) => tx.getRepository(ProductVariantValue).create({
            variantId, attributeId: o.attributeId, attributeValueId: o.attributeValueId,
          })),
        );
      }

      // موجودی اولیه/تنظیم در انبار پیش‌فرض
      if (v.stock !== undefined) {
        await this.inventory.setQuantity(
          { variantId, warehouseId: await this.inventory.defaultWarehouseId(), quantity: v.stock, note: 'همگام‌سازی از فرم محصول' },
          adminId,
          tx,
        );
      }
    }
  }

  private async syncImages(productId: number, images: Array<{ path: string; alt?: string; sortOrder?: number; isPrimary?: boolean }>, tx: EntityManager) {
    await tx.getRepository(ProductImage).delete({ productId });
    if (!images.length) return;
    if (images.filter((i) => i.isPrimary).length !== 1) images.forEach((i, idx) => (i.isPrimary = idx === 0));
    await tx.getRepository(ProductImage).save(
      images.map((i, idx) => tx.getRepository(ProductImage).create({
        productId, path: i.path, alt: i.alt ?? null,
        sortOrder: i.sortOrder ?? idx, isPrimary: !!i.isPrimary,
      })),
    );
  }

  private async syncVideos(productId: number, videos: Array<{ title?: string; provider: 'upload'|'youtube'|'aparat'; sourceUrl: string; posterPath?: string; sortOrder?: number }>, tx: EntityManager) {
    await tx.getRepository(ProductVideo).delete({ productId });
    if (!videos.length) return;
    await tx.getRepository(ProductVideo).save(
      videos.map((v, idx) => tx.getRepository(ProductVideo).create({
        productId, title: v.title ?? null, provider: v.provider, sourceUrl: v.sourceUrl,
        posterPath: v.posterPath ?? null, sortOrder: v.sortOrder ?? idx,
      })),
    );
  }

  private async syncTags(productId: number, names: string[], tx: EntityManager) {
    await tx.getRepository(ProductTag).delete({ productId });
    const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 20);
    for (const name of clean) {
      const slug = slugify(name) || `tag-${Date.now()}`;
      let tag = await tx.getRepository(Tag).findOne({ where: { name } });
      if (!tag) tag = await tx.getRepository(Tag).save(tx.getRepository(Tag).create({ name, slug }));
      await tx.getRepository(ProductTag).save({ productId, tagId: tag.id } as ProductTag);
    }
  }

  private async syncSpecs(productId: number, specs: Array<{ attributeId: number; attributeValueId?: number; customValue?: string }>, tx: EntityManager) {
    await tx.getRepository(ProductAttributeValue).delete({ productId });
    if (!specs.length) return;
    await tx.getRepository(ProductAttributeValue).save(
      specs
        .filter((s) => s.attributeValueId || (s.customValue && s.customValue.trim()))
        .map((s, idx) => tx.getRepository(ProductAttributeValue).create({
          productId, attributeId: s.attributeId,
          attributeValueId: s.attributeValueId ?? null,
          customValue: s.attributeValueId ? null : (s.customValue ?? null),
          sortOrder: idx,
        })),
    );
  }

  private async syncRelations(productId: number, ids: number[], tx: EntityManager) {
    await tx.getRepository(ProductRelation).delete({ productId });
    const unique = [...new Set(ids)].filter((id) => id !== productId).slice(0, 20);
    if (!unique.length) return;
    await tx.getRepository(ProductRelation).save(
      unique.map((relatedProductId, idx) => tx.getRepository(ProductRelation).create({
        productId, relatedProductId, sortOrder: idx,
      })),
    );
  }

  private async recomputePriceRange(productId: number, tx?: EntityManager) {
    const m = tx || this.em;
    await m.query(
      `UPDATE products p SET
         min_price = (SELECT MIN(price) FROM product_variants WHERE product_id = p.id AND is_active = 1 AND deleted_at IS NULL),
         max_price = (SELECT MAX(price) FROM product_variants WHERE product_id = p.id AND is_active = 1 AND deleted_at IS NULL)
       WHERE p.id = ?`,
      [productId],
    );
  }

  private async uniqueSlug(input: string, excludeId?: number) {
    const base = slugify(input) || `p-${Date.now()}`;
    let slug = base;
    let n = 1;
    while (true) {
      const clash = await this.products.findOne({ where: { slug } });
      if (!clash || clash.id === excludeId) return slug;
      slug = `${base}-${++n}`;
    }
  }

  private async assertUniqueCode(code?: string | null, excludeId?: number) {
    if (!code) return;
    const clash = await this.products.findOne({ where: { code } });
    if (clash && clash.id !== excludeId)
      throw new ConflictException({ code: 'CODE_TAKEN', message: 'کد محصول تکراری است' });
  }
}
