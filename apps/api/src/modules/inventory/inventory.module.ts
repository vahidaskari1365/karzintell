import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory, Product, ProductVariant, StockMovement, Warehouse } from '../../database/entities';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Inventory, StockMovement, ProductVariant, Product])],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
