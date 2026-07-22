import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingMethod, ShippingZone } from '../../database/entities';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingZone, ShippingMethod]), SettingsModule],
  providers: [ShippingService],
  controllers: [ShippingController],
  exports: [ShippingService],
})
export class ShippingModule {}
