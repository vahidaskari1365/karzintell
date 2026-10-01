import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

const PHONE_REGEX = /^09\d{9}$/;

export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  fullName: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  email?: string;

  @ValidateIf((o) => !o.email)
  @Matches(PHONE_REGEX, { message: 'شماره موبایل معتبر نیست (09xxxxxxxxx)' })
  phone?: string;

  @IsString() @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر' }) @MaxLength(72)
  password: string;

  // کپچای عددی (ضدبات)
  @IsOptional() @IsString() captchaId?: string;
  @IsOptional() @IsString() captchaAnswer?: string;
}

export class LoginDto {
  @IsString() @IsNotEmpty()
  identifier: string; // ایمیل یا موبایل

  @IsString() @IsNotEmpty()
  password: string;
}

export class OtpSendDto {
  @IsEnum(['phone', 'email'] as const)
  channel: 'phone' | 'email';

  @IsString() @IsNotEmpty()
  target: string;

  @IsEnum(['register', 'login', 'reset_password', 'verify_contact'] as const)
  purpose: 'register' | 'login' | 'reset_password' | 'verify_contact';

  @ValidateIf((o) => o.purpose === 'register')
  @IsString() @MaxLength(120)
  fullName?: string;

  // کپچای عددی (ضدبات — الزامی)
  @IsString() @IsNotEmpty({ message: 'کپچا الزامی است' })
  captchaId: string;

  @IsString() @IsNotEmpty({ message: 'کپچا الزامی است' })
  captchaAnswer: string;
}

export class TwoFactorVerifyDto {
  @IsString() @IsNotEmpty()
  ticket: string;

  @IsString() @Length(6, 6, { message: 'کد ۶ رقمی است' })
  code: string;
}

export class TwoFactorCodeDto {
  @IsString() @Length(6, 6, { message: 'کد ۶ رقمی است' })
  code: string;
}

export class OtpVerifyDto {
  @IsEnum(['phone', 'email'] as const)
  channel: 'phone' | 'email';

  @IsString() @IsNotEmpty()
  target: string;

  @IsString() @Length(5, 5, { message: 'کد ۵ رقمی است' })
  code: string;

  @IsEnum(['register', 'login', 'reset_password', 'verify_contact'] as const)
  purpose: 'register' | 'login' | 'reset_password' | 'verify_contact';

  @IsOptional() @IsString() @MaxLength(120)
  fullName?: string;
}

export class ResetPasswordDto {
  @IsEnum(['phone', 'email'] as const)
  channel: 'phone' | 'email';

  @IsString() @IsNotEmpty()
  target: string;

  @IsString() @Length(5, 5)
  code: string;

  @IsString() @MinLength(8) @MaxLength(72)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsString() @MinLength(8) @MaxLength(72)
  newPassword: string;
}
