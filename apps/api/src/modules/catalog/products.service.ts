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
    minPrice?: string; maxPrice?: string; minRating?: string; inStock?: string; sort?: string;
    page?: string; limit?: string;
  }) {
    const p = paginate(query.page, query.limit);
    const searchQuery: ProductSearchQuery = {
      q: query.q,
      categorySlug: query.category,
      brandIds: query.brand ? query.brand.split(',').map(Number) : undefined,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      minRating: query.minRating ? Number(query.minRating) : undefined,
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
      ...(forAdmin
        ? {
            specsRaw: specRows.map((r) => ({
              attributeId: r.attributeId,
              attributeValueId: r.attributeValueId,
              customValue: r.customValue,
            })),
          }
        : {}),
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

    // تولید خودکار توضیحات، ویژگی‌های کلیدی و جدول مشخصات فنی در صورت خالی بودن
    const autoFilled = this.generateAutoSpecsAndDescription(dto.name, dto.categoryId);
    if (!dto.description || !dto.description.trim()) {
      dto.description = autoFilled.description;
    }
    if (!dto.features || !dto.features.length) {
      dto.features = autoFilled.features;
    }
    if (!dto.specs || !dto.specs.length) {
      dto.specs = autoFilled.specs;
    }

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

  /** تولید هوشمند و اتوماتیک فیلدهای توضیحات، مشخصات فنی و ویژگی‌های محصول بر اساس نام و دسته */
  private generateAutoSpecsAndDescription(name: string, categoryId: number) {
    let description = `<p>محصول فوق‌العاده باکیفیت و با دوام <strong>${name}</strong> با تضمین اصالت و گارانتی معتبر در فروشگاه کارزینتل عرضه می‌شود.</p>`;
    let features: string[] = ['تضمین اصالت کالا', 'ارسال سریع به سراسر کشور', 'پشتیبانی ۲۴ ساعته', 'بهترین قیمت بازار'];
    let specs: any[] = [];

    const lowerName = name.toLowerCase();

    // تشخیص برند
    let brand = 'اپل';
    if (lowerName.includes('samsung') || name.includes('سامسونگ')) brand = 'سامسونگ';
    else if (lowerName.includes('xiaomi') || lowerName.includes('redmi') || name.includes('شیائومی') || name.includes('ردمی')) brand = 'شیائومی';
    else if (lowerName.includes('huawei') || name.includes('هوآوی')) brand = 'هوآوی';
    else if (lowerName.includes('anker') || name.includes('انکر')) brand = 'انکر';

    // ۱. گوشی هوشمند
    if (categoryId === 6 || lowerName.includes('iphone') || lowerName.includes('galaxy') || name.includes('گوشی') || lowerName.includes('redmi')) {
      let storage = '128 گیگابایت';
      let storageValId = 6; // default 128
      if (lowerName.includes('256') || lowerName.includes('256gb')) { storage = '256 گیگابایت'; storageValId = 7; }
      else if (lowerName.includes('512') || lowerName.includes('512gb')) { storage = '512 گیگابایت'; storageValId = 8; }
      else if (lowerName.includes('64') || lowerName.includes('64gb')) { storage = '64 گیگابایت'; storageValId = 5; }

      let ram = '8 گیگابایت';
      let ramValId = 11; // default 8
      if (lowerName.includes('4gb') || lowerName.includes(' رم 4')) { ram = '4 گیگابایت'; ramValId = 9; }
      else if (lowerName.includes('6gb') || lowerName.includes(' رم 6')) { ram = '6 گیگابایت'; ramValId = 10; }
      else if (lowerName.includes('12gb') || lowerName.includes(' رم 12')) { ram = '12 گیگابایت'; ramValId = 12; }

      let screen = '6.1 اینچ';
      if (lowerName.includes('plus') || lowerName.includes('pro max') || lowerName.includes('ultra') || lowerName.includes('max')) {
        screen = '6.7 اینچ';
      }

      description = `
        <p>گوشی هوشمند <strong>${name}</strong> یکی از جدیدترین و پیشرفته‌ترین محصولات برند محبوب <strong>${brand}</strong> در بازار است. این محصول با برخورداری از سخت‌افزار قدرتمند، برای تمامی فعالیت‌های روزانه، گیمینگ سبک و عکاسی حرفه‌ای انتخابی بی‌نظیر به شمار می‌رود.</p>
        <h3>صفحه‌نمایش و کیفیت تصویر</h3>
        <p>مجهز به یک نمایشگر باکیفیت و با تراکم پیکسلی بسیار بالا که تصاویری زنده، پویا و با رنگ‌های عمیق را نمایش می‌دهد. شدت روشنایی عالی این پنل به شما اجازه می‌دهد حتی زیر نور مستقیم خورشید نیز به راحتی با دستگاه کار کنید.</p>
        <h3>سخت‌افزار و کارایی</h3>
        <p>در قلب تپنده این دستگاه، پردازنده‌ای قدرتمند همراه با <strong>${ram} حافظه رم</strong> قرار گرفته است که اجرای همزمان برنامه‌ها (Multitasking) و بازی‌ها را بسیار روان و بدون کوچک‌ترین تاخیری ممکن می‌سازد. همچنین، با <strong>${storage} حافظه داخلی</strong>، فضای کافی برای ذخیره‌سازی عکس‌ها، ویدیوها و اپلیکیشن‌های خود خواهید داشت.</p>
        <h3>دوربین و ثبت لحظات</h3>
        <p>دوربین فوق‌العاده هوشمند این محصول به شما اجازه می‌دهد در هر شرایط نوری، عکس‌هایی با جزئیات خیره‌کننده، نویز کم و رنگ‌های کاملاً طبیعی ثبت کنید. سنسورهای پیشرفته به همراه پردازش نرم‌افزاری هوش مصنوعی، کیفیتی در سطح آتلیه را به شما ارائه می‌دهند.</p>
      `;

      features = [
        `صفحه‌نمایش درخشان و باکیفیت ${screen}`,
        `پردازنده قدرتمند و بهینه ${brand}`,
        `حافظه داخلی با ظرفیت بالای ${storage}`,
        `رم ${ram} جهت مولتی‌تسکینگ فوق‌العاده روان`,
        'سیستم دوربین هوشمند پیشرفته با رزولوشن عالی',
        'باتری با طول عمر بالا همراه با پشتیبانی از شارژ سریع',
      ];

      specs = [
        { attributeId: 2, attributeValueId: storageValId }, // حافظه داخلی
        { attributeId: 3, attributeValueId: ramValId },     // حافظه رم
        { attributeId: 4, customValue: screen },            // اندازه صفحه نمایش
      ];
    }
    // ۲. ساعت هوشمند
    else if (categoryId === 3 || lowerName.includes('watch') || name.includes('ساعت') || lowerName.includes('band')) {
      description = `
        <p>ساعت هوشمند <strong>${name}</strong> از برند پیشرو <strong>${brand}</strong>، همیار سلامتی و ورزش شماست. این گجت شیک و مدرن، با اتصال به تلفن همراه شما، امکانات متعددی را از پایش خواب تا سنجش اکسیژن خون روی مچ دست شما فراهم می‌سازد.</p>
        <h3>طراحی و ساخت</h3>
        <p>دارای بدنه مقاوم و ضد حساسیت با وزن بسیار سبک که برای استفاده‌های طولانی‌مدت و ورزشی کاملاً ایده‌آل است. بندهای قابل تعویض به شما این امکان را می‌دهند تا ظاهر ساعت را با استایل روزانه خود هماهنگ کنید.</p>
        <h3>پایش سلامتی و سنسورها</h3>
        <p>مجهز به پیشرفته‌ترین سنسورهای اندازه‌گیری ضربان قلب، سطح اکسیژن خون (SpO2) و پایش مداوم سطح استرس و کیفیت خواب شبانه. این گجت به شما کمک می‌کند همواره بر وضعیت بدنی خود نظارت کامل داشته باشید.</p>
      `;

      features = [
        'پایش ۲۴ ساعته ضربان قلب و اکسیژن خون',
        'مقاومت کامل در برابر نفوذ آب (استاندارد ضدآب)',
        'پشتیبانی از ده‌ها حالت ورزشی مختلف',
        'باتری بهینه با شارژدهی فوق‌العاده چند روزه',
        'نمایش پیام‌ها و اعلان‌های فارسی شبکه‌های اجتماعی',
      ];

      specs = [
        { attributeId: 4, customValue: '1.9 اینچ' }, // اندازه صفحه نمایش
      ];
    }
    // ۳. هدفون و صوتی
    else if (categoryId === 4 || lowerName.includes('buds') || lowerName.includes('headphone') || name.includes('هدفون') || lowerName.includes('earphone')) {
      description = `
        <p>هندزفری بی‌سیم <strong>${name}</strong> تجربه‌ای جدید از شنیدن موسیقی را به شما هدیه می‌دهد. این گجت با بهره‌گیری از تکنولوژی‌های پیشرفته کاهش نویز و بیس قدرتمند، انتخابی بی‌نظیر برای علاقمندان به موسیقی و مکالمات شفاف است.</p>
        <h3>کیفیت صدا و بیس عمیق</h3>
        <p>درایورهای دینامیک و بهینه‌سازی شده صدا، صدایی شفاف با تفکیک عالی فرکانس‌های زیر و بم را پخش می‌کنند که لذت شنیدن موسیقی را دوچندان می‌کند.</p>
      `;

      features = [
        'مکالمه باکیفیت و شفاف با حذف نویز محیطی فعال',
        'فناوری اتصال سریع بلوتوث ۵.۳ / ۵.۴',
        'طراحی ارگونومیک و سبک برای راحتی گوش‌ها',
        'باتری قدرتمند با بازدهی تا ۳۰ ساعت همراه با کیس شارژ',
      ];
    }

    return { description, features, specs };
  }
}
