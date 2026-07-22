import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '../../database/entities';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
