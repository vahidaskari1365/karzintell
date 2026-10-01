import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem, Product, ProductQuestion, Review } from '../../database/entities';
import { ReviewsService } from './reviews.service';
import { ReviewsController, AdminReviewsController } from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, ProductQuestion, Product, OrderItem])],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
