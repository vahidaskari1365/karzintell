import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductCompare } from '../../database/entities';
import { CompareService } from './compare.service';
import { CompareController } from './compare.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCompare, Product]), FilesModule],
  providers: [CompareService],
  controllers: [CompareController],
})
export class CompareModule {}
