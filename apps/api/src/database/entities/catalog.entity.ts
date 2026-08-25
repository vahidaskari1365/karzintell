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

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 140, unique: true })
  slug: string;

  @Column({ name: 'logo_path', length: 500, nullable: true })
  logoPath: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 255, nullable: true })
  website: string | null;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  @Index()
  parentId: number | null;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 160, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_path', length: 500, nullable: true })
  imagePath: string | null;

  @Column({ length: 80, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

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

export type AttributeType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean';

@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: ['text', 'number', 'select', 'multiselect', 'boolean'],
    default: 'select',
  })
  type: AttributeType;

  @Column({ length: 20, nullable: true })
  unit: string | null;

  @Column({ name: 'group_name', length: 100, nullable: true })
  groupName: string | null;

  @Column({ name: 'is_filterable', default: true })
  isFilterable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('attribute_values')
export class AttributeValue {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ name: 'attribute_id', type: 'integer' })
  @Index()
  attributeId: number;

  @Column({ length: 190 })
  value: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}

/** اتصال صفت به دسته + نقش در ساخت تنوع */
@Entity('category_attribute')
export class CategoryAttribute {
  @PrimaryColumn({ name: 'category_id', type: 'integer' })
  categoryId: number;

  @PrimaryColumn({ name: 'attribute_id', type: 'integer' })
  attributeId: number;

  @Column({ name: 'is_variant', default: false })
  isVariant: boolean;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
