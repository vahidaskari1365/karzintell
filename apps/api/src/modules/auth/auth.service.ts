import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RefreshToken, User, VerificationCode } from '../../database/entities';
import { env } from '../../config/configuration';
import { otpCode, sha256, uuid } from '../../common/utils';
import { RedisService } from '../../common/redis.service';
import { RbacService } from '../rbac/rbac.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CaptchaService, TwoFactorService } from './security.service';
import { AuthUser, JwtRefreshPayload } from '../../common/types';
import { DomainException } from '../../common/http-exception.filter';

const OTP_TTL_MIN = 2;
const OTP_MAX_ATTEMPTS = 5;

// محدودیت ورود برای جلوگیری از حملات brute-force
const LOGIN_MAX_FAILURES = 10; // حداکثر تلاش ناموفق
const LOGIN_WINDOW_SEC = 15 * 60; // در بازه ۱۵ دقیقه

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(VerificationCode) private readonly otps: Repository<VerificationCode>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly rbac: RbacService,
    private readonly notifications: NotificationsService,
    readonly captcha: CaptchaService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  // --------------------------------------------------------------- ثبت‌نام
  async register(dto: { fullName: string; email?: string; phone?: string; password: string }) {
    const phone = dto.phone?.trim() || null;
    const email = dto.email?.trim().toLowerCase() || null;
    if (!phone && !email) throw new BadRequestException('موبایل یا ایمیل لازم است');

    const clash = await this.users.findOne({ where: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] });
    if (clash)
      throw new ConflictException({
        code: clash.phone === phone ? 'PHONE_TAKEN' : 'EMAIL_TAKEN',
        message: 'این شماره موبایل یا ایمیل قبلاً ثبت شده است',
      });

    const user = await this.users.save(
      this.users.create({
        fullName: dto.fullName,
        phone: phone!,
        email,
        passwordHash: await bcrypt.hash(dto.password, env.bcryptRounds),
        status: 'active',
        phoneVerifiedAt: null,
        emailVerifiedAt: null,
      } as Partial<User>),
    );
    await this.rbac.assignCustomerRole(user.id);
    return this.rbac.buildAuthUser(user.id);
  }

  // ------------------------------------------------------------- ورود رمز
  async login(identifier: string, password: string, ip?: string, ua?: string) {
    const id = identifier.trim().toLowerCase();

    // ضد brute-force: اگر از این شناسه یا IP تعداد تلاش ناموفق زیاد شده، قفل موقت
    const failKey = `login:fail:${sha256(id)}`;
    const ipKey = `login:fail:ip:${ip || 'unknown'}`;
    const [idFails, ipFails] = await Promise.all([
      this.redis.get(failKey),
      this.redis.get(ipKey),
    ]);
    if ((idFails && Number(idFails) >= LOGIN_MAX_FAILURES) || (ipFails && Number(ipFails) >= LOGIN_MAX_FAILURES * 3)) {
      throw new UnauthorizedException({
        code: 'LOGIN_LOCKED',
        message: 'تعداد تلاش‌های ناموفق زیاد است — چند دقیقه بعد دوباره تلاش کنید',
      });
    }

    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .addSelect('u.twoFactorSecret')
      .where('LOWER(u.email) = :id OR u.phone = :id', { id })
      .getOne();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await Promise.all([
        this.redis.incrWithTtl(failKey, LOGIN_WINDOW_SEC),
        this.redis.incrWithTtl(ipKey, LOGIN_WINDOW_SEC),
      ]);
      throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
    if (user.status === 'suspended')
      throw new UnauthorizedException({ code: 'USER_SUSPENDED', message: 'حساب شما مسدود شده است' });

    // ورود موفق → پاک‌کردن شمارنده تلاش‌های ناموفق
    await Promise.all([
      this.redis.del(failKey),
      this.redis.del(ipKey),
    ]);

    // ورود دومرحله‌ای فعال → صدور بلیت چالش (بدون توکن)
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const ticket = await this.twoFactor.issueTicket(user.id);
      return { requireTwoFactor: true, ticket } as any;
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });
    const tokens = await this.issueTokens(user.id, ip, ua);
    const authUser = await this.rbac.buildAuthUser(user.id);
    return { tokens, user: authUser };
  }

  /** تکمیل ورود با کد TOTP */
  async verifyTwoFactor(ticket: string, code: string, ip?: string, ua?: string) {
    const userId = await this.twoFactor.peekTicket(ticket);
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.twoFactorSecret')
      .where('u.id = :userId', { userId })
      .getOne();
    if (!user?.twoFactorEnabled || !user.twoFactorSecret)
      throw new UnauthorizedException({ code: 'TFA_NOT_ENABLED', message: 'ورود دومرحله‌ای فعال نیست' });

    // حداکثر ۵ تلاش ناموفق برای هر بلیت — بعد از آن بلیت می‌سوزد
    if (!this.twoFactor.check(code, user.twoFactorSecret)) {
      const tries = await this.redis.incrWithTtl(`tfa:tries:${ticket}`, 180);
      if (tries > 5) {
        await this.twoFactor.burnTicket(ticket);
        throw new UnauthorizedException({ code: 'TFA_LOCKED', message: 'تلاش‌های ناموفق زیاد شد — دوباره وارد شوید' });
      }
      throw new UnauthorizedException({ code: 'TFA_BAD_CODE', message: 'کد ورود دومرحله‌ای اشتباه است' });
    }

    await this.twoFactor.burnTicket(ticket);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    const tokens = await this.issueTokens(user.id, ip, ua);
    const authUser = await this.rbac.buildAuthUser(user.id);
    return { tokens, user: authUser };
  }

  // ------------------------------------------------------ مدیریت ۲FA (me)
  async twoFactorSetup(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'کاربر یافت نشد' });
    if (user.twoFactorEnabled)
      throw new DomainException('TFA_ALREADY', 'ورود دومرحله‌ای از قبل فعال است', 409);
    const secret = this.twoFactor.generateSecret();
    await this.users.update(userId, { twoFactorSecret: secret });
    const otpauthUrl = this.twoFactor.keyUri(user.phone || `user-${userId}`, secret);
    return { secret, otpauthUrl, qrDataUrl: await this.twoFactor.qrDataUrl(otpauthUrl) };
  }

  async twoFactorEnable(userId: number, code: string) {
    const secret = await this.secretOf(userId);
    if (!secret) throw new DomainException('TFA_SETUP_FIRST', 'ابتدا «راه‌اندازی» را بزنید', 400);
    if (!this.twoFactor.check(code, secret))
      throw new UnauthorizedException({ code: 'TFA_BAD_CODE', message: 'کد اشتباه است — ساعت گوشی را همگام (اتوماتیک) کنید' });
    await this.users.update(userId, { twoFactorEnabled: true });
    return { enabled: true };
  }

  async twoFactorDisable(userId: number, code: string) {
    const secret = await this.secretOf(userId);
    if (!secret || !this.twoFactor.check(code, secret))
      throw new UnauthorizedException({ code: 'TFA_BAD_CODE', message: 'کد اشتباه است' });
    await this.users.update(userId, { twoFactorEnabled: false, twoFactorSecret: null });
    return { enabled: false };
  }

  async twoFactorStatus(userId: number) {
    const u = await this.users.findOne({ where: { id: userId } });
    return { enabled: !!u?.twoFactorEnabled };
  }

  private async secretOf(userId: number) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.twoFactorSecret')
      .where('u.id = :userId', { userId })
      .getOne();
    return user?.twoFactorSecret ?? null;
  }

  // ------------------------------------------------------------------ OTP
  async sendOtp(dto: {
    channel: 'phone' | 'email';
    target: string;
    purpose: 'register' | 'login' | 'reset_password' | 'verify_contact';
  }) {
    const target = dto.channel === 'email' ? dto.target.trim().toLowerCase() : dto.target.trim();

    // rate limit: هر ۶۰ ثانیه یک‌بار
    const rlKey = `otp:rl:${dto.channel}:${target}`;
    const count = await this.redis.incrWithTtl(rlKey, 60);
    if (count > 1)
      throw new DomainException('RATE_LIMITED', 'کمی بعد دوباره تلاش کنید', 429);

    // حداکثر ۵ کد در ساعت
    const hourly = await this.redis.incrWithTtl(`otp:hour:${dto.channel}:${target}`, 3600);
    if (hourly > 5)
      throw new DomainException('RATE_LIMITED', 'تعداد درخواست‌های شما از حد مجاز گذشته است', 429);

    const code = otpCode();
    await this.otps.save(
      this.otps.create({
        channel: dto.channel,
        target,
        codeHash: sha256(code),
        purpose: dto.purpose,
        expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
      }),
    );

    if (dto.channel === 'phone') await this.notifications.sendOtpSms(target, code);
    else await this.notifications.sendOtpEmail(target, code);

    // برای توسعه: کد در پاسخ هم برمی‌گردد تا بدون پنل پیامکی تست شود
    return { sent: true, expiresInSeconds: OTP_TTL_MIN * 60, ...(env.isDev ? { devCode: code } : {}) };
  }

  async verifyOtp(dto: {
    channel: 'phone' | 'email';
    target: string;
    code: string;
    purpose: 'register' | 'login' | 'reset_password' | 'verify_contact';
    fullName?: string;
  }, ip?: string, ua?: string) {
    const target = dto.channel === 'email' ? dto.target.trim().toLowerCase() : dto.target.trim();
    await this.consumeOtp({ ...dto, target });

    let user = await this.findByTarget(dto.channel, target);
    if (!user) {
      if (dto.purpose === 'reset_password') throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'کاربری با این مشخصات یافت نشد' });
      // ورود با موبایل → اگر نبود، ثبت‌نام خودکار
      user = await this.registerAuto(dto.channel, target, dto.fullName);
    }

    // علامت گذاری verified
    if (dto.channel === 'phone' && !user.phoneVerifiedAt)
      await this.users.update(user.id, { phoneVerifiedAt: new Date(), status: 'active' });
    if (dto.channel === 'email' && !user.emailVerifiedAt)
      await this.users.update(user.id, { emailVerifiedAt: new Date(), status: 'active' });

    const tokens = await this.issueTokens(user.id, ip, ua);
    const authUser = await this.rbac.buildAuthUser(user.id);
    return { tokens, user: authUser };
  }

  async resetPassword(dto: {
    channel: 'phone' | 'email';
    target: string;
    code: string;
    newPassword: string;
  }) {
    const target = dto.channel === 'email' ? dto.target.trim().toLowerCase() : dto.target.trim();
    const user = await this.findByTarget(dto.channel, target);
    if (!user) throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'کاربر یافت نشد' });

    await this.consumeOtp({ channel: dto.channel, target, code: dto.code, purpose: 'reset_password' });
    await this.users.update(user.id, {
      passwordHash: await bcrypt.hash(dto.newPassword, env.bcryptRounds),
      mustChangePassword: false,
    });
    await this.revokeAllSessions(user.id);
    return { reset: true };
  }

  async changePassword(userId: number, current: string, next: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'ورود لازم است' });
    if (!(await bcrypt.compare(current, user.passwordHash)))
      throw new BadRequestException({ code: 'BAD_CREDENTIALS', message: 'رمز فعلی اشتباه است' });

    await this.users.update(userId, {
      passwordHash: await bcrypt.hash(next, env.bcryptRounds),
      mustChangePassword: false,
    });
    await this.revokeAllSessions(userId);
    const tokens = await this.issueTokens(userId);
    const authUser = await this.rbac.buildAuthUser(userId);
    return { tokens, user: authUser };
  }

  // --------------------------------------------------------------- توکن‌ها
  private async issueTokens(userId: number, ip?: string, ua?: string): Promise<TokenBundle> {
    const jti = uuid();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, typ: 'access' },
      { secret: env.jwt.accessSecret, expiresIn: env.jwt.accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, typ: 'refresh', jti },
      { secret: env.jwt.refreshSecret, expiresIn: env.jwt.refreshTtl },
    );
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId,
        tokenHash: sha256(refreshToken),
        ip: ip ?? null,
        userAgent: ua ? ua.slice(0, 255) : null,
        expiresAt: new Date(Date.now() + env.jwt.refreshTtl * 1000),
      }),
    );
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string | undefined, ip?: string, ua?: string) {
    if (!refreshToken) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'نشست یافت نشد' });
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: env.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'نشست منقضی شده است' });
    }

    const record = await this.refreshTokens.findOne({ where: { tokenHash: sha256(refreshToken) } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      // احتمال سرقت توکن → همه نشست‌ها revoke
      if (record) await this.revokeAllSessions(record.userId);
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'نشست منقضی شده است — دوباره وارد شوید' });
    }

    await this.refreshTokens.update(record.id, { revokedAt: new Date() }); // rotation
    const tokens = await this.issueTokens(payload.sub, ip, ua);
    const user = await this.rbac.buildAuthUser(payload.sub);
    return { tokens, user };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken)
      await this.refreshTokens.update({ tokenHash: sha256(refreshToken) }, { revokedAt: new Date() });
    return { loggedOut: true };
  }

  private async revokeAllSessions(userId: number) {
    await this.refreshTokens.update({ userId }, { revokedAt: new Date() });
  }

  // ----------------------------------------------------------------- کمکی
  private async findByTarget(channel: 'phone' | 'email', target: string) {
    return channel === 'phone'
      ? this.users.findOne({ where: { phone: target } })
      : this.users.findOne({ where: { email: target } });
  }

  private async registerAuto(channel: 'phone' | 'email', target: string, fullName?: string) {
    // رمز تصادفی — کاربر با OTP وارد می‌شود و بعداً می‌تواند رمز بگذارد
    const randomPass = uuid();
    return this.users.save(
      this.users.create({
        fullName: fullName?.trim() || (channel === 'phone' ? `کاربر ${target.slice(-4)}` : target.split('@')[0]),
        phone: channel === 'phone' ? target : `otp-${Date.now()}`,
        email: channel === 'email' ? target : null,
        passwordHash: await bcrypt.hash(randomPass, env.bcryptRounds),
        status: 'active',
      } as Partial<User>),
    ).then(async (u) => {
      await this.rbac.assignCustomerRole(u.id);
      return u;
    });
  }

  private async consumeOtp(dto: {
    channel: 'phone' | 'email';
    target: string;
    code: string;
    purpose: string;
  }) {
    const row = await this.otps.findOne({
      where: { channel: dto.channel, target: dto.target, purpose: dto.purpose as any },
      order: { createdAt: 'DESC' },
    });
    if (!row || row.consumedAt || row.expiresAt < new Date())
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'کد تأیید معتبر نیست یا منقضی شده است' });
    if (row.attempts >= OTP_MAX_ATTEMPTS)
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'تعداد تلاش‌ها بیش از حد مجاز است' });

    await this.otps.update(row.id, { attempts: row.attempts + 1 });
    if (row.codeHash !== sha256(dto.code))
      throw new UnauthorizedException({ code: 'OTP_INVALID', message: 'کد تأیید اشتباه است' });

    await this.otps.update(row.id, { consumedAt: new Date() });
  }

  // -------------------------------------------------------- ورود با گوگل
  async googleLogin(idToken: string, ip?: string, ua?: string) {
    let email: string;
    let fullName: string;
    let avatar: string | null = null;

    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!res.ok) throw new Error('خطا در احراز هویت توکن گوگل');
      const payload: any = await res.json();
      if (!payload.email || (payload.email_verified !== 'true' && payload.email_verified !== true)) {
        throw new Error('ایمیل گوگل تایید نشده است');
      }
      // اعتبارسنجی audience: توکن باید برای اپلیکیشن ما صادر شده باشد
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (clientId && payload.aud !== clientId && payload.azp !== clientId) {
        throw new Error('توکن گوگل برای این اپلیکیشن صادر نشده است');
      }
      email = payload.email.trim().toLowerCase();
      fullName = payload.name || email.split('@')[0];
      avatar = payload.picture || null;
    } catch (e) {
      throw new UnauthorizedException({
        code: 'GOOGLE_AUTH_FAILED',
        message: (e as Error).message || 'تایید توکن گوگل ناموفق بود',
      });
    }

    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      // ثبت‌نام خودکار کاربر جدید با گوگل
      const randomPass = uuid();
      user = await this.users.save(
        this.users.create({
          fullName,
          email,
          phone: `google-${Date.now()}`,
          passwordHash: await bcrypt.hash(randomPass, env.bcryptRounds),
          status: 'active',
          avatarPath: avatar,
          emailVerifiedAt: new Date(),
        } as Partial<User>),
      );
      await this.rbac.assignCustomerRole(user.id);
    } else {
      if (user.status === 'suspended') {
        throw new UnauthorizedException({ code: 'USER_SUSPENDED', message: 'حساب شما مسدود شده است' });
      }
      if (!user.emailVerifiedAt) {
        await this.users.update(user.id, { emailVerifiedAt: new Date(), status: 'active' });
      }
      if (avatar && !user.avatarPath) {
        await this.users.update(user.id, { avatarPath: avatar });
      }
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });
    const tokens = await this.issueTokens(user.id, ip, ua);
    const authUser = await this.rbac.buildAuthUser(user.id);
    return { tokens, user: authUser };
  }
}
