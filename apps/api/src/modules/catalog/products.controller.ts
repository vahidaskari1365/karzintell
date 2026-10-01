import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { paginate } from '../../common/utils';
import { ProductsService } from './products.service';
import { SearchService } from '../search/search.service';

@ApiTags('catalog')
@Controller()
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly search: SearchService,
  ) {}

  @Public()
  @Get('products')
  async list(@Query() query: Record<string, string>) {
    const r = await this.products.publicList(query);
    return { data: { items: r.items, engine: r.engine }, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Public()
  @Get('search')
  async searchProducts(@Query() query: Record<string, string>) {
    const r = await this.products.publicList({ ...query, q: query.q });
    return { data: { items: r.items, engine: r.engine }, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Public()
  @Get('search/suggest')
  async suggest(@Query('q') q?: string) {
    return { data: await this.search.suggest(q || '') };
  }

  @Public()
  @Get('products/:slug')
  async detail(@Param('slug') slug: string) {
    return { data: await this.products.publicDetail(slug) };
  }

  @Public()
  @Get('products/:id/related')
  async related(@Param('id') id: string) {
    return { data: await this.products.relatedById(Number(id)) };
  }
}
