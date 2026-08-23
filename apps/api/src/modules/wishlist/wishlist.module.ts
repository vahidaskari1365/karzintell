import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, Wishlist } from '../../database/entities';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist, Product]), FilesModule],
  providers: [WishlistService],
  controllers: [WishlistController],
})
export class WishlistModule {}
