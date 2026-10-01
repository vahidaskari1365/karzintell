import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../database/entities';
import { RedisService } from '../../common/redis.service';

const CACHE_KEY = 'settings:all';
const CACHE_TTL = 300;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
    private readonly redis: RedisService,
  ) {}

  private async all(): Promise<Setting[]> {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    const rows = await this.settings.find();
    await this.redis.set(CACHE_KEY, JSON.stringify(rows), CACHE_TTL);
    return rows;
  }

  async get<T = string>(key: string, fallback?: T): Promise<T> {
    const rows = await this.all();
    const row = rows.find((r) => r.key === key);
    if (!row || row.value == null) return fallback as T;
    switch (row.type) {
      case 'number': return Number(row.value) as T;
      case 'boolean': return (row.value === 'true' || row.value === '1') as T;
      case 'json':
        try { return JSON.parse(row.value) as T; } catch { return fallback as T; }
      default: return row.value as T;
    }
  }

  async publicSettings() {
    const rows = await this.all();
    const out: Record<string, unknown> = {};
    for (const r of rows.filter((r) => r.isPublic)) out[r.key] = await this.get(r.key);
    return out;
  }

  /** برای پنل ادمین: گروه‌بندی‌شده */
  async adminList() {
    const rows = await this.all();
    const groups: Record<string, Array<Pick<Setting, 'key' | 'value' | 'type' | 'isPublic'>>> = {};
    for (const r of rows) {
      groups[r.group] ||= [];
      groups[r.group].push({ key: r.key, value: r.value, type: r.type, isPublic: r.isPublic });
    }
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  }

  async upsertBulk(items: Array<{ key: string; value: string; type?: Setting['type']; group?: string; isPublic?: boolean }>, adminId: number) {
    for (const item of items) {
      const existing = await this.settings.findOne({ where: { key: item.key } });
      const row = existing || this.settings.create({ key: item.key, group: item.group || 'general', type: item.type || 'string' });
      row.value = item.value;
      if (item.type) row.type = item.type;
      if (item.group) row.group = item.group;
      if (item.isPublic !== undefined) row.isPublic = item.isPublic;
      row.updatedBy = adminId;
      await this.settings.save(row);
    }
    await this.redis.del(CACHE_KEY);
    return this.adminList();
  }
}
