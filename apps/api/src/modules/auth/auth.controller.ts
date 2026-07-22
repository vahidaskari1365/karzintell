import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { env } from '../../config/configuration';
import { CurrentUser, Public } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  OtpSendDto,
  OtpVerifyDto,
  RegisterDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
  TwoFactorVerifyDto,
} from './auth.dto';

const REFRESH_COOKIE = 'krz_rt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
      maxAge: env.jwt.refreshTtl * 1000,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  /** کپچای عددی برای فرم‌های حساس (ضدبات) */
  @Public()
  @Get('captcha')
  async captcha() {
    return { data: await this.auth.captcha.create() };
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    await this.auth.captcha.assert(dto.captchaId, dto.captchaAnswer);
    const user = await this.auth.register(dto);
    // بعد از ثبت‌نام مستقیم لاگین می‌شود
    const login = await this.auth.login(
      (dto.phone || dto.email)!,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, login.tokens.refreshToken);
    return { data: { accessToken: login.tokens.accessToken, user } };
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const result = await this.auth.login(
      dto.identifier,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
    // ورود دومرحله‌ای لازم است → کلاینت کد TOTP را می‌گیرد
    if (result.requireTwoFactor) {
      return { data: { requireTwoFactor: true as const, ticket: result.ticket as string } };
    }
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return { data: { accessToken: result.tokens.accessToken, user: result.user } };
  }

  /** تکمیل ورود با کد دومرحله‌ای (TOTP) */
  @Public()
  @HttpCode(200)
  @Post('2fa/verify')
  async twoFactorVerify(
    @Body() dto: TwoFactorVerifyDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { tokens, user } = await this.auth.verifyTwoFactor(
      dto.ticket,
      dto.code,
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return { data: { accessToken: tokens.accessToken, user } };
  }

  @Public()
  @HttpCode(200)
  @Post('otp/send')
  async otpSend(@Body() dto: OtpSendDto) {
    await this.auth.captcha.assert(dto.captchaId, dto.captchaAnswer);
    return { data: await this.auth.sendOtp(dto) };
  }

  @Public()
  @HttpCode(200)
  @Post('otp/verify')
  async otpVerify(
    @Body() dto: OtpVerifyDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { tokens, user } = await this.auth.verifyOtp(dto, req.ip, req.headers['user-agent']);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { data: { accessToken: tokens.accessToken, user } };
  }

  @Public()
  @HttpCode(200)
  @Post('forgot-password')
  async forgot(@Body() dto: OtpSendDto) {
    dto.purpose = 'reset_password';
    await this.auth.captcha.assert(dto.captchaId, dto.captchaAnswer);
    return { data: await this.auth.sendOtp(dto) };
  }

  @Public()
  @HttpCode(200)
  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    return { data: await this.auth.resetPassword(dto) };
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, user: fresh } = await this.auth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return { data: { accessToken: tokens.accessToken, user: fresh } };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { tokens, user } = await this.auth.refresh(
      req.cookies?.[REFRESH_COOKIE],
      req.ip,
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return { data: { accessToken: tokens.accessToken, user } };
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearRefreshCookie(res);
    return { data: { loggedOut: true } };
  }
}

/** مدیریت ورود دومرحله‌ای کاربر جاری */
@ApiTags('me/2fa')
@Controller('me/2fa')
export class MeTwoFactorController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  async status(@CurrentUser() user: AuthUser) {
    return { data: await this.auth.twoFactorStatus(user.id) };
  }

  /** شروع راه‌اندازی: ساخت کلید + QR Code */
  @HttpCode(200)
  @Post('setup')
  async setup(@CurrentUser() user: AuthUser) {
    return { data: await this.auth.twoFactorSetup(user.id) };
  }

  @HttpCode(200)
  @Post('enable')
  async enable(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return { data: await this.auth.twoFactorEnable(user.id, dto.code) };
  }

  @HttpCode(200)
  @Post('disable')
  async disable(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return { data: await this.auth.twoFactorDisable(user.id, dto.code) };
  }
}
