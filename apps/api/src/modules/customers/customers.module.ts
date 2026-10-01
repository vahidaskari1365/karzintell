import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, User } from '../../database/entities';
import { CustomersController } from './customers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order])],
  controllers: [CustomersController],
})
export class CustomersModule {}
