import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';

type JobHandler = (payload: any) => Promise<void>;

interface QueueEntry {
  name: string;
  payload: any;
  attempts: number;
  enqueuedAt: number;
}

const QUEUE_KEY = 'krz:queue:jobs';
const MAX_ATTEMPTS = 3;

/**
 * صف سبک داخلی (شبیه BullMQ ولی بدون وابستگی):
 * - با Redis: تولیدکننده LPUSH می‌کند، ورکر BLPOP می‌خواند → تحمل ری‌استارت و توزیع بین چند نمونه
 * - بدون Redis: اجرای فوری در‌همان‌حافظه (توسعه)
 * - تلاش مجدد تا ۳ بار با بک‌آف نمایی؛ خطاها لاگ می‌شوند
 *
 * TODO(مقیاس بالا): جایگزینی با BullMQ — رابط enqueue/register ثابت می‌ماند.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Queue');
  private handlers = new Map<string, JobHandler>();
  private running = false;
  private workerPromise: Promise<void> | null = null;

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    if (this.redis.isOnline) {
      this.running = true;
      this.workerPromise = this.worker();
    }
  }

  async onModuleDestroy() {
    this.running = false;
    await Promise.race([this.workerPromise ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2000))]);
  }

  /** ثبت مصرف‌کننده برای یک نوع جاب */
  register(name: string, handler: JobHandler) {
    this.handlers.set(name, handler);
  }

  /** افزودن جاب به صف؛ بدون Redis بلافاصله اجرا می‌شود */
  async enqueue(name: string, payload: any): Promise<void> {
    const entry: QueueEntry = { name, payload, attempts: 0, enqueuedAt: Date.now() };
    if (!this.redis.isOnline) {
      // توسعه بدون Redis → اجرای فوری (فایر-اند-فرگت)
      this.execute(entry).catch(() => undefined);
      return;
    }
    await this.redis.raw('lpush', QUEUE_KEY, JSON.stringify(entry));
    this.logger.debug(`enqueued ${name}`);
  }

  private async worker() {
    this.logger.log('queue worker started (redis BLPOP)');
    while (this.running) {
      try {
        const res = await this.redis.raw('brpop', QUEUE_KEY, 5);
        const raw = Array.isArray(res) ? res[1] : null;
        if (!raw) continue;
        let entry: QueueEntry;
        try {
          entry = JSON.parse(raw);
        } catch {
          this.logger.warn('corrupt queue entry dropped');
          continue;
        }
        await this.execute(entry);
      } catch (e) {
        if (this.running) {
          this.logger.warn(`worker error: ${(e as Error).message}`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  private async execute(entry: QueueEntry) {
    const handler = this.handlers.get(entry.name);
    if (!handler) {
      this.logger.warn(`no handler for job ${entry.name}`);
      return;
    }
    try {
      await handler(entry.payload);
    } catch (e) {
      entry.attempts += 1;
      if (entry.attempts < MAX_ATTEMPTS && this.redis.isOnline) {
        // بک‌آف نمایی ساده: دوباره به انتهای صف
        await new Promise((r) => setTimeout(r, 1000 * entry.attempts)).catch(() => undefined);
        await this.redis.raw('lpush', QUEUE_KEY, JSON.stringify(entry)).catch(() => undefined);
      } else {
        this.logger.error(`job ${entry.name} failed permanently: ${(e as Error).message}`);
      }
    }
  }
}

@Global()
@Module({ providers: [QueueService], exports: [QueueService] })
export class QueueModule {}
