import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Attribute, AttributeValue, Brand, Category, CategoryAttribute,
} from '../../database/entities';
import { RedisService } from '../../common/redis.service';
import { FilesService } from '../files/files.service';
import { slugify } from '../../common/utils';

@Injectable()
export class CatalogService {
  private static TREE_KEY = 'cat:tree';

  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(Attribute) private readonly attributes: Repository<Attribute>,
    @InjectRepository(AttributeValue) private readonly attributeValues: Repository<AttributeValue>,
    @InjectRepository(CategoryAttribute) private readonly catAttrs: Repository<CategoryAttribute>,
    private readonly redis: RedisService,
    private readonly files: FilesService,
  ) {}

  // ------------------------------------------------------------- دسته‌ها
  async tree() {
    const cached = await this.redis.get(CatalogService.TREE_KEY);
    if (cached) return JSON.parse(cached);
    const all = await this.categories.find({ where: { isActive: true }, order: { sortOrder: 'ASC', id: 'ASC' } });
    const byParent = new Map<number | null, Category[]>();
    for (const c of all) {
      const list = byParent.get(c.parentId) || [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    const build = (parentId: number | null): any[] =>
      (byParent.get(parentId) || []).map((c) => ({
        id: c.id, name: c.name, slug: c.slug,
        image: this.files.publicUrl(c.imagePath), icon: c.icon,
        children: build(c.id),
      }));
    const tree = build(null);
    await this.redis.set(CatalogService.TREE_KEY, JSON.stringify(tree), 3600);
    return tree;
  }

  async categoryBySlug(slug: string) {
    const cat = await this.categories.findOne({ where: { slug } });
    if (!cat) throw new NotFoundException('دسته‌بندی یافت نشد');
    const breadcrumb = await this.breadcrumb(cat);
    const filters = await this.categoryFilterableAttributes(cat.id);
    return {
      category: { ...cat, image: this.files.publicUrl(cat.imagePath) },
      breadcrumb,
      filters,
    };
  }

  private async breadcrumb(cat: Category): Promise<Array<{ id: number; name: string; slug: string }>> {
    const out = [{ id: cat.id, name: cat.name, slug: cat.slug }];
    let cur = cat;
    while (cur.parentId) {
      const parent = await this.categories.findOne({ where: { id: cur.parentId } });
      if (!parent) break;
      out.unshift({ id: parent.id, name: parent.name, slug: parent.slug });
      cur = parent;
    }
    return out;
  }

  /** صفت‌های قابل‌فیلتر یک دسته (برای فیلتر فروشگاه و فرم مشخصات) */
  async categoryFilterableAttributes(categoryId: number) {
    const links = await this.catAttrs.find({ where: { categoryId }, order: { sortOrder: 'ASC' } });
    if (!links.length) return [];
    const attrs = await this.attributes.findBy({ id: In(links.map((l) => l.attributeId)) });
    const values = await this.attributeValues.find({
      where: { attributeId: In(links.map((l) => l.attributeId)) },
      order: { sortOrder: 'ASC' },
    });
    return attrs.map((a) => {
      const link = links.find((l) => l.attributeId === a.id)!;
      return {
        id: a.id, name: a.name, code: a.code, type: a.type, unit: a.unit,
        groupName: a.groupName, isFilterable: a.isFilterable,
        isVariant: link.isVariant, isRequired: link.isRequired,
        values: values.filter((v) => v.attributeId === a.id)
          .map((v) => ({ id: v.id, value: v.value, meta: v.meta })),
      };
    });
  }

  async adminCategories() {
    return this.categories.find({ order: { parentId: 'ASC', sortOrder: 'ASC' } });
  }

  async saveCategory(dto: Partial<Category> & { id?: number }) {
    const slug = (dto.slug && slugify(dto.slug)) || slugify(dto.name || '');
    const clash = await this.categories.findOne({ where: { slug } });
    if (clash && clash.id !== dto.id)
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'اسلاگ دسته تکراری است' });
    dto.slug = slug;
    if (dto.id) {
      if (dto.parentId === dto.id) throw new ConflictException('دسته نمی‌تواند والد خودش باشد');
      await this.categories.update(dto.id, dto);
    } else {
      dto.id = (await this.categories.save(this.categories.create(dto))).id;
    }
    await this.redis.del(CatalogService.TREE_KEY);
    return this.categories.findOne({ where: { id: dto.id } });
  }

  async removeCategory(id: number) {
    const children = await this.categories.count({ where: { parentId: id } });
    if (children) throw new ConflictException({ code: 'HAS_CHILDREN', message: 'ابتدا زیردسته‌ها را جابه‌جا یا حذف کنید' });
    const products = await this.categories.manager.count('products', { where: { categoryId: id } });
    if (products) throw new ConflictException({ code: 'HAS_PRODUCTS', message: 'این دسته دارای محصول است' });
    await this.categories.softDelete(id);
    await this.redis.del(CatalogService.TREE_KEY);
    return { deleted: true };
  }

  async setCategoryAttributes(categoryId: number, items: Array<{ attributeId: number; isVariant: boolean; isRequired: boolean; sortOrder: number }>) {
    await this.catAttrs.delete({ categoryId });
    if (items.length)
      await this.catAttrs.save(items.map((i) => this.catAttrs.create({ categoryId, ...i })));
    return this.categoryFilterableAttributes(categoryId);
  }

  // -------------------------------------------------------------- برندها
  listBrands(activeOnly = true) {
    return this.brands.find({
      where: activeOnly ? { isActive: true } : {},
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async saveBrand(dto: Partial<Brand> & { id?: number }) {
    const slug = (dto.slug && slugify(dto.slug)) || slugify(dto.name || '');
    const clash = await this.brands.findOne({ where: { slug } });
    if (clash && clash.id !== dto.id)
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'اسلاگ برند تکراری است' });
    dto.slug = slug;
    if (dto.id) await this.brands.update(dto.id, dto);
    else dto.id = (await this.brands.save(this.brands.create(dto))).id;
    return this.brands.findOne({ where: { id: dto.id } });
  }

  async removeBrand(id: number) {
    await this.brands.softDelete(id);
    return { deleted: true };
  }

  // -------------------------------------------------------------- صفت‌ها
  async adminAttributes() {
    const attrs = await this.attributes.find({ order: { id: 'ASC' } });
    const values = await this.attributeValues.find({ order: { sortOrder: 'ASC' } });
    return attrs.map((a) => ({
      ...a,
      values: values.filter((v) => v.attributeId === a.id),
    }));
  }

  async saveAttribute(dto: Partial<Attribute> & { id?: number }) {
    if (dto.id) await this.attributes.update(dto.id, dto);
    else dto.id = (await this.attributes.save(this.attributes.create(dto as Attribute))).id;
    return this.attributes.findOne({ where: { id: dto.id } });
  }

  async removeAttribute(id: number) {
    await this.attributes.delete(id);
    return { deleted: true };
  }

  async saveAttributeValue(dto: Partial<AttributeValue> & { id?: number; attributeId: number }) {
    if (dto.id) {
      const { id, attributeId, ...patch } = dto;
      await this.attributeValues.update(id, patch as any);
    } else {
      dto.id = (await this.attributeValues.save(this.attributeValues.create(dto as AttributeValue))).id;
    }
    return this.attributeValues.findOne({ where: { id: dto.id } });
  }

  async removeAttributeValue(id: number) {
    await this.attributeValues.delete(id);
    return { deleted: true };
  }
}
