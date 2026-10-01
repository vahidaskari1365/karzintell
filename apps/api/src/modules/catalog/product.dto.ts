import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber,
  IsOptional, IsString, Length, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class VariantOptionDto {
  @IsInt() attributeId: number;
  @IsInt() attributeValueId: number;
}

export class ProductVariantDto {
  @IsOptional() @IsInt()
  id?: number;

  @IsString() @IsNotEmpty() @MaxLength(64)
  sku: string;

  @IsOptional() @IsString() @MaxLength(32)
  barcode?: string;

  @IsOptional() @IsString() @MaxLength(190)
  title?: string;

  @IsNumber() @Min(0)
  price: number;

  /** قیمت تخفیف‌خورده/ویژه: قیمت اصلی در price و قیمت قبل در compareAtPrice */
  @IsOptional() @IsNumber() @Min(0)
  compareAtPrice?: number;

  @IsOptional() @IsNumber() @Min(0)
  costPrice?: number;

  /** موجودی در انبار پیش‌فرض */
  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsInt() @Min(0)
  weightG?: number;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VariantOptionDto)
  options?: VariantOptionDto[];
}

export class ProductImageDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  path: string;

  @IsOptional() @IsString() @MaxLength(190)
  alt?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isPrimary?: boolean;
}

export class ProductVideoDto {
  @IsOptional() @IsString() @MaxLength(190)
  title?: string;

  @IsEnum(['upload', 'youtube', 'aparat'] as const)
  provider: 'upload' | 'youtube' | 'aparat';

  @IsString() @IsNotEmpty() @MaxLength(500)
  sourceUrl: string;

  @IsOptional() @IsString() @MaxLength(500)
  posterPath?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class ProductSpecDto {
  @IsInt() attributeId: number;

  @IsOptional() @IsInt()
  attributeValueId?: number;

  @IsOptional() @IsString() @MaxLength(500)
  customValue?: string;
}

export class SaveProductDto {
  @IsString() @IsNotEmpty() @MaxLength(190)
  name: string;

  @IsOptional() @IsString() @MaxLength(220)
  slug?: string;

  /** کد محصول */
  @IsOptional() @IsString() @MaxLength(50)
  code?: string;

  @IsInt()
  categoryId: number;

  @IsOptional() @IsInt()
  brandId?: number;

  @IsOptional() @IsString() @MaxLength(500)
  shortDescription?: string;

  @IsOptional() @IsString()
  description?: string;

  /** ویژگی‌های کلیدی (بولت) */
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  features?: string[];

  @IsOptional() @IsEnum(['draft', 'pending', 'published', 'archived'] as const)
  status?: 'draft' | 'pending' | 'published' | 'archived';

  @IsOptional() @IsInt() @Min(0)
  weightG?: number;

  @IsOptional() @IsNumber() @Min(0)
  lengthCm?: number;

  @IsOptional() @IsNumber() @Min(0)
  widthCm?: number;

  @IsOptional() @IsNumber() @Min(0)
  heightCm?: number;

  @IsOptional() @IsInt() @Min(0)
  warrantyMonths?: number;

  @IsOptional() @IsString() @MaxLength(190)
  metaTitle?: string;

  @IsOptional() @IsString() @MaxLength(300)
  metaDescription?: string;

  /** نام تگ‌ها */
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20)
  tags?: string[];

  /** محصولات مرتبط */
  @IsOptional() @IsArray() @IsInt({ each: true })
  relatedProductIds?: number[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVideoDto)
  videos?: ProductVideoDto[];

  /** مشخصات فنی */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];
}
