import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators';
import { AuditService } from './audit.service';

@ApiTags('admin/audit')
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
  ) {
    const r = await this.audit.list({ page, limit, userId, action });
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }
}
