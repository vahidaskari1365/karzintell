import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators';
import { RedisService } from '../../common/redis.service';
import { env } from '../../config/configuration';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async health() {
    let db = 'up';
    try {
      await this.ds.query('SELECT 1');
    } catch {
      db = 'down';
    }
    return {
      data: {
        status: db === 'up' ? 'ok' : 'degraded',
        uptime: Math.floor(process.uptime()),
        services: {
          database: db,
          redis: this.redis.isOnline ? 'up' : 'memory-fallback',
          search: 'optional',
          storage: env.storage.driver,
        },
        time: new Date().toISOString(),
      },
    };
  }
}
