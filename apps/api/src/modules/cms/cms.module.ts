import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner, Page } from '../../database/entities';
import { CmsService } from './cms.service';
import { AdminCmsController, CmsController } from './cms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, Page])],
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
})
export class CmsModule {}
