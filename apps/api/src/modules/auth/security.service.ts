import { Injectable } from '@nestjs/common';
import { generateSecret as otpGenerateSecret, generateURI as otpGenerateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { RedisService } from '../../common/redis.service';
import { uuid } from '../../common/utils';
import { DomainException } from '../../common/http-exception.filter';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toEnglishDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim();

/** کپچای عددی داخلی (بدون وابستگی خارجی) — سؤال جمع ساده */
@Injectable()
export class CaptchaService {
  constructor(private readonly redis: RedisService) {}

  async create() {
    const a = 2 + Math.floor(Math.random() * 9);
    const b = 2 + Math.floor(Math.random() * 9);
    const id = uuid();
    await this.redis.set(`captcha:${id}`, String(a + b), 180);
    return {
      captchaId: id,
      question: `حاصل ${a} + ${b} چند می‌شود؟`,
      ttlSeconds: 180,
    };
  }

  /** اعتبارسنجی کپچا — یک‌بارمصرف */
  async assert(id: string | undefined, answer: string | undefined) {
    if (!id || !String(answer ?? '').trim())
      throw new DomainException('CAPTCHA_REQUIRED', 'پاسخ کپچا الزامی است', 400);
    const expected = await this.redis.get(`captcha:${id}`);
    await this.redis.del(`captcha:${id}`); // یک‌بارمصرف حتی در صورت خطا
    if (!expected)
      throw new DomainException('CAPTCHA_INVALID', 'کپچا منقضی شده است — کپچای جدید بگیرید', 400);
    if (expected !== toEnglishDigits(String(answer)))
      throw new DomainException('CAPTCHA_INVALID', 'پاسخ کپچا اشتباه است', 400);
  }
}

/** ورود دومرحله‌ای TOTP (Google Authenticator / رایکا/همیار) */
@Injectable()
export class TwoFactorService {
  constructor(private readonly redis: RedisService) {}

  generateSecret() {
    return otpGenerateSecret();
  }

  keyUri(phone: string, secret: string) {
    return otpGenerateURI({ secret, issuer: 'کارزینتل', label: phone });
  }

  async qrDataUrl(otpauthUrl: string) {
    return QRCode.toDataURL(otpauthUrl, { width: 220, margin: 1 });
  }

  check(code: string, secret: string) {
    try {
      return verifySync({ secret, token: toEnglishDigits(code) }).valid === true;
    } catch {
      return false;
    }
  }

  /** صدور بلیت چالش ۲FA پس از ورود موفق با رمز — TTL ۳ دقیقه */
  async issueTicket(userId: number) {
    const ticket = uuid();
    await this.redis.set(`tfa:${ticket}`, String(userId), 180);
    return ticket;
  }

  async peekTicket(ticket: string): Promise<number> {
    const raw = await this.redis.get(`tfa:${ticket}`);
    if (!raw)
      throw new DomainException('TFA_TICKET_EXPIRED', 'مهلت ورود دومرحله‌ای گذشته است — دوباره وارد شوید', 401);
    return Number(raw);
  }

  async burnTicket(ticket: string) {
    await this.redis.del(`tfa:${ticket}`);
  }
}
