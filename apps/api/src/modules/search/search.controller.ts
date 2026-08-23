import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators';
import { SearchService } from './search.service';

@ApiTags('admin/search')
@Controller('admin/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** وضعیت موتور جستجو */
  @Get('status')
  @RequirePermissions('settings.manage')
  status() {
    return { data: { engine: this.search.isAvailable() ? 'meilisearch' : 'mysql-fallback' } };
  }

  /** بازنمایه‌سازی کامل محصولات */
  @Post('reindex')
  @RequirePermissions('products.update')
  reindex() {
    return this.search.reindexAll();
  }
}
