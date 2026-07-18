import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
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

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
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
    const { tokens, user } = await this.auth.login(
      dto.identifier,
      dto.password,
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
