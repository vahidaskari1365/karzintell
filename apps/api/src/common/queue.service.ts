import { dbQuery } from './utils';
import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { DataSource } from 'typeorm';

type JobHandler = (payload: any) => Promise<void>;

interface QueueEntry {
  name: string;
  payload: any;
  attempts: number;
  enqueuedAt: number;
}

const QUEUE_KEY = 'krz:queue:jobs';
const MAX_ATTEMPTS = 3;
const MAX_CONCURRENCY = 5;

/**
 * صف سبک داخلی ارتقایافته:
 * - پشتیبانی از اجرای همزمان کارها (Concurrency) تا سقف ۵ کار همزمان
 * - استفاده از رادیس (BLPOP/LPUSH) جهت پایداری و فالبک حافظه‌ای در غیاب رادیس
 * - مکانیزم هوشمند مانیتورینگ و ارسال نوتیفیکیشن اضطراری به اپراتورها در صورت بروز خطا
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Queue');
  private handlers = new Map<string, JobHandler>();
  private running = false;
  private workerPromise: Promise<void> | null = null;
  private activeJobsCount = 0;
  private db: DataSource | null = null;

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

  setDataSource(ds: DataSource) {
    this.db = ds;
  }

  /** ثبت مصرف‌کننده برای یک نوع جاب */
  register(name: string, handler: JobHandler) {
    this.handlers.set(name, handler);
  }

  /** افزودن جاب به صف؛ بدون Redis بلافاصله اجرا می‌شود */
  async enqueue(name: string, payload: any): Promise<void> {
    const entry: QueueEntry = { name, payload, attempts: 0, enqueuedAt: Date.now() };
    if (!this.redis.isOnline) {
      this.execute(entry).catch(() => undefined);
      return;
    }
    await this.redis.raw('lpush', QUEUE_KEY, JSON.stringify(entry));
    this.logger.debug(`enqueued ${name}`);
  }

  private async worker() {
    this.logger.log('queue worker started (redis BLPOP with concurrency)');
    while (this.running) {
      try {
        if (this.activeJobsCount >= MAX_CONCURRENCY) {
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }

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

        this.activeJobsCount++;
        this.execute(entry)
          .catch(() => undefined)
          .finally(() => {
            this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
          });
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
      const errMsg = (e as Error).message || String(e);
      if (entry.attempts < MAX_ATTEMPTS && this.redis.isOnline) {
        this.logger.warn(`job ${entry.name} failed (attempt ${entry.attempts}/${MAX_ATTEMPTS}), retrying...`);
        // بک‌آف نمایی ساده: دوباره به انتهای صف
        await new Promise((r) => setTimeout(r, 1000 * entry.attempts)).catch(() => undefined);
        await this.redis.raw('lpush', QUEUE_KEY, JSON.stringify(entry)).catch(() => undefined);
      } else {
        this.logger.error(`job ${entry.name} failed permanently: ${errMsg}`);
        await this.notifyOperatorsOfError(entry.name, errMsg, entry.payload);
      }
    }
  }

  /** اطلاع‌رسانی خودکار خطای سیستمی به اپراتورها و ادمین‌های ارشد */
  public async notifyOperatorsOfError(source: string, error: string, payload?: any) {
    try {
      if (!this.db) return;
      // پیدا کردن تمامی کاربران دارای نقش ادمین ارشد (۱) یا پشتیبانی (۴)
      const operators = await dbQuery(this.db, `
        SELECT DISTINCT u.id, u.full_name, u.phone, u.email
        FROM users u
        INNER JOIN role_user ru ON ru.user_id = u.id
        INNER JOIN roles r ON r.id = ru.role_id
        WHERE r.name IN ('super_admin', 'support', 'content_manager') AND u.status = 'active'
      `);

      for (const op of operators) {
        // ۱. درج نوتیفیکیشن درون‌برنامه برای اپراتور
        await dbQuery(this.db, `
          INSERT INTO notifications (user_id, type, title, body, data, channel)
          VALUES (?, 'system.error', ?, ?, ?, 'database')
        `, [
          op.id,
          `خطای سیستمی در بخش: ${source}`,
          `یک خطای بحرانی در سیستم رخ داد: ${error.slice(0, 150)}`,
          JSON.stringify({ source, error, payload }),
        ]);

        // ۲. لاگ پیامک خطا (در تولید به صورت پیامک واقعی برای اپراتور ارسال می‌شود)
        this.logger.log(`[ALERT SMS to Operator ${op.full_name} (${op.phone})]: هشدار خطای کارزینتل: خطا در ${source}. شرح: ${error.slice(0, 50)}`);
      }
    } catch (e) {
      this.logger.error(`Failed to notify operators of error: ${(e as Error).message}`);
    }
  }
}

@Global()
@Module({ providers: [QueueService], exports: [QueueService] })
export class QueueModule {}
