import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/configuration';

/**
 * دسترسی به Redis با fallback حافظه‌ای (در صورت قطع بودن Redis، اپ بالا می‌آید).
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  private client: Redis | null = null;
  private memory = new Map<string, { value: string; expiresAt?: number }>();

  async onModuleInit() {
    if (!env.redis.enabled) return this.logger.warn('Redis غیرفعال است — حافظه موقت داخلی استفاده می‌شود');
    try {
      this.client = new Redis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password,
        db: env.redis.db,
        keyPrefix: env.redis.keyPrefix,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      await this.client.connect();
      this.client.on('error', (e) => this.logger.warn(`Redis error: ${e.message}`));
      this.logger.log('Redis متصل شد');
    } catch {
      this.logger.warn('اتصال به Redis برقرار نشد — حافظه موقت داخلی فعال شد');
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => undefined);
  }

  get isOnline(): boolean {
    return !!this.client && this.client.status === 'ready';
  }

  /** اجرای دستور خام Redis — فقط وقتی آنلاین است (برای صف/لیست‌ها) */
  async raw(command: string, ...args: any[]): Promise<any> {
    if (!this.isOnline) throw new Error('Redis آفلاین است');
    return (this.client as any).call(command, ...args);
  }

  async get(key: string): Promise<string | null> {
    if (this.isOnline) return this.client!.get(key);
    const item = this.memory.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isOnline) {
      if (ttlSeconds) await this.client!.set(key, value, 'EX', ttlSeconds);
      else await this.client!.set(key, value);
      return;
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isOnline) await this.client!.del(key);
    else this.memory.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (this.isOnline) {
      const keys = await this.client!.keys(pattern);
      if (keys.length) await this.client!.del(keys.map((k) => k.replace(env.redis.keyPrefix, '')));
      return;
    }
    const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    for (const key of [...this.memory.keys()]) if (regex.test(key)) this.memory.delete(key);
  }

  /** به‌علاوه یک با مقداردهی اولیه TTL (برای rate limit / شمارنده) */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (this.isOnline) {
      const count = await this.client!.incr(key);
      if (count === 1) await this.client!.expire(key, ttlSeconds);
      return count;
    }
    const now = Date.now();
    const item = this.memory.get(key);
    const count = !item || (item.expiresAt && item.expiresAt < now) ? 1 : Number(item.value) + 1;
    this.memory.set(key, {
      value: String(count),
      expiresAt: item?.expiresAt && item.expiresAt > now ? item.expiresAt : now + ttlSeconds * 1000,
    });
    return count;
  }

  /** قفل ساده توزیع‌شده */
  async acquireLock(key: string, ttlSeconds = 30): Promise<boolean> {
    if (this.isOnline) return (await this.client!.set(key, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
    const item = this.memory.get(key);
    if (item && (!item.expiresAt || item.expiresAt > Date.now())) return false;
    this.memory.set(key, { value: '1', expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }
}
