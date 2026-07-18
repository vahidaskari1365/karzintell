import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * کش یکپارچه: Redis اگر در دسترس باشد، در غیر این صورت حافظه درون‌پروسه‌ای با TTL.
 * تمام سرویس‌ها فقط با این کلاس کار می‌کنند تا حذف Redis سیستم را متوقف نکند.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis?: Redis;
  private mem = new Map<string, { v: string; exp?: number; set?: Set<string> }>();
  readonly usingRedis: boolean = false;

  constructor(private config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>("redis.url");
    if (!url) return;
    try {
      const r = new Redis(url, {
        password: this.config.get<string>("redis.password"),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      await r.connect();
      await r.ping();
      this.redis = r;
      (this as any).usingRedis = true;
      r.on("error", () => {});
    } catch {
      this.redis = undefined; // fallback حافظه‌ای
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  private alive(e?: { exp?: number }): boolean {
    return !!e && (e.exp === undefined || e.exp > Date.now());
  }

  async get(key: string): Promise<string | null> {
    if (this.redis) return this.redis.get(key);
    const e = this.mem.get(key);
    if (!this.alive(e)) {
      this.mem.delete(key);
      return null;
    }
    return e!.v;
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (this.redis) {
      ttlSec ? await this.redis.set(key, value, "EX", ttlSec) : await this.redis.set(key, value);
      return;
    }
    this.mem.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  }

  async del(...keys: string[]): Promise<void> {
    if (this.redis) {
      if (keys.length) await this.redis.del(...keys);
      return;
    }
    keys.forEach((k) => this.mem.delete(k));
  }

  async incr(key: string, ttlSec?: number): Promise<number> {
    if (this.redis) {
      const n = await this.redis.incr(key);
      if (ttlSec && n === 1) await this.redis.expire(key, ttlSec);
      return n;
    }
    const e = this.mem.get(key);
    const cur = this.alive(e) ? parseInt(e!.v, 10) || 0 : 0;
    const n = cur + 1;
    this.mem.set(key, { v: String(n), exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
    return n;
  }

  async sadd(key: string, member: string, ttlSec?: number): Promise<void> {
    if (this.redis) {
      await this.redis.sadd(key, member);
      if (ttlSec) await this.redis.expire(key, ttlSec);
      return;
    }
    const e = this.mem.get(key);
    const s = this.alive(e) && e!.set ? e!.set! : new Set<string>();
    s.add(member);
    this.mem.set(key, { v: "", exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined, set: s });
  }

  async srem(key: string, member: string): Promise<void> {
    if (this.redis) {
      await this.redis.srem(key, member);
      return;
    }
    const e = this.mem.get(key);
    if (this.alive(e)) e!.set?.delete(member);
  }

  async smembers(key: string): Promise<string[]> {
    if (this.redis) return this.redis.smembers(key);
    const e = this.mem.get(key);
    if (!this.alive(e)) return [];
    return [...(e!.set ?? [])];
  }

  async scard(key: string): Promise<number> {
    if (this.redis) return this.redis.scard(key);
    const e = this.mem.get(key);
    if (!this.alive(e)) return 0;
    return e!.set?.size ?? 0;
  }

  /** Cache-Aside: اگر کلید بود همان، وگرنه مقداردهی و ذخیره */
  async wrap<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) return JSON.parse(cached) as T;
    const value = await loader();
    await this.set(key, JSON.stringify(value), ttlSec);
    return value;
  }
}
