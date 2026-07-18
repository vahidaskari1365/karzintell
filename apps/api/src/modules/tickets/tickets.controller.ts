import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { TicketsService } from './tickets.service';

class CreateTicketDto {
  @IsString() @IsNotEmpty() @MaxLength(190) subject: string;
  @IsOptional() @IsEnum(['sales', 'support', 'technical', 'financial', 'other'] as const)
  department?: 'sales' | 'support' | 'technical' | 'financial' | 'other';
  @IsOptional() @IsEnum(['low', 'medium', 'high', 'urgent'] as const)
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  @IsOptional() @IsInt() orderId?: number;
  @IsString() @IsNotEmpty() body: string;
}

class ReplyDto {
  @IsString() @IsNotEmpty() body: string;
}

class AdminReplyDto extends ReplyDto {
  @IsOptional() @IsBoolean() isInternal?: boolean;
}

class StatusDto {
  @IsEnum(['open', 'pending_support', 'pending_customer', 'closed'] as const)
  status: 'open' | 'pending_support' | 'pending_customer' | 'closed';
}

@ApiTags('me')
@Controller('me/tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.service.myTickets(user.id, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get(':id')
  async one(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.myTicket(user.id, id) };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return { data: await this.service.create(user.id, dto) };
  }

  @Post(':id/messages')
  async reply(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReplyDto) {
    return { data: await this.service.reply(user.id, id, dto.body) };
  }
}

@ApiTags('admin/tickets')
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get()
  @RequirePermissions('tickets.view')
  async list(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    const r = await this.service.adminList({ page, limit, status });
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Get(':id')
  @RequirePermissions('tickets.view')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.service.adminDetail(id) };
  }

  @Post(':id/messages')
  @RequirePermissions('tickets.reply')
  async reply(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminReplyDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.service.adminReply(id, admin.id, dto.body, !!dto.isInternal) };
  }

  @Post(':id/status')
  @RequirePermissions('tickets.reply')
  async status(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusDto) {
    return { data: await this.service.adminSetStatus(id, dto.status) };
  }
}
