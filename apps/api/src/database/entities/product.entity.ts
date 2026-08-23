import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const bigint = {
  to: (v?: number | null) => v ?? null,
  from: (v?: string | number | null) => (v == null ? null : Number(v)),
};

export type ProductStatus = 'draft' | 'pending' | 'published' | 'archived';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 50, nullable: true, unique: true })
  code: string | null;

  @Column({ name: 'category_id', type: 'int', unsigned: true })
  @Index()
  categoryId: number;

  @Column({ name: 'brand_id', type: 'int', unsigned: true, nullable: true })
  brandId: number | null;

  @Column({ length: 190 })
  name: string;

  @Column({ length: 220, unique: true })
  slug: string;

  @Column({ name: 'short_description', length: 500, nullable: true })
  shortDescription: string | null;

  @Column({ type: 'longtext', nullable: true })
  description: string | null;

  /** ویژگی‌های کلیدی (بولت‌ها) */
  @Column({ type: 'json', nullable: true })
  features: string[] | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'published', 'archived'],
    default: 'draft',
  })
  status: ProductStatus;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'weight_g', type: 'int', unsigned: true, nullable: true })
  weightG: number | null;

  @Column({ name: 'length_cm', type: 'decimal', precision: 6, scale: 2, nullable: true, transformer: bigint })
  lengthCm: number | null;

  @Column({ name: 'width_cm', type: 'decimal', precision: 6, scale: 2, nullable: true, transformer: bigint })
  widthCm: number | null;

  @Column({ name: 'height_cm', type: 'decimal', precision: 6, scale: 2, nullable: true, transformer: bigint })
  heightCm: number | null;

  @Column({ name: 'warranty_months', type: 'int', unsigned: true, nullable: true })
  warrantyMonths: number | null;

  @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0, transformer: bigint })
  ratingAvg: number;

  @Column({ name: 'rating_count', type: 'int', unsigned: true, default: 0 })
  ratingCount: number;

  @Column({ name: 'view_count', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  viewCount: number;

  @Column({ name: 'sold_count', type: 'bigint', unsigned: true, default: 0, transformer: bigint })
  soldCount: number;

  @Column({ name: 'min_price', type: 'bigint', unsigned: true, nullable: true, transformer: bigint })
  minPrice: number | null;

  @Column({ name: 'max_price', type: 'bigint', unsigned: true, nullable: true, transformer: bigint })
  maxPrice: number | null;

  @Column({ name: 'meta_title', length: 190, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', length: 300, nullable: true })
  metaDescription: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  @Index()
  productId: number;

  @Column({ length: 64, unique: true })
  sku: string;

  @Column({ length: 32, nullable: true })
  barcode: string | null;

  @Column({ length: 190, nullable: true })
  title: string | null;

  @Column({ type: 'bigint', unsigned: true, transformer: bigint })
  price: number;

  @Column({ name: 'compare_at_price', type: 'bigint', unsigned: true, nullable: true, transformer: bigint })
  compareAtPrice: number | null;

  @Column({ name: 'cost_price', type: 'bigint', unsigned: true, nullable: true, transformer: bigint })
  costPrice: number | null;

  @Column({ name: 'stock_total', default: 0 })
  stockTotal: number;

  @Column({ name: 'weight_g', type: 'int', unsigned: true, nullable: true })
  weightG: number | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  /** ترکیب صفت‌ها (در سرویس پر می‌شود) */
  options?: Array<{ attributeId: number; attributeValueId: number; value?: string; name?: string }>;
}

@Entity('product_variant_values')
export class ProductVariantValue {
  @PrimaryColumn({ name: 'variant_id', type: 'bigint', unsigned: true })
  variantId: number;

  @PrimaryColumn({ name: 'attribute_id', type: 'int', unsigned: true })
  attributeId: number;

  @Column({ name: 'attribute_value_id', type: 'int', unsigned: true })
  attributeValueId: number;
}

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  @Index()
  productId: number;

  @Column({ name: 'variant_id', type: 'bigint', unsigned: true, nullable: true })
  variantId: number | null;

  @Column({ length: 500 })
  path: string;

  @Column({ length: 190, nullable: true })
  alt: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('product_videos')
export class ProductVideo {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  @Index()
  productId: number;

  @Column({ length: 190, nullable: true })
  title: string | null;

  @Column({ type: 'enum', enum: ['upload', 'youtube', 'aparat'], default: 'upload' })
  provider: 'upload' | 'youtube' | 'aparat';

  @Column({ name: 'source_url', length: 500 })
  sourceUrl: string;

  @Column({ name: 'poster_path', length: 500, nullable: true })
  posterPath: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 80, unique: true })
  name: string;

  @Column({ length: 120, unique: true })
  slug: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('product_tags')
export class ProductTag {
  @PrimaryColumn({ name: 'product_id', type: 'bigint', unsigned: true })
  productId: number;

  @PrimaryColumn({ name: 'tag_id', type: 'int', unsigned: true })
  tagId: number;
}

@Entity('product_relations')
export class ProductRelation {
  @PrimaryColumn({ name: 'product_id', type: 'bigint', unsigned: true })
  productId: number;

  @PrimaryColumn({ name: 'related_product_id', type: 'bigint', unsigned: true })
  relatedProductId: number;

  @PrimaryColumn({ type: 'enum', enum: ['related', 'accessory', 'similar'], default: 'related' })
  type: 'related' | 'accessory' | 'similar';

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}

/** مشخصات فنی محصول (مقادیر صفت‌ها) */
@Entity('product_attributes')
export class ProductAttributeValue {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  @Index()
  productId: number;

  @Column({ name: 'attribute_id', type: 'int', unsigned: true })
  attributeId: number;

  @Column({ name: 'attribute_value_id', type: 'int', unsigned: true, nullable: true })
  attributeValueId: number | null;

  @Column({ name: 'custom_value', length: 500, nullable: true })
  customValue: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
