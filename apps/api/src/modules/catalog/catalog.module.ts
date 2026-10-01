import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Attribute,
  AttributeValue,
  Brand,
  Category,
  CategoryAttribute,
  Product,
  ProductAttributeValue,
  ProductImage,
  ProductRelation,
  ProductTag,
  ProductVariant,
  ProductVariantValue,
  ProductVideo,
  Review,
  Tag,
  Wishlist,
} from '../../database/entities';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category, Brand, Attribute, AttributeValue, CategoryAttribute,
      Product, ProductVariant, ProductVariantValue, ProductImage, ProductVideo,
      Tag, ProductTag, ProductRelation, ProductAttributeValue, Review, Wishlist,
    ]),
  ],
  controllers: [CatalogController, ProductsController, AdminProductsController],
  providers: [CatalogService, ProductsService],
  exports: [CatalogService, ProductsService],
})
export class CatalogModule {}
