import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import * as webpush from 'web-push';
import { Notification, PushSubscription } from '../../database/entities';
import { env } from '../../config/configuration';
import { QueueService } from '../../common/queue.service';

/**
 * اعلان‌ها: ذخیره درون‌برنامه + ارسال پیامک/ایمیل/Web Push.
 * در توسعه: پیامک فقط لاگ می‌شود، ایمیل به MailHog می‌رود.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger('Notifications');
  private transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
  });
  private pushReady = false;
  private pushPublicKey = '';

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(PushSubscription)
    private readonly pushSubs: Repository<PushSubscription>,
    private readonly queue: QueueService,
  ) {
    // مصرف‌کننده‌های صف (Background Jobs) با پشتیبانی از فالبک پیامک دوم در صورت شکست اولیه
    this.queue.register('sms.send', (p) => this.deliverSmsWithFallback(p.phone, p.message));
    this.queue.register('sms.send_otp', (p) => this.deliverOtpSmsWithFallback(p.phone, p.code));
    this.queue.register('email.send', (p) => this.deliverEmail(p.to, p.subject, p.text));
  }

  async onModuleInit() {
    // کلیدهای VAPID از env؛ در غیر اینصورت از تنظیمات دیتابیس؛ در غیر اینصورت تولید خودکار
    let pub = env.webpush.publicKey;
    let priv = env.webpush.privateKey;
    if (!pub || !priv) {
      try {
        const keys = webpush.generateVAPIDKeys();
        pub = keys.publicKey;
        priv = keys.privateKey;
        this.logger.warn('VAPID keys generated in-memory — برای تولید، VAPID_PUBLIC_KEY/PRIVATE_KEY را در env تنظیم کنید');
      } catch {
        this.logger.warn('web-push unavailable — اعلان مرورگر غیرفعال است');
        return;
      }
    }
    try {
      webpush.setVapidDetails(env.webpush.subject, pub, priv);
      this.pushReady = true;
      this.pushPublicKey = pub;
    } catch (e) {
      this.logger.warn(`web-push setup failed: ${(e as Error).message}`);
    }
  }

  getPublicKey() {
    return this.pushReady ? this.pushPublicKey : null;
  }

  /** ذخیره اعلان + ارسال پوش به مرورگر کاربر */
  async notify(
    userId: number,
    type: string,
    title: string,
    body?: string,
    data?: Record<string, unknown>,
  ) {
    let saved: Notification | null = null;
    try {
      saved = await this.notifications.save(
        this.notifications.create({ userId, type, title, body: body ?? null, data: data ?? null }),
      );
    } catch (e) {
      this.logger.warn(`notify failed: ${(e as Error).message}`);
    }
    const url = (data as any)?.orderCode ? `/account/orders/${(data as any).orderCode}` : undefined;
    this.sendPush(userId, title, body ?? '', { url }).catch(() => {});
    return saved;
  }

  /** ارسال Web Push به همه اشتراک‌های کاربر */
  async sendPush(userId: number, title: string, body: string, data?: { url?: string }) {
    if (!this.pushReady) return;
    const subs = await this.pushSubs.find({ where: { userId } }).catch(() => []);
    if (!subs.length) return;
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon.svg',
      url: data?.url || '/account/notifications',
    });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (e: any) {
        // اشتراک منقضی/لغوشده → پاکسازی
        if (e?.statusCode === 404 || e?.statusCode === 410)
          await this.pushSubs.delete({ id: sub.id }).catch(() => undefined);
        else this.logger.warn(`push failed: ${e?.message ?? e}`);
      }
    }
  }

  async subscribePush(userId: number, endpoint: string, p256dh: string, auth: string) {
    if (!this.pushReady) return { subscribed: false, reason: 'push غیرفعال است (کلید VAPID تنظیم نشده)' };
    const existing = await this.pushSubs.findOne({ where: { endpoint } });
    if (existing) {
      if (existing.userId !== userId) await this.pushSubs.update({ id: existing.id }, { userId, p256dh, auth });
    } else {
      await this.pushSubs.save(this.pushSubs.create({ userId, endpoint, p256dh, auth }));
    }
    return { subscribed: true };
  }

  async unsubscribePush(userId: number, endpoint: string) {
    await this.pushSubs.delete({ userId, endpoint });
    return { unsubscribed: true };
  }

  /** ارسال پیامک — از طریق صف پس‌زمینه (بدون بلاک کردن درخواست) */
  async sendSms(phone: string, message: string): Promise<void> {
    await this.queue.enqueue('sms.send', { phone, message });
  }

  /** متدهای کمکی برای هندل کردن ارسال‌های با فالبک پنل پیامک دوم در صورت داون بودن پنل اول */
  private async deliverSmsWithFallback(phone: string, message: string) {
    try {
      await this.deliverSms(phone, message);
    } catch (primaryError) {
      this.logger.warn(`Primary SMS gateway failed: ${(primaryError as Error).message}. Attempting secondary backup gateway (IPPanel/FarazSMS)...`);
      const backupApiKey = process.env.BACKUP_SMS_API_KEY;
      const backupSender = process.env.BACKUP_SMS_SENDER || '3000505';
      if (backupApiKey) {
        try {
          const url = `https://ippanel.com/services/sms/send/simple`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `AccessKey ${backupApiKey}` },
            body: JSON.stringify({
              recipient: [phone],
              sender: backupSender,
              message,
            }),
          });
          if (res.ok) {
            this.logger.log(`✅ Backup SMS sent successfully to ${phone}`);
            return;
          }
        } catch (backupError) {
          this.logger.error(`Backup SMS gateway also failed: ${(backupError as Error).message}`);
        }
      }
      throw primaryError;
    }
  }

  private async deliverOtpSmsWithFallback(phone: string, code: string) {
    try {
      await this.deliverOtpSms(phone, code);
    } catch (primaryError) {
      this.logger.warn(`Primary OTP SMS gateway failed: ${(primaryError as Error).message}. Attempting secondary backup OTP...`);
      const backupApiKey = process.env.BACKUP_SMS_API_KEY;
      const backupTemplate = process.env.BACKUP_SMS_OTP_TEMPLATE || 'otp';
      if (backupApiKey) {
        try {
          const url = `https://ippanel.com/services/sms/pattern/send`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `AccessKey ${backupApiKey}` },
            body: JSON.stringify({
              pattern_code: backupTemplate,
              originator: process.env.BACKUP_SMS_SENDER || '3000505',
              recipient: phone,
              values: { code },
            }),
          });
          if (res.ok) {
            this.logger.log(`✅ Backup OTP sent successfully to ${phone}`);
            return;
          }
        } catch (backupError) {
          this.logger.error(`Backup OTP gateway also failed: ${(backupError as Error).message}`);
        }
      }
      throw primaryError;
    }
  }

  /** اجرای واقعی ارسال پیامک (داخل ورکر صف) */
  private async deliverSms(phone: string, message: string) {
    if (env.sms.provider === 'log' || !env.sms.apiKey) {
      this.logger.log(`[SMS→${phone}] ${message}`);
      return;
    }
    if (env.sms.provider === 'kavenegar') {
      const url = `https://api.kavenegar.com/v1/${env.sms.apiKey}/sms/send.json?receptor=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}${env.sms.sender ? `&sender=${encodeURIComponent(env.sms.sender)}` : ''}`;
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error(`kavenegar ${res.status}`);
      return;
    }
    this.logger.log(`[SMS provider=${env.sms.provider}] ${phone}: ${message}`);
  }

  /** ارسال پیامک یکبار مصرف OTP از طریق سرویس خدماتی ضد بلک‌لیست (Lookup) کاوه‌نگار */
  private async deliverOtpSms(phone: string, code: string) {
    if (env.sms.provider === 'log' || !env.sms.apiKey) {
      this.logger.log(`[OTP SMS→${phone}] Code: ${code}`);
      return;
    }
    if (env.sms.provider === 'kavenegar') {
      const template = process.env.KAVENEGAR_OTP_TEMPLATE || 'otp';
      const url = `https://api.kavenegar.com/v1/${env.sms.apiKey}/verify/lookup.json?receptor=${encodeURIComponent(phone)}&token=${encodeURIComponent(code)}&template=${encodeURIComponent(template)}`;
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        this.logger.warn(`kavenegar lookup failed for ${phone}, trying fallback standard send...`);
        const fallbackUrl = `https://api.kavenegar.com/v1/${env.sms.apiKey}/sms/send.json?receptor=${encodeURIComponent(phone)}&message=${encodeURIComponent(`کارزینتل\nکد تأیید شما: ${code}`)}`;
        await fetch(fallbackUrl, { method: 'POST' });
      }
      return;
    }
    this.logger.log(`[SMS provider=${env.sms.provider}] OTP ${phone}: ${code}`);
  }

  async sendOtpSms(phone: string, code: string): Promise<void> {
    await this.queue.enqueue('sms.send_otp', { phone, code });
  }

  /** ارسال ایمیل — از طریق صف پس‌زمینه */
  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    await this.queue.enqueue('email.send', { to, subject, text });
  }

  private async deliverEmail(to: string, subject: string, text: string) {
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
