import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart, CartItem, Product, ProductImage, ProductVariant } from '../../database/entities';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, ProductVariant, Product, ProductImage])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
