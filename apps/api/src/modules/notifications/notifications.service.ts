import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Notification } from '../../database/entities';
import { env } from '../../config/configuration';

/**
 * اعلان‌ها: ذخیره درون‌برنامه + ارسال پیامک/ایمیل.
 * در توسعه: پیامک فقط لاگ می‌شود، ایمیل به MailHog می‌رود.
 * TODO(مرحله سخت‌سازی): انتقال ارسال‌ها به صف BullMQ.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');
  private transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: false,
  });

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  /** ثبت اعلان دیتابیسی */
  async notify(
    userId: number,
    type: string,
    title: string,
    body?: string,
    data?: Record<string, unknown>,
  ) {
    try {
      return await this.notifications.save(
        this.notifications.create({ userId, type, title, body: body ?? null, data: data ?? null }),
      );
    } catch (e) {
      this.logger.warn(`notify failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** ارسال پیامک (توسعه: لاگ) */
  async sendSms(phone: string, message: string): Promise<void> {
    if (env.sms.provider === 'log' || !env.sms.apiKey) {
      this.logger.log(`[SMS→${phone}] ${message}`);
      return;
    }
    // اتصال پنل واقعی (Kavenegar/قاصدک) در مرحله استقرار
    this.logger.log(`[SMS provider=${env.sms.provider}] ${phone}: ${message}`);
  }

  async sendOtpSms(phone: string, code: string): Promise<void> {
    await this.sendSms(phone, `کارزینتل\nکد تأیید شما: ${code}`);
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${env.mail.fromName}" <${env.mail.from}>`,
        to,
        subject,
        text,
      });
    } catch (e) {
      this.logger.warn(`email to ${to} failed: ${(e as Error).message}`);
    }
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    await this.sendEmail(email, 'کد تأیید کارزینتل', `کد تأیید شما: ${code}\nاین کد تا ۲ دقیقه معتبر است.`);
  }

  // ------------------------------------------------- API کاربر
  async myNotifications(userId: number, page: number, limit: number) {
    const [items, total] = await this.notifications.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  unreadCount(userId: number) {
    return this.notifications
      .createQueryBuilder('n')
      .where('n.user_id = :userId AND n.read_at IS NULL', { userId })
      .getCount();
  }

  async markRead(userId: number, ids?: number[]) {
    if (ids?.length) {
      await this.notifications
        .createQueryBuilder()
        .update()
        .set({ readAt: new Date() })
        .where('user_id = :userId AND id IN (:...ids) AND read_at IS NULL', { userId, ids })
        .execute();
    } else {
      await this.notifications
        .createQueryBuilder()
        .update()
        .set({ readAt: new Date() })
        .where('user_id = :userId AND read_at IS NULL', { userId })
        .execute();
    }
    return { updated: true };
  }
}
