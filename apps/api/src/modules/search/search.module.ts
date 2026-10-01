import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/entities';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
