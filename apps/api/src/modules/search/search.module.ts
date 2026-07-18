import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../database/entities';
import { SearchService } from './search.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
