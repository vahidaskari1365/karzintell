import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from '../../database/entities';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FileRecord])],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
